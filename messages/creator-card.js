module.exports = {
  // Success messages
  CARD_CREATED: 'Creator Card Created Successfully.',
  CARD_RETRIEVED: 'Creator Card Retrieved Successfully.',
  CARD_DELETED: 'Creator Card Deleted Successfully.',

  // Slug related
  SLUG_TAKEN: 'Slug is already taken',
  SLUG_INVALID: 'Slug may only contain letters, numbers, hyphens and underscores',

  // Access control / access_code related
  ACCESS_CODE_REQUIRED_FOR_PRIVATE: 'access_code is required when access_type is private',
  ACCESS_CODE_NOT_ALLOWED_FOR_PUBLIC: 'access_code can only be set on private cards',
  ACCESS_CODE_INVALID: 'access_code must be exactly 6 alphanumeric characters',
  PRIVATE_ACCESS_CODE_REQUIRED: 'This card is private. An access code is required',
  INVALID_ACCESS_CODE: 'Invalid access code',

  // Retrieval / deletion
  CARD_NOT_FOUND: 'Creator card not found',

  // Nested resources
  LINK_URL_INVALID: 'Each link url must start with http:// or https://',
  SERVICE_RATES_REQUIRED: 'service_rates must include at least one rate',
  RATE_AMOUNT_INVALID: 'Rate amount must be a positive integer (minor units, no decimals)',
};
