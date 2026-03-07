export const CN_REGULATORY_DOMAINS = [
  'sppt.cfsa.net.cn',
  'samr.gov.cn',
  'openstd.samr.gov.cn',
  'std.samr.gov.cn',
  'nmpa.gov.cn',
  'english.nmpa.gov.cn',
  'nhc.gov.cn',
  'english.customs.gov.cn',
  'customs.gov.cn',
  'flk.npc.gov.cn',
];

export const DISCOVERY_QUERIES = [
  // CFSA / NHC — Food Safety Standards (GB standards)
  'China GB 2760 food additives standards CFSA',
  'China GB 7718 prepackaged food labelling standard',
  'China GB 28050 nutrition labelling standard',
  'China GB 2761 mycotoxin limits food safety',
  'China GB 2762 contaminant limits food safety',
  'China GB 2763 pesticide residue limits food',
  'China GB 14880 nutritional fortification food',
  'China CFSA food safety standards database',
  'China new food raw material novel food NHC approval',
  'China food-drug homology medicinal food dual-use list',
  // SAMR — Health Food (Supplements)
  'China health food registration SAMR Blue Hat',
  'China 24 permitted health function claims health food',
  'China health food raw material catalog SAMR',
  'China health food filing notification system',
  'China health food labelling requirements',
  'China health food advertising regulation SAMR',
  'China functional food ingredient inventory SAMR',
  // NMPA — Cosmetics (CSAR)
  'China CSAR Cosmetics Supervision Administration Regulation 2021',
  'China IECIC cosmetic ingredients inventory NMPA',
  'China cosmetics banned restricted ingredients NMPA',
  'China cosmetics safety technical specification 2015',
  'China cosmetics labelling requirements NMPA',
  'China cosmetics registration filing new ingredients NMPA',
  'China cosmetics preservatives UV filters colorants permitted list',
  'China special cosmetics registration sunscreen hair dye',
  // GACC — Import/Export
  'China GACC food import registration Decree 248 249',
  'China imported food safety inspection requirements GACC',
  'China cross-border e-commerce CBEC positive list',
  'China GACC non-compliant imported food reports',
  'China CIQ inspection quarantine imported food',
  'China imported cosmetics NMPA registration requirements',
  // SAC / GB Standards
  'China national standards GB food safety openstd',
  'China mandatory national standards food beverages',
  'China GB standards food additives preservatives',
  // NPC — Legislation
  'China Food Safety Law 2015 amended 2021',
  'China Cosmetics Supervision Administration Regulation',
  'China advertising law health food cosmetics claims',
  // English sources
  'China food safety regulation English NMPA',
  'China cosmetics regulation English guide',
  'GACC English imported food requirements China',
];

export const ROOT_URLS = [
  'https://sppt.cfsa.net.cn:8086/',
  'https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/spcjs/',
  'https://english.nmpa.gov.cn/',
  'https://english.customs.gov.cn/',
  'https://www.nhc.gov.cn/sps/spjk/',
];

// Domains that require Browser Use (JS-rendered or interactive portals)
export const BROWSER_USE_DOMAINS = [
  'sppt.cfsa.net.cn',
  'openstd.samr.gov.cn',
  'nmpa.gov.cn',
  'flk.npc.gov.cn',
];

import type { RegulatoryBody } from '@sieve/shared';

export function classifyRegulatoryBody(
  url: string
): RegulatoryBody {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('cfsa.net.cn')) return 'CFSA';
  if (hostname.includes('nmpa.gov.cn')) return 'NMPA';
  if (hostname.includes('nhc.gov.cn')) return 'NHC';
  if (hostname.includes('customs.gov.cn')) return 'GACC';
  if (hostname.includes('openstd.samr.gov.cn') || hostname.includes('std.samr.gov.cn')) return 'SAC';
  if (hostname.includes('samr.gov.cn')) return 'SAMR';
  if (hostname.includes('flk.npc.gov.cn')) return 'OTHER';
  return 'OTHER';
}
