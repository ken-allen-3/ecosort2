import { createHash } from "node:crypto";

export interface SourceValidationResult {
  url: string;
  isValid: boolean;
  httpStatus?: number;
  isSoft404: boolean;
  isParkedDomain: boolean;
  contentHash?: string;
  contentChanged: boolean;
  errorMessage?: string;
  checkedAt: Date;
}

export interface SourceMetadata {
  type: 'url' | 'phone' | 'facility';
  value: string;
  verified: boolean;
  verifiedAt?: Date;
  stability: 'high' | 'medium' | 'low';
}

// Soft 404 detection patterns from research
const SOFT_404_PATTERNS = [
  /no results found/i,
  /page you requested/i,
  /page not found/i,
  /404/i,
  /page is sleeping/i,
  /under maintenance/i,
  /this page has moved/i,
  /we're sorry/i,
  /cannot be found/i,
  /does not exist/i
];

// Parked domain indicators
const PARKED_DOMAIN_PATTERNS = [
  /domain for sale/i,
  /buy this domain/i,
  /this domain may be for sale/i,
  /related links/i,
  /welcome to nginx/i,
  /apache.*default page/i,
  /coming soon/i
];

// Known stable JPA/Authority domains (from research)
const HIGH_STABILITY_DOMAINS = [
  'recyclesmart.org',
  'stopwaste.org',
  'earth911.com',
  'data.cincinnati-oh.gov'
];

const MEDIUM_STABILITY_DOMAINS = [
  'wm.com',
  'republicservices.com',
  'wasteconnections.com'
];

/**
 * Normalize HTML content for hashing by removing dynamic elements
 */
function normalizeContent(html: string): string {
  return html
    // Remove scripts and styles
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove common dynamic elements
    .replace(/\s*(id|class|data-[a-z-]+|aria-[a-z-]+)="[^"]*"/gi, '')
    // Remove timestamps and session IDs
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '')
    .replace(/[a-f0-9]{32,}/gi, '') // Remove long hex strings (likely tokens)
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate SHA-256 hash of normalized content
 */
function hashContent(content: string): string {
  const normalized = normalizeContent(content);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Determine domain stability based on research findings
 */
export function getDomainStability(url: string): 'high' | 'medium' | 'low' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // Check for high-stability JPA/Authority domains
    if (HIGH_STABILITY_DOMAINS.some(domain => hostname.includes(domain))) {
      return 'high';
    }
    
    // Check for medium-stability major hauler domains
    if (MEDIUM_STABILITY_DOMAINS.some(domain => hostname.includes(domain))) {
      return 'medium';
    }
    
    // Government .gov domains are generally stable
    if (hostname.endsWith('.gov')) {
      return 'high';
    }
    
    // Everything else (microsites, local haulers) is low stability
    return 'low';
  } catch {
    return 'low';
  }
}

/**
 * Detect soft 404s by analyzing page content
 */
function detectSoft404(html: string, title: string): boolean {
  // Check title for 404 indicators
  if (SOFT_404_PATTERNS.some(pattern => pattern.test(title))) {
    return true;
  }
  
  // Check body content
  if (SOFT_404_PATTERNS.some(pattern => pattern.test(html))) {
    return true;
  }
  
  // Calculate boilerplate ratio (research indicates soft 404s are mostly boilerplate)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const bodyContent = bodyMatch[1];
    const headerFooter = bodyContent.match(/<(header|footer|nav)[^>]*>[\s\S]*?<\/(header|footer|nav)>/gi) || [];
    const boilerplateLength = headerFooter.join('').length;
    const totalLength = bodyContent.length;
    
    // If >70% is boilerplate, likely a soft 404
    if (totalLength > 0 && boilerplateLength / totalLength > 0.7) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect parked domains
 */
function detectParkedDomain(html: string, title: string): boolean {
  // Check title
  if (PARKED_DOMAIN_PATTERNS.some(pattern => pattern.test(title))) {
    return true;
  }
  
  // Check body
  if (PARKED_DOMAIN_PATTERNS.some(pattern => pattern.test(html))) {
    return true;
  }
  
  // Count ad links (parked domains are ad-heavy)
  const adKeywords = ['ad', 'sponsor', 'affiliate', 'parking'];
  const links = html.match(/<a[^>]*href="[^"]*"[^>]*>/gi) || [];
  const adLinks = links.filter(link => 
    adKeywords.some(keyword => link.toLowerCase().includes(keyword))
  );
  
  // If >50% of links are ads, likely parked
  if (links.length > 5 && adLinks.length / links.length > 0.5) {
    return true;
  }
  
  return false;
}

/**
 * Validate a URL with comprehensive checks
 */
export async function validateUrl(
  url: string,
  previousHash?: string,
  timeout = 8000
): Promise<SourceValidationResult> {
  const result: SourceValidationResult = {
    url,
    isValid: false,
    isSoft404: false,
    isParkedDomain: false,
    contentChanged: false,
    checkedAt: new Date()
  };
  
  try {
    // Attempt HEAD request first (faster)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'EcoSort-SourceValidator/1.0 (Municipal Waste Data Verification)'
        }
      });
    } catch (headError) {
      // If HEAD fails, try GET (some servers block HEAD)
      clearTimeout(timeoutId);
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), timeout);
      
      response = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        headers: {
          'User-Agent': 'EcoSort-SourceValidator/1.0 (Municipal Waste Data Verification)'
        }
      });
      clearTimeout(getTimeoutId);
    }
    
    clearTimeout(timeoutId);
    result.httpStatus = response.status;
    
    // Check for hard failures
    if (response.status === 404 || response.status === 410) {
      result.errorMessage = `HTTP ${response.status}: Resource not found`;
      return result;
    }
    
    if (response.status >= 500) {
      result.errorMessage = `HTTP ${response.status}: Server error`;
      return result;
    }
    
    // For successful responses, fetch content for deeper analysis
    if (response.status === 200) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '';
      
      // Detect soft 404
      result.isSoft404 = detectSoft404(html, title);
      if (result.isSoft404) {
        result.errorMessage = 'Soft 404 detected: Page returns 200 but contains error content';
        return result;
      }
      
      // Detect parked domain
      result.isParkedDomain = detectParkedDomain(html, title);
      if (result.isParkedDomain) {
        result.errorMessage = 'Parked domain detected: Domain may have expired or been abandoned';
        return result;
      }
      
      // Calculate content hash
      result.contentHash = hashContent(html);
      
      // Check for content drift
      if (previousHash && previousHash !== result.contentHash) {
        result.contentChanged = true;
      }
      
      // If we made it here, the URL is valid
      result.isValid = true;
    } else {
      result.errorMessage = `HTTP ${response.status}: Unexpected status code`;
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        result.errorMessage = `Timeout after ${timeout}ms`;
      } else {
        result.errorMessage = `Network error: ${error.message}`;
      }
    } else {
      result.errorMessage = 'Unknown validation error';
    }
    return result;
  }
}

/**
 * Extract structured source metadata from guidance text
 * Separates URLs, phone numbers, and facility names from inline text
 */
export function extractSourceMetadata(guidanceText: string): {
  cleanedText: string;
  sources: SourceMetadata[];
} {
  const sources: SourceMetadata[] = [];
  let cleanedText = guidanceText;
  
  // Extract URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const urls = guidanceText.match(urlRegex) || [];
  urls.forEach(url => {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    sources.push({
      type: 'url',
      value: normalizedUrl,
      verified: false,
      stability: getDomainStability(normalizedUrl)
    });
    cleanedText = cleanedText.replace(url, '').trim();
  });
  
  // Extract phone numbers (various formats)
  const phoneRegex = /(?:Call|Phone|Contact)?\s*(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
  const phones = guidanceText.match(phoneRegex) || [];
  phones.forEach(phone => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 10) {
      sources.push({
        type: 'phone',
        value: cleanPhone,
        verified: true, // Phone numbers don't need URL validation
        stability: 'high'
      });
      cleanedText = cleanedText.replace(phone, '').trim();
    }
  });
  
  // Extract facility names (common patterns from research)
  const facilityPatterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Transfer Station|Recycling Center|HHW|Household Hazardous Waste)\b/g,
    /\b(?:Drop off at|Visit)\s+([A-Z][^.!?]*(?:Station|Center|Facility))/g
  ];
  
  facilityPatterns.forEach(pattern => {
    const matches = guidanceText.matchAll(pattern);
    for (const match of matches) {
      sources.push({
        type: 'facility',
        value: match[1].trim(),
        verified: true, // Facility names don't need URL validation
        stability: 'medium'
      });
    }
  });
  
  // Clean up multiple spaces and punctuation artifacts
  cleanedText = cleanedText.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
  
  return { cleanedText, sources };
}

/**
 * Calculate next check date based on domain stability and recent validation history
 */
export function calculateNextCheckDate(
  stability: 'high' | 'medium' | 'low',
  recentFailures: number = 0
): Date {
  const now = new Date();
  let daysUntilCheck: number;
  
  // Base intervals from research
  switch (stability) {
    case 'high': // .gov, JPA domains
      daysUntilCheck = 90;
      break;
    case 'medium': // Major haulers
      daysUntilCheck = 30;
      break;
    case 'low': // Microsites, local haulers
      daysUntilCheck = 14;
      break;
  }
  
  // Increase frequency if there have been recent failures
  if (recentFailures > 0) {
    daysUntilCheck = Math.max(7, Math.floor(daysUntilCheck / (recentFailures + 1)));
  }
  
  now.setDate(now.getDate() + daysUntilCheck);
  return now;
}
