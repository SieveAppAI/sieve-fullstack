export const JURISDICTIONS = {
  SG: {
    code: 'SG',
    name: 'Singapore',
    regulatory_bodies: ['SFA', 'HSA', 'NEA', 'SSO'],
  },
} as const;

export type JurisdictionCode = keyof typeof JURISDICTIONS;
