export function buildOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Taama CN — China Regulatory Compliance API',
      version: '1.0.0',
      description:
        'REST API for querying China regulatory compliance data (SAMR, NHC, CFSA, NMPA, GACC) — ingredients, claims, labelling, import requirements, and regulatory changes for food, health food (supplements), and cosmetics.',
    },
    servers: [{ url: 'https://sieve-cn.vercel.app' }],
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
            'Check if an ingredient is permitted, restricted, or banned in China for a given product category (food, health food, cosmetics).',
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
                      description: 'Ingredient name (Chinese or English), INCI name, or CAS number',
                    },
                    cas_number: {
                      type: 'string' as const,
                      description: 'CAS registry number',
                    },
                    product_category: {
                      type: 'string' as const,
                      description: 'Product category (e.g. food, health_food, cosmetics, beverages)',
                    },
                    concentration_pct: {
                      type: 'number' as const,
                      description: 'Concentration percentage in formulation',
                    },
                  },
                },
                example: {
                  ingredient: 'Sodium Benzoate',
                  product_category: 'food',
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
                    ingredient: 'Sodium Benzoate',
                    jurisdiction: 'CN',
                    status: 'permitted_with_limits',
                    max_concentration_pct: 0.1,
                    conditions: ['GB 2760 permitted preservative for specific food categories'],
                    regulation_reference: 'GB 2760',
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
          description: 'Validate product claims against China regulations (SAMR 24 permitted health claims, NMPA cosmetics claims).',
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
                      description: 'Product category (e.g. food, health_food, cosmetics)',
                    },
                  },
                },
                example: {
                  claims: ['Enhances immunity', 'Aids sleep'],
                  product_category: 'health_food',
                },
              },
            },
          },
          responses: {
            '200': { description: 'Claims validation results' },
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
          description: 'Get mandatory labelling requirements for products in China (GB 7718 food, GB 28050 nutrition, NMPA cosmetics).',
          parameters: [
            {
              name: 'product_category',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Product category (e.g. food, health_food, cosmetics)',
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
          description: 'Get GACC import requirements for products entering China (registration, CIQ inspection, CBEC cross-border).',
          parameters: [
            {
              name: 'product_category',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Product category (e.g. food, health_food, cosmetics)',
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
          description: 'Get recent regulatory changes detected in China regulations (SAMR, NHC, NMPA, GACC).',
          parameters: [
            {
              name: 'since',
              in: 'query' as const,
              required: false,
              schema: { type: 'string' as const },
              description: 'ISO date to get changes since',
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
          description: 'Semantic search over China regulatory content using vector similarity.',
          parameters: [
            {
              name: 'query',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Search query (Chinese or English)',
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
          description: 'Trigger a scrape of China regulatory sources. Admin-only.',
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
                      enum: ['full', 'change_detection', 'specific_urls'],
                    },
                    urls: {
                      type: 'array' as const,
                      items: { type: 'string' as const },
                    },
                  },
                },
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
          description: 'Get the status of the China regulatory data ingestion pipeline.',
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
