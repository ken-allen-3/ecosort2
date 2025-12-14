import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifiedSource {
  name: string;
  url: string;
}

// Use Perplexity to find real, verified source URLs for the item + location
async function findVerifiedSources(
  itemDescription: string,
  cityName: string,
  category: string,
  perplexityKey: string
): Promise<VerifiedSource[]> {
  try {
    console.log("Finding verified sources with Perplexity...");
    
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "user",
            content: `Find official recycling or waste disposal guidelines for ${cityName} that explain how to dispose of "${itemDescription}" (category: ${category}). I need direct URLs to city, county, or waste hauler websites with current, accessible information about recycling rules.`,
          },
        ],
        search_recency_filter: "year",
      }),
    });

    if (!response.ok) {
      console.error("Perplexity API error:", response.status);
      return [];
    }

    const data = await response.json();
    const citations = data.citations || [];
    
    console.log(`Perplexity found ${citations.length} citations`);

    // Convert citations to our source format with meaningful names
    const sources: VerifiedSource[] = citations.slice(0, 2).map((url: string) => {
      let name = "Recycling Guide";
      
      try {
        const urlObj = new URL(url);
        const host = urlObj.hostname.replace("www.", "");
        
        if (host.includes(".gov")) {
          const parts = host.split(".");
          name = `${parts[0].charAt(0).toUpperCase() + parts[0].slice(1)} Official Guide`;
        } else if (host.includes("recology")) {
          name = "Recology Guide";
        } else if (host.includes("republicservices") || host.includes("republic")) {
          name = "Republic Services";
        } else if (host.includes("wastemanagement") || host.includes("wm.com")) {
          name = "Waste Management";
        } else if (host.includes("epa")) {
          name = "EPA Guidelines";
        } else {
          // Use domain name as fallback
          name = host.split(".")[0].charAt(0).toUpperCase() + host.split(".")[0].slice(1);
        }
      } catch {
        // URL parsing failed, use default name
      }
      
      return { name, url };
    });

    return sources;
  } catch (error) {
    console.error("Perplexity search error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, location } = await req.json();
    
    // Validate inputs
    if (!image || typeof image !== 'string') {
      return new Response(
        JSON.stringify({ error: "No valid image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Location is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate image data URL format
    if (!image.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ error: "Invalid image format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cityName = location.trim();
    console.log("Classifying item for location:", cityName);

    // Call Lovable AI with vision model - include location in prompt for AI knowledge
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
  "bin_name": "the local name for this bin type (e.g., 'blue bin', 'green cart', 'recycling container')"
}

For rule_basis:
- Use "city_specific" if you have actual knowledge of ${cityName}'s waste program
- Use "state_guidelines" if using state-level recycling rules
- Use "national_guidelines" if falling back to general US recycling standards
- Use "general_knowledge" if this is just common recycling knowledge

For reasoning, provide 2-4 short steps explaining your logic, like:
- "This is a plastic bottle with recycling symbol #1 (PET)"
- "PET plastics are widely accepted in curbside recycling"
- "${cityName} accepts plastics #1-7 in their blue bin program"

IMPORTANT: Return ONLY the JSON object, no additional text before or after.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `I'm in ${cityName}. Which fucking bin does this go in?`,
              },
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
            ],
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

    // Extract JSON from response - handle text before/after code blocks
    let jsonString = content.trim();
    
    // Check if response contains a JSON code block
    const jsonBlockMatch = jsonString.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      jsonString = jsonBlockMatch[1].trim();
    } else {
      // Try to find raw JSON object if no code block
      const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonString = jsonObjectMatch[0];
      }
    }

    console.log("Extracted JSON string:", jsonString);

    // Parse the JSON response with error handling
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

    // Fetch verified sources using Perplexity (if available)
    if (PERPLEXITY_API_KEY) {
      const verifiedSources = await findVerifiedSources(
        result.item,
        cityName,
        result.category,
        PERPLEXITY_API_KEY
      );
      
      if (verifiedSources.length > 0) {
        result.sources = verifiedSources;
        console.log(`Using ${verifiedSources.length} Perplexity-verified sources`);
      } else {
        // Fallback to Google search
        const searchQuery = encodeURIComponent(`${cityName} ${result.item} recycling disposal`);
        result.sources = [{
          name: "Search Local Guidelines",
          url: `https://www.google.com/search?q=${searchQuery}`,
        }];
        console.log("Using Google search fallback");
      }
    } else {
      // No Perplexity key - use Google search fallback
      const searchQuery = encodeURIComponent(`${cityName} recycling guidelines`);
      result.sources = [{
        name: "Search Local Guidelines",
        url: `https://www.google.com/search?q=${searchQuery}`,
      }];
      console.log("No Perplexity key, using Google search fallback");
    }

    // Add disclaimer about verifying with local authorities
    result.disclaimer = `Rules vary, and cities love changing them. When in doubt, check ${cityName}'s waste management website.`;

    console.log("Returning final result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in classify-item function:", error);
    
    // Provide more specific error messages
    let errorMessage = "Something broke. Not sure what, but it wasn't your fault. Probably.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
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