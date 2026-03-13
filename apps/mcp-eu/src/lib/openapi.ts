export function buildOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Taama EU — European Union Regulatory Compliance API',
      version: '1.0.0',
      description:
        'REST API for querying EU regulatory compliance data — ingredients (CosIng, Cosmetics Regulation), claims (Health Claims Register, Reg 1924/2006), labelling (FIC 1169/2011), import requirements, and regulatory changes.',
    },
    servers: [{ url: 'https://sieve-mcp-eu.vercel.app' }],
    security: [{ apiKey: [] }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey' as const,
          in: 'header' as const,
          name: 'x-api-key',
          description: 'API key for authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object' as const,
          properties: {
            error: { type: 'string' as const },
          },
          required: ['error'],
        },
      },
    },
    paths: {
      '/api/v1/check-ingredient': {
        post: {
          operationId: 'checkIngredient',
          summary: 'Check ingredient compliance',
          description:
            'Check if an ingredient is permitted, restricted, or banned in the EU for a given product category.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  required: ['ingredient'],
                  properties: {
                    ingredient: {
                      type: 'string' as const,
                      description: 'Ingredient name, INCI name, or CAS number',
                    },
                    cas_number: {
                      type: 'string' as const,
                      description: 'CAS registry number',
                    },
                    product_category: {
                      type: 'string' as const,
                      description: 'Product category (e.g. food, cosmetics, supplement, beverages)',
                    },
                    concentration_pct: {
                      type: 'number' as const,
                      description: 'Concentration percentage in formulation',
                    },
                  },
                },
                example: {
                  ingredient: 'retinol',
                  product_category: 'cosmetics',
                  concentration_pct: 0.5,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ingredient compliance result',
              content: {
                'application/json': {
                  example: {
                    ingredient: 'retinol',
                    jurisdiction: 'EU',
                    status: 'permitted_with_limits',
                    max_concentration_pct: 0.3,
                    max_daily_dose_mg: null,
                    conditions: [],
                    required_warnings: [],
                    regulation_reference: 'Regulation (EC) No 1223/2009',
                    annex_reference: 'Annex III',
                    product_categories: ['cosmetics'],
                  },
                },
              },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/validate-claims': {
        post: {
          operationId: 'validateClaims',
          summary: 'Validate product claims',
          description: 'Validate product claims against EU Health Claims Register and Regulation (EC) 1924/2006.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  required: ['claims', 'product_category'],
                  properties: {
                    claims: {
                      type: 'array' as const,
                      items: { type: 'string' as const },
                      description: 'Array of claims to validate',
                    },
                    product_category: {
                      type: 'string' as const,
                      description: 'Product category (e.g. food, cosmetic, supplement, beverages)',
                    },
                    nutrition_info: {
                      type: 'object' as const,
                      additionalProperties: { type: 'number' as const },
                      description: 'Nutrition info (e.g., fat_g, sugar_g, sodium_mg)',
                    },
                  },
                },
                example: {
                  claims: ['source of fibre', 'low fat'],
                  product_category: 'food',
                  nutrition_info: { fat_g: 2.5, dietary_fibre_g: 4 },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Claims validation results',
              content: {
                'application/json': {
                  example: {
                    jurisdiction: 'EU',
                    product_category: 'food',
                    results: [
                      {
                        claim: 'source of fibre',
                        status: 'permitted',
                        conditions: { nutrient: 'dietary_fibre', operator: '>=', value: 3 },
                        regulation_reference: 'Regulation (EC) No 1924/2006 Annex',
                        reason: 'Meets threshold: dietary_fibre 4 >= 3',
                      },
                    ],
                  },
                },
              },
            },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/labelling-requirements': {
        get: {
          operationId: 'getLabellingRequirements',
          summary: 'Get labelling requirements',
          description: 'Get mandatory and optional labelling requirements for products in the EU (FIC Regulation 1169/2011).',
          parameters: [
            {
              name: 'product_category',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Product category (e.g. food, cosmetic, supplement, beverages)',
              example: 'food',
            },
          ],
          responses: {
            '200': { description: 'Labelling requirements' },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/import-requirements': {
        get: {
          operationId: 'getImportRequirements',
          summary: 'Get import requirements',
          description: 'Get import requirements for products entering the European Union.',
          parameters: [
            {
              name: 'product_category',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Product category (e.g. food, cosmetic, supplement, beverages)',
              example: 'food',
            },
          ],
          responses: {
            '200': { description: 'Import requirements' },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/regulation-update': {
        get: {
          operationId: 'getRegulationUpdate',
          summary: 'Get regulatory changes',
          description: 'Get recent regulatory changes detected in EU regulations.',
          parameters: [
            {
              name: 'since',
              in: 'query' as const,
              required: false,
              schema: { type: 'string' as const },
              description: 'ISO date to get changes since (e.g. 2026-01-01)',
              example: '2026-01-01',
            },
          ],
          responses: {
            '200': { description: 'Regulatory changes' },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/search-regulations': {
        get: {
          operationId: 'searchRegulations',
          summary: 'Search regulations',
          description:
            'Semantic search over EU regulatory content (EUR-Lex, EC, EFSA, ECHA) using vector similarity, with full-text search fallback.',
          parameters: [
            {
              name: 'query',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Search query',
              example: 'cosmetics banned ingredients annex II',
            },
            {
              name: 'limit',
              in: 'query' as const,
              required: false,
              schema: { type: 'integer' as const, default: 10 },
              description: 'Max results to return',
            },
          ],
          responses: {
            '200': { description: 'Search results' },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/trigger-scrape': {
        post: {
          operationId: 'triggerScrape',
          summary: 'Trigger data ingestion',
          description:
            'Trigger a scrape of EU regulatory sources. Supports modes: full, change_detection, specific_urls, bulk_download (CosIng/Claims/OpenFoodTox), eurlex (EUR-Lex consolidated legislation).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object' as const,
                  required: ['mode'],
                  properties: {
                    mode: {
                      type: 'string' as const,
                      enum: ['full', 'change_detection', 'specific_urls', 'bulk_download', 'eurlex'],
                      description: 'Scrape mode',
                    },
                    urls: {
                      type: 'array' as const,
                      items: { type: 'string' as const },
                      description: 'Specific URLs to scrape (required for specific_urls mode)',
                    },
                  },
                },
                example: { mode: 'bulk_download' },
              },
            },
          },
          responses: {
            '200': { description: 'Ingestion result' },
            '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/v1/ingestion-status': {
        get: {
          operationId: 'getIngestionStatus',
          summary: 'Get ingestion pipeline status',
          description: 'Get the status of the EU regulatory data ingestion pipeline.',
          parameters: [],
          responses: {
            '200': { description: 'Pipeline status' },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  };
}
