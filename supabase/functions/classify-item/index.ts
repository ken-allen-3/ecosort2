import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            content: `You are an expert waste management classifier with knowledge of recycling programs across the United States. 

The user is located in ${cityName}. Use your knowledge of local recycling rules, waste management programs, and municipal guidelines for this area when classifying items.

Analyze images and classify items into one of three categories:
- recyclable: Items that can be recycled in standard curbside programs
- compostable: Organic materials that can be composted (if the city has a composting program)
- trash: Everything else (mixed materials, contaminated items, non-recyclable items)

Consider local factors like:
- Whether the city has curbside composting/organics programs
- Local rules about pizza boxes, plastic bags, glass, styrofoam
- Any specific recycling restrictions or requirements for this area

Return a JSON object with:
{
  "category": "recyclable" | "compostable" | "trash",
  "item": "brief description of the item",
  "confidence": 0.0 to 1.0,
  "explanation": "why this item falls into this category, including any location-specific considerations for ${cityName}"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `I'm in ${cityName}. What is this item and how should I dispose of it according to local rules?`,
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required. Please contact support." }),
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

    // Add disclaimer about verifying with local authorities
    result.disclaimer = `Rules may vary. Please verify with ${cityName}'s official waste management resources.`;

    console.log("Returning final result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in classify-item function:", error);
    
    // Provide more specific error messages
    let errorMessage = "Unknown error occurred";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for specific error types
      if (error.message.includes("JSON") || error.message.includes("parse")) {
        errorMessage = "Failed to process the response. Please try again.";
      } else if (error.message.includes("timeout") || error.message.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
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
