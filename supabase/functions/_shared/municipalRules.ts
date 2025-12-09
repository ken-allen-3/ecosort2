import type { SourceMetadata } from "./sourceValidator.ts";
import { extractSourceMetadata } from "./sourceValidator.ts";

// Municipal rule can be either legacy string format or new structured format
export type MunicipalRule = string | {
  text: string;
  sources?: SourceMetadata[];
};

export interface ProcessedRule {
  text: string;
  sources: SourceMetadata[];
  isLegacyFormat: boolean;
}

/**
 * Process a municipal rule, handling both legacy string and new structured formats
 * Extracts sources from legacy format on-the-fly
 */
export function processMunicipalRule(rule: MunicipalRule): ProcessedRule {
  if (typeof rule === 'string') {
    // Legacy format - extract sources inline
    const { cleanedText, sources } = extractSourceMetadata(rule);
    return {
      text: cleanedText,
      sources,
      isLegacyFormat: true
    };
  } else {
    // New structured format
    return {
      text: rule.text,
      sources: rule.sources || [],
      isLegacyFormat: false
    };
  }
}

/**
 * Get municipal rule for an item at a location
 * Returns the most specific matching rule
 */
export function getMunicipalRule(
  itemLower: string,
  locationKey: string,
  municipalRules: Record<string, Record<string, MunicipalRule>>
): ProcessedRule | null {
  const locationRules = municipalRules[locationKey] || municipalRules.default;
  
  if (!locationRules) {
    return null;
  }
  
  // Find the most specific matching rule
  let bestMatch: string | null = null;
  let bestMatchLength = 0;
  
  for (const key of Object.keys(locationRules)) {
    if (itemLower.includes(key) && key.length > bestMatchLength) {
      bestMatch = key;
      bestMatchLength = key.length;
    }
  }
  
  if (bestMatch) {
    return processMunicipalRule(locationRules[bestMatch]);
  }
  
  return null;
}
