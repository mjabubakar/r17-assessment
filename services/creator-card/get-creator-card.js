const validator = require('@app-core/validator');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');
const { ERROR_CODE, throwCardError, buildCardResponse } = require('./helpers');

const spec = `root {
  slug string<trim>
  access_code? any
}`;

const parsedSpec = validator.parse(spec);

/**
 * Retrieve a Creator Card by slug.
 *
 * Access control is evaluated strictly in this order:
 *   1. card does not exist (or is soft deleted)  -> 404 NF01
 *   2. card is a draft                           -> 404 NF02
 *   3. card is private and no access_code given  -> 403 AC03
 *   4. card is private and access_code mismatch  -> 403 AC04
 *   5. otherwise                                 -> 200
 *
 * The `access_code` is never returned by this endpoint.
 *
 * @param {Object} serviceData - { slug, access_code? }
 * @param {Object} [options]
 * @returns {Promise<Object>} The serialized card (without access_code)
 */
async function getCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);

  // 1. Existence (the repository automatically excludes soft deleted records)
  const card = await CreatorCard.findOne({ query: { slug: data.slug } });

  if (!card) {
    throwCardError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01', ERROR_CODE.NOTFOUND);
  }

  // 2. Drafts are never publicly retrievable
  if (card.status === 'draft') {
    throwCardError(CreatorCardMessages.CARD_NOT_FOUND, 'NF02', ERROR_CODE.NOTFOUND);
  }

  // 3 & 4. Private cards require a matching access_code
  if (card.access_type === 'private') {
    if (!data.access_code) {
      throwCardError(CreatorCardMessages.PRIVATE_ACCESS_CODE_REQUIRED, 'AC03', ERROR_CODE.INVLDREQ);
    }

    if (data.access_code !== card.access_code) {
      throwCardError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04', ERROR_CODE.INVLDREQ);
    }
  }

  // 5. Success
  const response = buildCardResponse(card, { includeAccessCode: false });

  return response;
}

module.exports = getCreatorCard;
