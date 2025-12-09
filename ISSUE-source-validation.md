# Issue: Implement Source URL Validation to Prevent Citing Expired/404 Sources

## Priority: High
**Category:** Data Quality / User Trust  
**Status:** Foundation Complete, Integration Needed

## Problem Statement

Users are being shown broken/expired source URLs for municipal disposal rules. For example, Long Beach sources currently lead to 404 errors. This undermines user trust and provides no way to verify the guidance.

**User Impact:** When sources fail, users can't verify disposal rules or contact authorities, potentially leading to contamination or improper disposal.

## Solution Architecture

Implement lazy source validation with persistent caching:
1. **First user from a location** triggers validation of all sources for that city
2. **Validation results cached** in Supabase for 30-90 days (based on domain stability)
3. **Broken sources flagged** and excluded from user-facing responses
4. **Background refresh** re-validates periodically

### Research Foundation

This implementation is based on comprehensive research (see `Municipal Waste Disposal Source Validation.txt` in Downloads if available) covering:
- Domain stability patterns (JPA > .gov > hauler > microsite)
- Soft-404 detection (pages that return 200 but are actually errors)
- Parked domain detection (expired domains taken by squatters)
- Content drift detection (rules change without URL changing)

## Work Completed ✅

### Database Schema
**File:** `supabase/migrations/20251208000000_create_source_validation_tables.sql`

Three tables created:
1. **`municipal_sources`** - Stores validated guidance with source metadata
   - Tracks URL, phone numbers, facility names separately
   - Stores content hash for drift detection
   - Flags soft-404s and parked domains
   - Schedules next validation check based on stability
2. **`source_stability_log`** - Time-series log of validation attempts
   - Enables analysis of URL health over time
   - Tracks repair attempts
3. **`legislative_events`** - Tracks compliance deadlines (SB 1383, AB 1826, etc.)
   - Increases validation frequency during volatility windows (60 days before/after deadline)

**Action Required:** Apply this migration in Supabase dashboard or via CLI

### Backend Utilities
All files in `supabase/functions/_shared/`:

1. **`sourceValidator.ts`** - Core validation engine
   - `validateUrl()` - HTTP check with soft-404/parked domain detection
   - `extractSourceMetadata()` - Separates URLs/phones/facilities from text
   - `getDomainStability()` - Classifies domains (high/medium/low)
   - `calculateNextCheckDate()` - Schedules revalidation based on stability

2. **`sourceCache.ts`** - Database interaction layer
   - `getCachedSources()` - Checks if sources already validated
   - `validateAndCacheSources()` - Validates and persists to DB
   - `isFirstUserFromLocation()` - Detects if this is first request for a city
   - `saveSources()` - Upserts validation results

3. **`municipalRules.ts`** - Backward-compatible rule processing
   - Handles legacy string format: `"text with inline www.example.com"`
   - Handles new structured format: `{ text: "...", sources: [...] }`
   - Enables gradual migration without breaking existing code

## Work Remaining 🔨

### 1. Supabase Edge Functions Integration

#### File: `supabase/functions/classify-item/index.ts`

**Current behavior:** Returns `municipalNotes` as plain string with inline sources

**Needed changes:**
```typescript
// Add imports at top
import { getCachedSources, validateAndCacheSources, isFirstUserFromLocation } from "../_shared/sourceCache.ts";
import { getMunicipalRule } from "../_shared/municipalRules.ts";
import type { SourceMetadata } from "../_shared/sourceValidator.ts";

// After finding municipal rule match (around line 370):
// Instead of: result.municipalNotes = locationRules[bestMatch];

const processedRule = getMunicipalRule(itemLower, locationKey, municipalRules);

if (processedRule) {
  // Check cache first
  const cached = await getCachedSources(locationKey, bestMatch);
  
  let sources: SourceMetadata[];
  
  if (cached && !cached.needsValidation) {
    // Use cached validated sources
    sources = cached.sources;
    result.municipalNotes = cached.guidanceText;
  } else {
    // First time or stale - validate now
    const isFirstUser = await isFirstUserFromLocation(locationKey);
    
    if (isFirstUser) {
      console.log(`First user from ${locationKey}! Validating sources...`);
      // Could add a flag to response to show special message
      result.isFirstUserFromLocation = true;
    }
    
    // Validate and cache
    sources = await validateAndCacheSources(
      locationKey,
      bestMatch,
      processedRule.text,
      processedRule.sources
    );
    
    result.municipalNotes = processedRule.text;
  }
  
  // Add validated sources to response
  result.sources = sources;
}
```

**Update return type** to include `sources` and optional `isFirstUserFromLocation`:
```typescript
// Existing fields:
// category, item, confidence, explanation, municipalNotes?, specialHandling?
// Add:
sources?: SourceMetadata[];
isFirstUserFromLocation?: boolean;
```

#### File: `supabase/functions/search-items/index.ts`

**Apply identical changes** - this function has duplicate municipal rules logic (lines 14-125). Consider refactoring to share the same rule lookup code.

### 2. Frontend TypeScript Interfaces

#### File: `src/pages/Index.tsx` (lines 19-26)

Update the `ClassificationResult` interface:
```typescript
interface ClassificationResult {
  category: "recyclable" | "compostable" | "trash" | "special";
  item: string;
  confidence: number;
  explanation: string;
  municipalNotes?: string;
  specialHandling?: string;
  sources?: Array<{
    type: 'url' | 'phone' | 'facility';
    value: string;
    verified: boolean;
    verifiedAt?: string; // ISO date string from backend
    stability: 'high' | 'medium' | 'low';
  }>;
  isFirstUserFromLocation?: boolean;
}
```

### 3. UI Updates

#### File: `src/components/ResultModal.tsx`

**Current:** Displays `municipalNotes` as plain text (lines 119-127)

**Enhancement needed:** Add source display after municipal notes section

```typescript
{result.municipalNotes && (
  <Card className="p-6 bg-primary/5 border-primary/20">
    <h4 className="font-semibold mb-3 flex items-center gap-2">
      <MapPin className="w-4 h-4 text-primary" />
      Local rules for {location}
    </h4>
    <p className="text-muted-foreground leading-relaxed">{result.municipalNotes}</p>
    
    {/* NEW: Display sources */}
    {result.sources && result.sources.length > 0 && (
      <div className="mt-4 pt-4 border-t border-primary/10">
        <p className="text-xs text-muted-foreground mb-2">Sources:</p>
        <div className="space-y-2">
          {result.sources.map((source, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {source.type === 'url' && (
                <>
                  {source.verified ? (
                    <span className="text-green-600" title="Verified">✓</span>
                  ) : (
                    <span className="text-amber-600" title="Could not verify">⚠</span>
                  )}
                  <a 
                    href={source.value} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {new URL(source.value).hostname}
                  </a>
                  {source.stability === 'low' && (
                    <span className="text-xs text-muted-foreground" title="Source may change">
                      (unstable)
                    </span>
                  )}
                </>
              )}
              {source.type === 'phone' && (
                <>
                  <span className="text-primary">📞</span>
                  <a href={`tel:${source.value}`} className="text-primary hover:underline">
                    {source.value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}
                  </a>
                </>
              )}
              {source.type === 'facility' && (
                <>
                  <span className="text-primary">📍</span>
                  <span>{source.value}</span>
                </>
              )}
            </div>
          ))}
        </div>
        {result.sources.some(s => s.verifiedAt) && (
          <p className="text-xs text-muted-foreground mt-2">
            Last verified: {new Date(result.sources.find(s => s.verifiedAt)!.verifiedAt!).toLocaleDateString()}
          </p>
        )}
      </div>
    )}
  </Card>
)}

{/* NEW: First user message */}
{result.isFirstUserFromLocation && (
  <Card className="p-4 bg-blue-50 border-blue-200">
    <p className="text-sm text-blue-900">
      👋 You're our first user from {location}! We just verified the local disposal rules for you.
    </p>
  </Card>
)}
```

### 4. Optional Enhancements

#### Auto-Repair for Broken URLs
**File:** `supabase/functions/_shared/sourceRepair.ts` (create new)

When a URL fails validation, attempt to find replacement using:
- Google Custom Search API: `site:{domain} "{search terms}" filetype:pdf`
- Check JPA "member agencies" pages (recyclesmart.org, stopwaste.org)
- Query Internet Archive Wayback Machine for last known good version

#### Background Refresh Job
**File:** `supabase/functions/refresh-sources/index.ts` (create new)

Cron function (runs weekly):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { validateUrl } from "../_shared/sourceValidator.ts";

// Query all sources where next_check_date <= NOW()
// Re-validate each one
// Update cache with new results
// Send alert if >5 sources fail (monitoring)
```

Configure in `supabase/config.toml`:
```toml
[functions.refresh-sources]
schedule = "0 2 * * 0" # 2 AM every Sunday
```

## Testing Checklist

### Supabase (Backend)
- [ ] Migration runs without errors: `supabase db reset` (local) or apply via dashboard
- [ ] Can insert/query `municipal_sources` table
- [ ] `validateUrl()` correctly identifies soft-404s (test with known bad URL)
- [ ] `validateUrl()` correctly identifies parked domains
- [ ] `extractSourceMetadata()` extracts URLs, phones, facilities from text
- [ ] `getCachedSources()` returns cached data after first validation
- [ ] `isFirstUserFromLocation()` correctly detects first request

### Edge Functions
- [ ] Classify-item returns `sources` array in response
- [ ] Search-items returns `sources` array in response
- [ ] First user from new city sees `isFirstUserFromLocation: true`
- [ ] Subsequent users get cached results (check logs for "Using cached")
- [ ] Broken URLs are flagged (verified: false)
- [ ] Phone numbers appear in sources with verified: true

### Frontend
- [ ] ResultModal displays sources section when available
- [ ] Verified URLs show ✓ icon
- [ ] Unverified URLs show ⚠ icon  
- [ ] Phone numbers are clickable tel: links
- [ ] Facility names display with 📍 icon
- [ ] "First user" message appears when flag is true
- [ ] "Last verified" date displays correctly

### Long Beach Specific (Bug Report)
- [ ] Identify current broken URLs in Long Beach rules (around line 85 in classify-item/index.ts)
- [ ] Validation flags them as soft-404 or hard-404
- [ ] They appear with ⚠ icon in UI
- [ ] Search for correct replacement URLs
- [ ] Update rules with new URLs
- [ ] Re-validate shows ✓ icon

## Migration Strategy

**Gradual rollout** - no need to restructure all 100+ rules immediately:

1. **Phase 1:** Deploy validation system with legacy format support
   - Extraction happens on-the-fly from string rules
   - Works with existing codebase unchanged
   
2. **Phase 2:** Fix high-priority cities
   - Long Beach (reported broken sources)
   - Any city with upcoming legislative deadline
   
3. **Phase 3:** Convert to structured format city-by-city
   - Improves performance (no regex extraction on every request)
   - Allows pre-validation of sources in development

## Deployment Order

1. ✅ Commit validation utility files (already in repo)
2. 🔲 Apply database migration in Supabase
3. 🔲 Update edge functions (`classify-item`, `search-items`)
4. 🔲 Update frontend TypeScript interfaces
5. 🔲 Update UI components
6. 🔲 Deploy to Lovable (auto-deploys from main branch)
7. 🔲 Monitor logs for validation errors
8. 🔲 Manual audit of flagged sources
9. 🔲 (Optional) Implement auto-repair
10. 🔲 (Optional) Set up background refresh cron

## Key Files Reference

### Backend
- `supabase/migrations/20251208000000_create_source_validation_tables.sql` - DB schema
- `supabase/functions/_shared/sourceValidator.ts` - Validation logic
- `supabase/functions/_shared/sourceCache.ts` - DB interface
- `supabase/functions/_shared/municipalRules.ts` - Rule processing
- `supabase/functions/classify-item/index.ts` - Image classification endpoint
- `supabase/functions/search-items/index.ts` - Text search endpoint

### Frontend
- `src/pages/Index.tsx` - Main page with ClassificationResult interface
- `src/components/ResultModal.tsx` - Displays classification results

### Documentation
- `docs/planning/source-validation-implementation.md` - Detailed implementation notes
- `ISSUES.md` - Main project issues tracker

## Questions / Clarifications Needed

1. **Should we block the response while validating?**
   - Option A: Wait 5-10s for validation before showing result (user sees loading state)
   - Option B: Show result immediately, update sources async when ready
   - **Recommendation:** Option A for simplicity (validation is only slow on first request)

2. **What to do when all sources fail validation?**
   - Option A: Show generic guidance with no sources
   - Option B: Show guidance with "(sources unavailable)" note
   - **Recommendation:** Option B - still helpful even without verification

3. **Should we expose validation errors to users?**
   - Currently hidden in backend logs
   - Could add tooltip: "Last check failed: timeout" on ⚠ icon
   - **Recommendation:** Keep internal for now, revisit if users request it

## Related Issues

- **ISSUES.md #1** - "Fix Incorrect Bin Colors" - could benefit from source verification
- **ISSUES.md #11** - "Region + Council Selector" - relates to hierarchical location structure

## Contact / Questions

If stuck or need clarification:
1. Review research document (`Municipal Waste Disposal Source Validation.txt`)
2. Check planning doc (`docs/planning/source-validation-implementation.md`)
3. Review utility code comments in `_shared/` files
4. Test validators directly in Deno REPL to understand behavior
