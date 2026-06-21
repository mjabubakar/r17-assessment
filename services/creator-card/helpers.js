const { randomNumbers } = require('@app-core/randomness');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');

// Characters allowed in a slug: lowercase letters, digits, hyphen, underscore.
const SLUG_ALLOWED_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
// Characters used when generating a random suffix / for alphanumeric checks.
const ALPHANUMERIC_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const WHITESPACE_CHARS = [' ', '\t', '\n', '\r', '\f', '\v'];

const SLUG_MAX_LENGTH = 50;
const SLUG_MIN_LENGTH = 5;
const RANDOM_SUFFIX_LENGTH = 6;

/**
 * Map the assessment's custom business code onto the template's error system.
 * The human readable message and the short code are both surfaced to the client
 * (message + data.code) while the HTTP status is derived from `errorCode`.
 *
 * @param {String} message - Human readable message (from messages/creator-card)
 * @param {String} code - Assessment business code e.g. 'SL02', 'NF01'
 * @param {String} errorCode - One of ERROR_CODE.* used for HTTP status mapping
 */
function throwCardError(message, code, errorCode) {
  throwAppError(message, errorCode, { context: { code } });
}

/**
 * Returns true when every character in the value belongs to a charset.
 * Implemented with basic string operations only (no regular expressions).
 * @param {String} value
 * @param {String} charset
 */
function isMadeOf(value, charset) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }

  for (let i = 0; i < value.length; i += 1) {
    if (charset.indexOf(value[i]) === -1) {
      return false;
    }
  }

  return true;
}

/**
 * Whether a slug only contains the allowed characters.
 * @param {String} value
 */
function isValidSlug(value) {
  return isMadeOf(value, SLUG_ALLOWED_CHARS);
}

/**
 * Whether a value is a non empty alphanumeric string (case insensitive).
 * @param {String} value
 */
function isAlphanumeric(value) {
  return isMadeOf(String(value).toLowerCase(), ALPHANUMERIC_CHARS);
}

/**
 * Generate a slug from a title:
 *  1. lowercase the title
 *  2. replace whitespace with hyphens
 *  3. drop any character that is not a letter, number, hyphen or underscore
 * No regular expressions are used.
 * @param {String} title
 * @returns {String}
 */
function slugify(title) {
  const lowercased = String(title).toLowerCase();
  let slug = '';

  for (let i = 0; i < lowercased.length; i += 1) {
    const char = lowercased[i];

    if (WHITESPACE_CHARS.indexOf(char) !== -1) {
      slug += '-';
    } else if (SLUG_ALLOWED_CHARS.indexOf(char) !== -1) {
      slug += char;
    }
    // anything else is removed
  }

  return slug;
}

/**
 * Generate a random alphanumeric string of the requested length.
 * @param {Number} length
 * @returns {String}
 */
function randomAlphanumeric(length = RANDOM_SUFFIX_LENGTH) {
  let result = '';

  for (let i = 0; i < length; i += 1) {
    const index = randomNumbers(0, ALPHANUMERIC_CHARS.length);
    result += ALPHANUMERIC_CHARS[index];
  }

  return result;
}

/**
 * Append a random suffix to a base slug while respecting the maximum length.
 * @param {String} base
 * @returns {String}
 */
function appendRandomSuffix(base) {
  const suffix = `-${randomAlphanumeric(RANDOM_SUFFIX_LENGTH)}`;
  const maxBaseLength = SLUG_MAX_LENGTH - suffix.length;
  const trimmedBase = base.length > maxBaseLength ? base.substring(0, maxBaseLength) : base;

  return `${trimmedBase}${suffix}`;
}

/**
 * Serialize a stored card document into the public API shape:
 *  - exposes `_id` as `id`
 *  - omits `access_code` unless explicitly requested (never on GET)
 *  - normalises the soft delete marker (`0` becomes `null`)
 * @param {Object} card - Raw record from the repository
 * @param {{ includeAccessCode?: Boolean }} [options]
 * @returns {Object}
 */
function buildCardResponse(card, options = {}) {
  const { includeAccessCode = false } = options;

  const response = {
    id: card._id,
    title: card.title,
    description: card.description ?? null,
    slug: card.slug,
    creator_reference: card.creator_reference,
    links: card.links ?? [],
    service_rates: card.service_rates ?? null,
    status: card.status,
    access_type: card.access_type,
    created: card.created,
    updated: card.updated,
    deleted: card.deleted ? card.deleted : null,
  };

  if (includeAccessCode && card.access_code) {
    response.access_code = card.access_code;
  }

  return response;
}

module.exports = {
  ERROR_CODE,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
  RANDOM_SUFFIX_LENGTH,
  throwCardError,
  isValidSlug,
  isAlphanumeric,
  slugify,
  randomAlphanumeric,
  appendRandomSuffix,
  buildCardResponse,
};
