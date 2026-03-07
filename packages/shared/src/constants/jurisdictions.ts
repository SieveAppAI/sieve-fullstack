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
  JP: {
    code: 'JP',
    name: 'Japan',
    regulatory_bodies: ['MHLW', 'CAA', 'FFCR', 'JCIA', 'NITE', 'FSCJ'],
  },
  EU: {
    code: 'EU',
    name: 'European Union',
    regulatory_bodies: ['EC', 'EFSA', 'ECHA'],
  },
  AU_NZ: {
    code: 'AU_NZ',
    name: 'Australia & New Zealand',
    regulatory_bodies: ['FSANZ', 'TGA', 'AICIS', 'MEDSAFE', 'NZ_EPA'],
  },
  CN: {
    code: 'CN',
    name: 'China',
    regulatory_bodies: ['SAMR', 'NHC', 'CFSA', 'NMPA', 'GACC', 'SAC'],
  },
  GCC: {
    code: 'GCC',
    name: 'Gulf Cooperation Council',
    regulatory_bodies: ['GSO', 'SFDA', 'MOIAT', 'DM', 'ADAFSA', 'NHRA', 'PAFN', 'MOPH', 'FSQC'],
  },
  IN: {
    code: 'IN',
    name: 'India',
    regulatory_bodies: ['FSSAI', 'CDSCO', 'BIS', 'AYUSH'],
  },
} as const;

export type JurisdictionCode = keyof typeof JURISDICTIONS;
