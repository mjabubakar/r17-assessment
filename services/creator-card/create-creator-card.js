const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');
const {
  ERROR_CODE,
  SLUG_MIN_LENGTH,
  throwCardError,
  isValidSlug,
  isAlphanumeric,
  slugify,
  appendRandomSuffix,
  buildCardResponse,
} = require('./helpers');

// Field level validation. Length, enum and type checks are handled here by the
// template's VSL validator; character set rules that VSL cannot express (and the
// "no regex" requirement) are enforced manually below.
const spec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200>
  }
  service_rates? {
    currency string<isAnyOf:NGN,USD,GBP,GHS>
    rates[] {
      name string<trim|lengthBetween:3,100>
      description? string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string<isAnyOf:draft,published>
  access_type? string<isAnyOf:public,private>
  access_code? string<length:6>
}`;

const parsedSpec = validator.parse(spec);

const MAX_SLUG_ATTEMPTS = 10;

/**
 * Whether a slug is already used by an active (non deleted) card.
 * @param {String} slug
 * @returns {Promise<Boolean>}
 */
async function isSlugTaken(slug) {
  const existing = await CreatorCard.findOne({ query: { slug } });
  return !!existing;
}

/**
 * Resolve the slug to persist, honouring the assessment rules:
 *  - a client supplied slug must be valid and unique (else SL02)
 *  - otherwise auto generate from the title, appending a random suffix when the
 *    base is too short or already taken.
 * @param {Object} data - Validated service data
 * @returns {Promise<String>}
 */
async function resolveSlug(data) {
  if (data.slug) {
    if (!isValidSlug(data.slug)) {
      throwCardError(CreatorCardMessages.SLUG_INVALID, 'SL01', ERROR_CODE.VALIDATIONERR);
    }

    if (await isSlugTaken(data.slug)) {
      throwCardError(CreatorCardMessages.SLUG_TAKEN, 'SL02', ERROR_CODE.VALIDATIONERR);
    }

    return data.slug;
  }

  const base = slugify(data.title);
  let candidate = base;

  if (candidate.length < SLUG_MIN_LENGTH || (await isSlugTaken(candidate))) {
    candidate = appendRandomSuffix(base);
  }

  let attempts = 0;
  while (attempts < MAX_SLUG_ATTEMPTS) {
    // Sequential checks are required: each candidate depends on the previous
    // lookup result, so the awaits cannot be parallelised.
    // eslint-disable-next-line no-await-in-loop
    if (!(await isSlugTaken(candidate))) {
      break;
    }
    candidate = appendRandomSuffix(base);
    attempts += 1;
  }

  return candidate;
}

/**
 * Enforce the access_type / access_code business rules.
 * @param {String} accessType - Resolved access type (defaulted to 'public')
 * @param {String} [accessCode]
 */
function validateAccessRules(accessType, accessCode) {
  if (accessType === 'private' && !accessCode) {
    throwCardError(
      CreatorCardMessages.ACCESS_CODE_REQUIRED_FOR_PRIVATE,
      'AC01',
      ERROR_CODE.VALIDATIONERR
    );
  }

  if (accessType === 'public' && accessCode) {
    throwCardError(
      CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED_FOR_PUBLIC,
      'AC05',
      ERROR_CODE.VALIDATIONERR
    );
  }

  if (accessCode && !isAlphanumeric(accessCode)) {
    throwCardError(CreatorCardMessages.ACCESS_CODE_INVALID, 'AC02', ERROR_CODE.VALIDATIONERR);
  }
}

/**
 * Validate the nested links / service_rates payloads beyond what VSL covers.
 * @param {Object} data - Validated service data
 */
function validateNestedResources(data) {
  if (Array.isArray(data.links)) {
    data.links.forEach((link) => {
      const url = link.url || '';
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throwCardError(CreatorCardMessages.LINK_URL_INVALID, 'LK01', ERROR_CODE.VALIDATIONERR);
      }
    });
  }

  if (data.service_rates) {
    const rates = data.service_rates.rates || [];

    if (!rates.length) {
      throwCardError(CreatorCardMessages.SERVICE_RATES_REQUIRED, 'SR01', ERROR_CODE.VALIDATIONERR);
    }

    rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount) || rate.amount < 1) {
        throwCardError(CreatorCardMessages.RATE_AMOUNT_INVALID, 'SR02', ERROR_CODE.VALIDATIONERR);
      }
    });
  }
}

/**
 * Create a Creator Card.
 * @param {Object} serviceData - Raw request payload
 * @param {Object} [options]
 * @returns {Promise<Object>} The serialized card (includes access_code)
 */
async function createCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    const accessType = data.access_type || 'public';

    validateAccessRules(accessType, data.access_code);
    validateNestedResources(data);

    const slug = await resolveSlug(data);

    const cardToCreate = {
      title: data.title,
      slug,
      creator_reference: data.creator_reference,
      status: data.status,
      access_type: accessType,
    };

    if (data.description !== undefined) cardToCreate.description = data.description;
    if (data.links !== undefined) cardToCreate.links = data.links;
    if (data.service_rates !== undefined) cardToCreate.service_rates = data.service_rates;
    if (data.access_code !== undefined) cardToCreate.access_code = data.access_code;

    const created = await CreatorCard.create(cardToCreate);

    response = buildCardResponse(created, { includeAccessCode: true });
  } catch (error) {
    appLogger.error({ error }, 'create-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = createCreatorCard;
