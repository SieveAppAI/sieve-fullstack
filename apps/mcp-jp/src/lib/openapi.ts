export function buildOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Taama JP — Japan Regulatory Compliance API',
      version: '1.0.0',
      description:
        'REST API for querying Japan regulatory compliance data (MHLW, CAA, FFCR) — ingredients, claims, labelling, import requirements, and regulatory changes.',
    },
    servers: [{ url: 'https://sieve-jp.vercel.app' }],
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
            'Check if an ingredient is permitted, restricted, or banned in Japan for a given product category.',
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
                      description: 'Product category (e.g. food, cosmetics, health_supplements, beverages)',
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
                    jurisdiction: 'JP',
                    status: 'permitted_with_limits',
                    max_concentration_pct: 1.0,
                    max_daily_dose_mg: null,
                    conditions: [],
                    required_warnings: [],
                    regulation_reference: 'ASEAN Cosmetic Directive Annex III',
                    annex_reference: 'III/45',
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
          description: 'Validate product claims against Japan regulations.',
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
                  claims: ['low fat', 'sugar free'],
                  product_category: 'food',
                  nutrition_info: { fat_g: 2.5, sugar_g: 0.3 },
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
                    jurisdiction: 'JP',
                    product_category: 'food',
                    results: [
                      {
                        claim: 'low fat',
                        status: 'permitted',
                        conditions: { nutrient: 'fat', operator: '<=', value: 3 },
                        regulation_reference: 'Japan Food Regulations',
                        reason: 'Meets threshold: fat 2.5 <= 3',
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
          description: 'Get mandatory and optional labelling requirements for products in Japan.',
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
            '200': {
              description: 'Labelling requirements',
              content: {
                'application/json': {
                  example: {
                    jurisdiction: 'JP',
                    product_category: 'food',
                    elements: [
                      {
                        element: 'Product Name',
                        mandatory: true,
                        description: 'Common name of the food',
                        format_rules: 'Must be prominent and legible',
                        language_requirements: 'English',
                        exemptions: null,
                        regulation_reference: 'Food Regulations',
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
      '/api/v1/import-requirements': {
        get: {
          operationId: 'getImportRequirements',
          summary: 'Get import requirements',
          description: 'Get import requirements for products entering Japan.',
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
            '200': {
              description: 'Import requirements',
              content: {
                'application/json': {
                  example: {
                    jurisdiction: 'JP',
                    product_category: 'food',
                    requirements: [
                      {
                        requirement: 'SFA Import Licence',
                        requirement_type: 'licence',
                        regulatory_body: 'SFA',
                        documents_required: ['Trader licence application'],
                        special_conditions: null,
                        regulation_reference: 'Sale of Food Act',
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
      '/api/v1/regulation-update': {
        get: {
          operationId: 'getRegulationUpdate',
          summary: 'Get regulatory changes',
          description: 'Get recent regulatory changes detected in Japan.',
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
            '200': {
              description: 'Regulatory changes',
              content: {
                'application/json': {
                  example: {
                    jurisdiction: 'JP',
                    since: '2026-01-01',
                    changes: [
                      {
                        source_url: 'https://www.sfa.gov.sg/food-information/legislation',
                        change_summary: 'Updated food additive limits',
                        detected_at: '2026-02-15T18:00:00Z',
                        affected_categories: [],
                      },
                    ],
                  },
                },
              },
            },
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
            'Semantic search over Japan regulatory content using vector similarity, with full-text search fallback.',
          parameters: [
            {
              name: 'query',
              in: 'query' as const,
              required: true,
              schema: { type: 'string' as const },
              description: 'Search query',
              example: 'food additives permitted list',
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
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  example: {
                    jurisdiction: 'JP',
                    query: 'food additives',
                    results: [
                      {
                        chunk_text: 'The following food additives are permitted...',
                        source_url: 'https://www.sfa.gov.sg/food-information/food-additives',
                        regulatory_body: 'SFA',
                        similarity: 0.87,
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
      '/api/v1/trigger-scrape': {
        post: {
          operationId: 'triggerScrape',
          summary: 'Trigger data ingestion',
          description:
            'Trigger a scrape of Japan regulatory sources. Admin-only — runs full ingestion, change detection, or specific URL scraping.',
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
                      description: 'Scrape mode',
                    },
                    urls: {
                      type: 'array' as const,
                      items: { type: 'string' as const },
                      description: 'Specific URLs to scrape (required for specific_urls mode)',
                    },
                  },
                },
                example: { mode: 'change_detection' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ingestion result',
              content: {
                'application/json': {
                  example: {
                    urls_discovered: 15,
                    urls_processed: 12,
                    pages_structured: 10,
                    changes_detected: 2,
                    errors: [],
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
      '/api/v1/ingestion-status': {
        get: {
          operationId: 'getIngestionStatus',
          summary: 'Get ingestion pipeline status',
          description: 'Get the status of the Japan regulatory data ingestion pipeline.',
          parameters: [],
          responses: {
            '200': {
              description: 'Pipeline status',
              content: {
                'application/json': {
                  example: {
                    jurisdiction: 'JP',
                    total_sources: 45,
                    last_full_scrape: '2026-02-28T19:00:00Z',
                    last_change_check: null,
                    sources_by_status: { structured: 40, scraped: 3, error: 2 },
                    recent_errors: [],
                  },
                },
              },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  };
}
