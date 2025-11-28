import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Municipal rules database (expandable)
const municipalRules: Record<string, Record<string, string>> = {
  default: {
    "pizza box": "If greasy, goes in trash. If clean, can be recycled.",
    "plastic bag": "Not accepted in curbside recycling. Take to store drop-off.",
    "glass bottle": "Rinse before recycling. Remove caps.",
    "food scraps": "Suitable for composting if your city has a program.",
  },
  "san ramon": {
    "pizza box": "Accepted in organics cart even if greasy. Remove any plastic liners first.",
    "plastic bag": "Not accepted in blue recycling cart. Take to participating grocery stores for recycling.",
    "glass bottle": "Place in blue recycling cart. Rinse and remove caps. No broken glass.",
    "food scraps": "Place in green organics cart. Includes all food waste, meat, dairy, and bones.",
    "cardboard": "Flatten and place in blue recycling cart. Remove tape and labels when possible.",
    "styrofoam": "Not recyclable. Place in black trash cart.",
    "plastic container": "Only #1-5 and #7 plastics accepted. Rinse clean and remove lids.",
    "yard waste": "Place in green organics cart. No plastic bags - use paper yard waste bags only.",
    "batteries": "Never place in any cart. Drop off at Household Hazardous Waste facility.",
    "electronics": "Schedule special pickup or drop off at Dublin Transfer Station.",
  },
  "long beach": {
    "pizza box": "Grease-free boxes in blue recycling bin. Greasy boxes and scraps go in green organics bin.",
    "plastic bag": "Not accepted curbside. Recycle at retail stores or use reusable bags.",
    "glass bottle": "All colors accepted in blue recycling bin. Rinse and keep caps on.",
    "food scraps": "All food waste accepted in green organics bin including meat, dairy, and grease.",
    "cardboard": "Flatten boxes and place in blue recycling bin. Remove packing materials.",
    "styrofoam": "Not recyclable in Long Beach. Place in black trash bin.",
    "plastic container": "Empty, clean, and dry plastics #1-7 accepted. Leave caps on bottles.",
    "yard waste": "Place in green organics bin. Branches must be under 3 feet long and 3 inches diameter.",
    "batteries": "Place in clear bag on top of blue recycling bin or drop at EDCO stations.",
    "electronics": "Free curbside pickup - schedule online or call (562) 570-2876.",
    "motor oil": "Never pour down drain. Take to any AutoZone or EDCO station for free recycling.",
    "textiles": "Clothing and fabrics accepted in blue bin if clean and dry. Place in clear plastic bag.",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, location } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
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

    console.log("Classifying item for location:", location || "default");

    // Call Lovable AI with vision model
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
            content: `You are an expert waste management classifier. Analyze images and classify items into one of three categories:
- recyclable: Items that can be recycled (paper, cardboard, metal cans, glass bottles, rigid plastics)
- compostable: Organic materials that can be composted (food scraps, yard waste, compostable packaging)
- trash: Everything else (mixed materials, contaminated items, non-recyclable plastics)

Return a JSON object with:
{
  "category": "recyclable" | "compostable" | "trash",
  "item": "brief description of the item",
  "confidence": 0.0 to 1.0,
  "explanation": "why this item falls into this category"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What is this item and how should it be disposed of?",
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

    // Add municipal notes if available
    const itemLower = result.item.toLowerCase();
    const locationKey = location.toLowerCase().trim();
    const locationRules = municipalRules[locationKey] || municipalRules.default;
    
    console.log("Looking up rules for location:", locationKey);
    
    for (const [key, note] of Object.entries(locationRules)) {
      if (itemLower.includes(key)) {
        result.municipalNotes = note;
        console.log("Found municipal note for:", key);
        break;
      }
    }

    console.log("Returning final result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in classify-item function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
