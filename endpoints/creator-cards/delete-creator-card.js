const { createHandler } = require('@app-core/server');
const deleteCreatorCard = require('@app/services/creator-card/delete-creator-card');
const { CreatorCardMessages } = require('@app/messages');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    // creator_reference is expected in the request body; also accept it from the
    // query string as a fallback since some clients/proxies drop DELETE bodies.
    const payload = {
      slug: rc.params.slug,
      creator_reference: (rc.body && rc.body.creator_reference) || rc.query.creator_reference,
    };

    const response = await deleteCreatorCard(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: CreatorCardMessages.CARD_DELETED,
      data: response,
    };
  },
});
