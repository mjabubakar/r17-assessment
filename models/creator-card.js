const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');

const modelName = 'creator_cards';

/**
 * @typedef {Object} CreatorCardSchema
 * @property {String} _id - ULID, exposed as `id` in responses
 * @property {String} title
 * @property {String} description
 * @property {String} slug - Unique, URL friendly identifier
 * @property {String} creator_reference - Opaque 20 char reference to the owning creator
 * @property {Array} links - Array of { title, url }
 * @property {Object} service_rates - { currency, rates: [{ name, description, amount }] }
 * @property {String} status - draft | published
 * @property {String} access_type - public | private
 * @property {String} access_code - 6 char alphanumeric (only for private cards)
 * @property {Number} created - Unix epoch millis
 * @property {Number} updated - Unix epoch millis
 * @property {Number} deleted - 0 when active, deletion timestamp when soft deleted
 */

// Note: business validation (length, enums, required-ness) lives in the services
// via the VSL validator. Only database-level concerns (ULID id, uniqueness,
// indexes) are declared here, per the template's model conventions.
const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: { type: SchemaTypes.String, required: true },
  description: { type: SchemaTypes.String },
  slug: { type: SchemaTypes.String, required: true, unique: true, index: true },
  creator_reference: { type: SchemaTypes.String, required: true, index: true },
  links: { type: SchemaTypes.Array },
  service_rates: { type: SchemaTypes.Mixed },
  status: { type: SchemaTypes.String, required: true, index: true },
  access_type: { type: SchemaTypes.String, required: true, index: true },
  access_code: { type: SchemaTypes.String },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
};

const modelSchema = new ModelSchema(schemaConfig, { collection: modelName });

/** @type {CreatorCardSchema} */
module.exports = DatabaseModel.model(modelName, modelSchema, { paranoid: true });
