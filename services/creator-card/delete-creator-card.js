const validator = require('@app-core/validator');
const { appLogger } = require('@app-core/logger');
const CreatorCard = require('@app/repository/creator-card');
const { CreatorCardMessages } = require('@app/messages');
const { ERROR_CODE, throwCardError, buildCardResponse } = require('./helpers');

const spec = `root {
  slug string<trim>
  creator_reference string<length:20>
}`;

const parsedSpec = validator.parse(spec);

/**
 * Soft delete a Creator Card by slug.
 *
 * The owning `creator_reference` must be supplied; a non existent card (or one
 * that belongs to a different creator) returns 404 NF01 so existence is not
 * leaked. On success the soft deleted card is returned in the creation shape
 * (access_code included, `deleted` timestamp set).
 *
 * @param {Object} serviceData - { slug, creator_reference }
 * @param {Object} [options]
 * @returns {Promise<Object>} The serialized deleted card
 */
async function deleteCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedSpec);
  let response;

  try {
    const card = await CreatorCard.findOne({ query: { slug: data.slug } });

    if (!card || card.creator_reference !== data.creator_reference) {
      throwCardError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01', ERROR_CODE.NOTFOUND);
    }

    // Soft delete: the repository sets `deleted` to the current timestamp and
    // releases the unique slug so it can be reused.
    await CreatorCard.deleteOne({ query: { _id: card._id } });

    response = buildCardResponse({ ...card, deleted: Date.now() }, { includeAccessCode: true });
  } catch (error) {
    appLogger.error({ error }, 'delete-creator-card-error');
    throw error;
  }

  return response;
}

module.exports = deleteCreatorCard;
