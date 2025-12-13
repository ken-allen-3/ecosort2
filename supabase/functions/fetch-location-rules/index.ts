import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate a URL by making a HEAD request
async function validateUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WFB-Bot/1.0)",
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok || response.status === 405; // 405 means HEAD not allowed but URL exists
  } catch {
    return false;
  }
}

// Generate Earth911 search URL as fallback
function getEarth911FallbackUrl(cityName: string): { name: string; url: string; type: string } {
  const encodedCity = encodeURIComponent(cityName);
  return {
    name: "Earth911 Recycling Search",
    url: `https://search.earth911.com/?what=recycling&where=${encodedCity}`,
    type: "directory",
  };
}

// Validate sources and replace invalid ones with fallback
async function validateAndFixSources(
  sources: Array<{ name: string; url: string; type: string }> | undefined,
  cityName: string
): Promise<Array<{ name: string; url: string; type: string }>> {
  if (!sources || !Array.isArray(sources) || sources.length === 0) {
    console.log("No sources provided, using Earth911 fallback");
    return [getEarth911FallbackUrl(cityName)];
  }

  const validatedSources: Array<{ name: string; url: string; type: string }> = [];
  
  // Validate each source URL in parallel
  const validationResults = await Promise.all(
    sources.map(async (source) => {
      if (!source.url || typeof source.url !== "string") {
        return { source, isValid: false };
      }
      
      // Basic URL format check
      try {
        new URL(source.url);
      } catch {
        console.log(`Invalid URL format: ${source.url}`);
        return { source, isValid: false };
      }
      
      const isValid = await validateUrl(source.url);
      console.log(`URL validation: ${source.url} - ${isValid ? "valid" : "invalid"}`);
      return { source, isValid };
    })
  );

  // Collect valid sources
  for (const { source, isValid } of validationResults) {
    if (isValid) {
      validatedSources.push(source);
    }
  }

  // If no valid sources, add Earth911 fallback
  if (validatedSources.length === 0) {
    console.log("No valid sources found, using Earth911 fallback");
    return [getEarth911FallbackUrl(cityName)];
  }

  return validatedSources;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location } = await req.json();
    
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Location is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cityName = location.trim();
    console.log("Fetching recycling rules for location:", cityName);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a waste management expert. Provide concise, accurate information about recycling and waste disposal rules for specific locations in the US.`,
          },
          {
            role: "user",
            content: `Provide a brief overview of recycling and waste disposal rules for ${cityName}. Include:

1. What recycling program exists (single-stream, multi-stream, etc.)
2. Common items that ARE accepted in recycling
3. Common items that are NOT accepted (that people often mistakenly recycle)
4. Whether composting/organics collection is available
5. Any unique local rules or restrictions
6. IMPORTANT: Include source citations with URLs to official government or waste management websites

Return a JSON object with:
{
  "city": "${cityName}",
  "rule_basis": "city_specific" | "state_guidelines" | "national_guidelines" | "general_knowledge",
  "has_curbside_recycling": true/false,
  "has_composting": true/false,
  "recycling_type": "single-stream" | "multi-stream" | "drop-off only" | "none",
  "bin_names": {
    "recycling": "local name for recycling bin (e.g., blue bin, blue cart)",
    "compost": "local name for compost bin if applicable",
    "trash": "local name for trash bin"
  },
  "accepted_items": ["list", "of", "accepted", "recyclables"],
  "not_accepted": ["common", "mistakes", "people", "make"],
  "special_rules": ["any", "unique", "local", "rules"],
  "composting_notes": "brief note about composting program if available",
  "summary": "2-3 sentence summary of the recycling situation in this city",
  "sources": [
    {
      "name": "Official source name (e.g., City of ${cityName} Public Works)",
      "url": "https://official-url-to-recycling-info.gov",
      "type": "city" | "county" | "state" | "waste_hauler" | "epa"
    }
  ]
}

CRITICAL: Always include at least one source in the sources array. Prefer official city/county government websites, waste hauler websites, or EPA resources. If you cannot find a specific URL, use the city's main government website or the waste hauler's general recycling page.

Be accurate. If you don't have specific knowledge about ${cityName}, use state-level or national guidelines and indicate that in rule_basis.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response received");

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in AI response");
      throw new Error("No response from AI");
    }

    // Strip markdown code blocks if present
    let jsonString = content.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*\n?/, "").replace(/\n?```\s*$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Invalid response format from AI");
    }

    // Validate and fix source URLs
    console.log("Validating source URLs...");
    result.sources = await validateAndFixSources(result.sources, cityName);
    console.log(`Validated sources: ${result.sources.length} valid`);

    // Add timestamp for caching purposes
    result.fetched_at = new Date().toISOString();
    result.location = cityName;

    console.log("Returning location rules:", result.city, result.rule_basis);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in fetch-location-rules function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to fetch location rules" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
