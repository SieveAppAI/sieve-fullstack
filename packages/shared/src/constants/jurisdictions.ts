export const JURISDICTIONS = {
  SG: {
    code: 'SG',
    name: 'Singapore',
    regulatory_bodies: ['SFA', 'HSA', 'NEA', 'SSO'],
  },
  US: {
    code: 'US',
    name: 'United States',
    regulatory_bodies: ['FDA', 'FTC', 'USDA', 'CIR'],
  },
} as const;

export type JurisdictionCode = keyof typeof JURISDICTIONS;
