# Source Validation Implementation Plan

## Overview
Implement lazy source validation with persistent caching to prevent citing expired/404 URLs to users.

## Database Schema
✅ Created migration: `20251208000000_create_source_validation_tables.sql`
- `municipal_sources` table: Stores validated guidance with source metadata
- `source_stability_log` table: Tracks validation history over time
- `legislative_events` table: Tracks compliance deadlines for volatility windows

## Utilities Created
✅ `_shared/sourceValidator.ts`: Core validation logic
- HTTP status checking with timeout
- Soft-404 detection (content analysis)
- Parked domain detection
- Content hashing for drift detection
- Domain stability classification
- Source metadata extraction (URLs, phones, facilities)

✅ `_shared/sourceCache.ts`: Database interaction layer
- Cache lookup and storage
- Validation orchestration
- First-user detection

## Integration Steps

### Step 1: Restructure Municipal Rules (Current Task)
The current hardcoded rules mix guidance text with inline sources:
```typescript
"electronics": "Free curbside pickup - schedule online at www.republicservices.com"
```

Need to:
1. Extract sources from inline text
2. Create structured format: `{ text: string, sources: SourceMetadata[] }`
3. Update rule lookup logic to use structured format

### Step 2: Integrate into classify-item Edge Function
Add validation flow:
1. Check cache first (`getCachedSources`)
2. If cache miss or stale, validate sources
3. Show "First user from {city}!" message if applicable
4. Return response with `sources` array

### Step 3: Integrate into search-items Edge Function
Mirror the same validation logic for search endpoint

### Step 4: Update Frontend TypeScript Interfaces
Add `sources` field to `ClassificationResult` interface in:
- `src/integrations/supabase/types.ts` (if applicable)
- `src/pages/Index.tsx` 
- Component prop types

### Step 5: Update UI Components
Modify `ResultModal.tsx` to display:
- Source links with verification icons
- Verification timestamp
- Stability indicators

### Step 6: Add Search Operator Recovery
Implement auto-repair logic for broken URLs

## Implementation Notes

### Gradual Migration Strategy
Rather than restructuring all 100+ rules at once:
1. Start with high-priority cities (Long Beach - reported issues)
2. Use lazy extraction: on first request, extract sources inline
3. Cache extracted structure for future requests
4. Allows progressive migration without blocking deployment

### JPA Anchor Strategy (from Research)
For Bay Area cities:
- San Ramon → check stopwaste.org first
- Danville/Walnut Creek → check recyclesmart.org first
- Fallback to city .gov sites only if JPA has no data

### Handling Legacy Format
Need backward compatibility:
- If rule is string (old format): extract sources on-the-fly
- If rule is object (new format): use pre-extracted sources
- Cache the extracted version regardless

## Testing Checklist
- [ ] Database migration runs successfully
- [ ] Source validation detects soft-404s
- [ ] Source validation detects parked domains
- [ ] Cache stores and retrieves sources correctly
- [ ] First-user message displays appropriately
- [ ] Validated sources display in UI with icons
- [ ] Phone numbers and facilities extract correctly
- [ ] Content drift detection works
- [ ] Fallback to generic guidance on validation failure

## Deployment Order
1. Deploy database migration
2. Deploy edge functions with validation logic
3. Deploy frontend UI updates
4. Monitor logs for validation issues
5. Manual audit of flagged sources
