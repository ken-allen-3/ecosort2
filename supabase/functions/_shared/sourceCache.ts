import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import type { SourceMetadata, SourceValidationResult } from "./sourceValidator.ts";
import { validateUrl, calculateNextCheckDate, getDomainStability } from "./sourceValidator.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface CachedSource {
  id: string;
  location: string;
  itemPattern: string;
  guidanceText: string;
  sources: SourceMetadata[];
  lastVerifiedAt?: Date;
  needsValidation: boolean;
}

/**
 * Check if we're in a legislative volatility window (60 days around deadline)
 */
async function isInVolatilityWindow(region: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const now = new Date();
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAhead = new Date(now);
  sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);
  
  const { data, error } = await supabase
    .from('legislative_events')
    .select('id')
    .eq('region', region)
    .gte('deadline_date', sixtyDaysAgo.toISOString().split('T')[0])
    .lte('deadline_date', sixtyDaysAhead.toISOString().split('T')[0])
    .limit(1);
  
  if (error) {
    console.error('Error checking legislative events:', error);
    return false;
  }
  
  return (data?.length ?? 0) > 0;
}

/**
 * Query cached sources for a location and item
 */
export async function getCachedSources(
  location: string,
  itemPattern: string
): Promise<CachedSource | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('municipal_sources')
    .select('*')
    .eq('location', location.toLowerCase())
    .eq('item_pattern', itemPattern.toLowerCase())
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Reconstruct sources array from database fields
  const sources: SourceMetadata[] = [];
  
  if (data.source_url) {
    sources.push({
      type: 'url',
      value: data.source_url,
      verified: !data.soft_404_detected && !data.parked_domain_detected && data.http_status === 200,
      verifiedAt: data.last_verified_at ? new Date(data.last_verified_at) : undefined,
      stability: getDomainStability(data.source_url)
    });
  }
  
  if (data.source_phone) {
    sources.push({
      type: 'phone',
      value: data.source_phone,
      verified: true,
      verifiedAt: data.last_verified_at ? new Date(data.last_verified_at) : undefined,
      stability: 'high'
    });
  }
  
  if (data.source_facility_name) {
    sources.push({
      type: 'facility',
      value: data.source_facility_name,
      verified: true,
      verifiedAt: data.last_verified_at ? new Date(data.last_verified_at) : undefined,
      stability: 'medium'
    });
  }
  
  // Determine if validation is needed
  const now = new Date();
  const needsValidation = !data.next_check_date || new Date(data.next_check_date) <= now;
  
  return {
    id: data.id,
    location: data.location,
    itemPattern: data.item_pattern,
    guidanceText: data.guidance_text,
    sources,
    lastVerifiedAt: data.last_verified_at ? new Date(data.last_verified_at) : undefined,
    needsValidation
  };
}

/**
 * Save or update source validation results
 */
export async function saveSources(
  location: string,
  itemPattern: string,
  guidanceText: string,
  sources: SourceMetadata[],
  validationResults?: Map<string, SourceValidationResult>
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Extract primary source data (use first URL if multiple)
  const urlSource = sources.find(s => s.type === 'url');
  const phoneSource = sources.find(s => s.type === 'phone');
  const facilitySource = sources.find(s => s.type === 'facility');
  
  const urlValidation = urlSource && validationResults?.get(urlSource.value);
  
  // Determine source type priority: microsite < hauler < gov < jpa
  let sourceType = 'gov';
  if (urlSource) {
    const hostname = new URL(urlSource.value).hostname;
    if (hostname.includes('recyclesmart.org') || hostname.includes('stopwaste.org')) {
      sourceType = 'jpa';
    } else if (hostname.endsWith('.gov')) {
      sourceType = 'gov';
    } else if (hostname.includes('wm.com') || hostname.includes('republic') || hostname.includes('waste')) {
      sourceType = 'hauler';
    } else {
      sourceType = 'microsite';
    }
  }
  
  const stability = urlSource?.stability || 'medium';
  const nextCheckDate = calculateNextCheckDate(stability, 0);
  
  const sourceData = {
    location: location.toLowerCase(),
    item_pattern: itemPattern.toLowerCase(),
    guidance_text: guidanceText,
    source_type: sourceType,
    source_url: urlSource?.value || null,
    source_phone: phoneSource?.value || null,
    source_facility_name: facilitySource?.value || null,
    content_hash: urlValidation?.contentHash || null,
    http_status: urlValidation?.httpStatus || null,
    soft_404_detected: urlValidation?.isSoft404 || false,
    parked_domain_detected: urlValidation?.isParkedDomain || false,
    last_verified_at: new Date().toISOString(),
    next_check_date: nextCheckDate.toISOString(),
    verification_error: urlValidation?.errorMessage || null,
    updated_at: new Date().toISOString()
  };
  
  // Upsert the source record
  const { data: existingData, error: selectError } = await supabase
    .from('municipal_sources')
    .select('id')
    .eq('location', location.toLowerCase())
    .eq('item_pattern', itemPattern.toLowerCase())
    .single();
  
  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error checking existing source:', selectError);
    return;
  }
  
  let sourceId: string;
  
  if (existingData) {
    // Update existing record
    const { data, error } = await supabase
      .from('municipal_sources')
      .update(sourceData)
      .eq('id', existingData.id)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error updating source:', error);
      return;
    }
    sourceId = data.id;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('municipal_sources')
      .insert(sourceData)
      .select('id')
      .single();
    
    if (error) {
      console.error('Error inserting source:', error);
      return;
    }
    sourceId = data.id;
  }
  
  // Log validation to stability log if we have results
  if (urlValidation && urlSource) {
    await supabase.from('source_stability_log').insert({
      source_id: sourceId,
      checked_at: urlValidation.checkedAt.toISOString(),
      http_status: urlValidation.httpStatus,
      soft_404_detected: urlValidation.isSoft404,
      parked_domain_detected: urlValidation.isParkedDomain,
      content_hash: urlValidation.contentHash,
      content_changed: urlValidation.contentChanged,
      error_message: urlValidation.errorMessage,
      repair_attempted: false,
      repair_successful: false
    });
  }
}

/**
 * Validate sources and update cache
 */
export async function validateAndCacheSources(
  location: string,
  itemPattern: string,
  guidanceText: string,
  sources: SourceMetadata[]
): Promise<SourceMetadata[]> {
  const validationResults = new Map<string, SourceValidationResult>();
  
  // Validate each URL source
  for (const source of sources) {
    if (source.type === 'url') {
      console.log(`Validating URL: ${source.value}`);
      const result = await validateUrl(source.value);
      validationResults.set(source.value, result);
      
      // Update source metadata with validation result
      source.verified = result.isValid;
      source.verifiedAt = result.checkedAt;
      
      if (!result.isValid) {
        console.warn(`URL validation failed: ${source.value} - ${result.errorMessage}`);
      }
    }
  }
  
  // Save to database
  await saveSources(location, itemPattern, guidanceText, sources, validationResults);
  
  return sources;
}

/**
 * Check if this is the first user from a location (no cache exists)
 */
export async function isFirstUserFromLocation(location: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('municipal_sources')
    .select('id')
    .eq('location', location.toLowerCase())
    .limit(1);
  
  if (error) {
    console.error('Error checking first user:', error);
    return false; // Assume not first to avoid unnecessary messages
  }
  
  return (data?.length ?? 0) === 0;
}
