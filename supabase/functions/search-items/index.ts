import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAndCacheSources } from "../_shared/sourceCache.ts";
import { getDomainStability } from "../_shared/sourceValidator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, location } = await req.json();
    
    // Validate inputs
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No search query provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const searchQuery = query.trim();
    console.log("Searching for item:", searchQuery, "in location:", cityName);

    // Use AI to classify the text query
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
            content: `You are a snarky but helpful waste sorting expert for the app "Which Fucking Bin?" - you're fed up with how confusing recycling rules are, and you share that frustration with users while still giving them accurate information.

The user is located in ${cityName}. Use your knowledge of local recycling rules, waste management programs, and municipal guidelines for this area.

Your personality:
- You curse (damn, shit, hell, crap, ass, fuck) but stay helpful
- You acknowledge the absurdity of different cities having different rules
- You're sympathetic to the user's confusion
- You give clear, actionable answers despite the attitude

Classify items into one of three categories:
- recyclable: Items accepted in standard curbside recycling programs
- compostable: Organic materials for composting (if the city has a program)
- trash: Everything else (mixed materials, contaminated items, non-recyclables)

Consider local factors:
- Whether ${cityName} has curbside composting/organics programs
- Local rules about pizza boxes, plastic bags, glass, styrofoam, etc.
- Any specific recycling restrictions for this area

Return a JSON object with:
{
  "category": "recyclable" | "compostable" | "trash",
  "item": "brief description of the item",
  "confidence": 0.0 to 1.0,
  "explanation": "snarky but helpful explanation of why this goes where it does, mentioning ${cityName}'s specific rules if relevant. Be funny but accurate. Keep it to 2-3 sentences max.",
  "rule_basis": "city_specific" | "state_guidelines" | "national_guidelines" | "general_knowledge",
  "reasoning": ["step 1 of your logic", "step 2", "step 3"],
  "bin_name": "the local name for this bin type (e.g., 'blue bin', 'green cart', 'recycling container')",
  "sources": [
    {
      "name": "Short source name (e.g., '${cityName} Recycling Guide')",
      "url": "https://official-url.gov/recycling"
    }
  ]
}

CRITICAL: Include 1-2 sources in the sources array. Prefer official city/county government recycling pages, waste hauler websites (Republic Services, Waste Management, etc.), or EPA resources. These help users verify your guidance.

For rule_basis:
- Use "city_specific" if you have actual knowledge of ${cityName}'s waste program
- Use "state_guidelines" if using state-level recycling rules
- Use "national_guidelines" if falling back to general US recycling standards
- Use "general_knowledge" if this is just common recycling knowledge

For reasoning, provide 2-4 short steps explaining your logic.`,
          },
          {
            role: "user",
            content: `I'm in ${cityName}. Which fucking bin does "${searchQuery}" go in?`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Whoa, slow down! Too many requests. Try again in a sec." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "The AI needs a coffee break. Try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI classification failed: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response:", aiData);

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in AI response");
      throw new Error("No response from AI");
    }

    console.log("Raw AI content:", content);

    // Strip markdown code blocks if present
    let jsonString = content.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\s*\n?/, "").replace(/\n?```\s*$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    console.log("Cleaned JSON string:", jsonString);

    // Parse the JSON response
    let result;
    try {
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Failed to parse:", jsonString);
      throw new Error("Invalid response format from AI");
    }

    console.log("Parsed classification:", result);

    // Validate result structure
    if (!result.category || !result.item) {
      console.error("Missing required fields in result:", result);
      throw new Error("Incomplete classification result");
    }

    // Validate AI-returned sources before showing to users
    if (result.sources && result.sources.length > 0) {
      try {
        console.log("Validating sources for:", cityName, result.item);
        
        // Convert AI sources to SourceMetadata format
        const sourcesMetadata = result.sources.map((s: any) => ({
          type: 'url' as const,
          value: s.url || '',
          verified: false,
          stability: getDomainStability(s.url || '')
        }));
        
        // Create Supabase client for database access
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Validate and cache sources
          const validatedSources = await validateAndCacheSources(
            supabase,
            cityName.toLowerCase(),
            result.item,
            result.explanation,
            sourcesMetadata
          );
          
          // Replace with validated sources
          result.sources = validatedSources
            .filter(s => s.type === 'url' && s.value) // Only include valid URLs
            .map(s => ({
              name: s.type === 'url' ? new URL(s.value).hostname.replace('www.', '') : s.value,
              url: s.value,
              verified: s.verified,
              verifiedAt: s.verifiedAt,
              stability: s.stability
            }));
          
          console.log(`Validated ${result.sources.length} sources`);
        } else {
          console.warn("Supabase not configured, skipping source validation");
        }
      } catch (validationError) {
        console.error("Source validation failed:", validationError);
        // Don't fail the whole request if validation fails
      }
    }

    // Add disclaimer
    result.disclaimer = `Rules vary, and cities love changing them. When in doubt, check ${cityName}'s waste management website.`;

    console.log("Returning search result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-items function:", error);
    
    let errorMessage = "Something broke. Not sure what, but it wasn't your fault. Probably.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("JSON") || error.message.includes("parse")) {
        errorMessage = "Got a weird response. Let's try that again.";
      } else if (error.message.includes("timeout") || error.message.includes("fetch")) {
        errorMessage = "Network's being flaky. Check your connection and try again.";
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
