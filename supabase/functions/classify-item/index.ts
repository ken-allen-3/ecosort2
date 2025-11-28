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
  "danville": {
    "pizza box": "Clean boxes in blue recycling cart. Greasy boxes and food residue go in green organics cart.",
    "plastic bag": "Not accepted curbside. Return to grocery stores or use reusable bags.",
    "glass bottle": "Place in blue recycling cart. Rinse and keep lids/caps on.",
    "food scraps": "All food waste goes in green organics cart including meat, bones, and dairy.",
    "cardboard": "Flatten and place in blue recycling cart. Remove all packing materials.",
    "styrofoam": "Not recyclable. Place in black trash cart.",
    "plastic container": "Plastics #1-7 accepted. Rinse and keep lids on.",
    "yard waste": "Place in green organics cart. Branches under 3 feet. No plastic bags.",
    "batteries": "Household batteries to Household Hazardous Waste facility. Call (925) 906-1801.",
    "electronics": "Schedule bulky item pickup or take to Dublin Transfer Station.",
  },
  "walnut creek": {
    "pizza box": "Soiled boxes in green organics cart. Clean boxes in blue recycling cart.",
    "plastic bag": "Not accepted curbside. Take to store drop-off locations.",
    "glass bottle": "Place in blue recycling cart. Rinse clean, lids optional.",
    "food scraps": "All food waste in green organics cart. Includes meat, dairy, bones, grease.",
    "cardboard": "Flatten and place in blue recycling cart. Remove tape when possible.",
    "styrofoam": "Not recyclable. Place in black trash cart.",
    "plastic container": "Plastics #1-7 accepted. Empty and rinse. Lids may stay on.",
    "yard waste": "Place in green organics cart. Branches must be under 4 feet long.",
    "batteries": "Take to Republic Services customer service center or household hazardous waste events.",
    "electronics": "Call (925) 906-6600 for bulky pickup or drop at Concord transfer station.",
  },
  "pleasanton": {
    "pizza box": "Food-soiled boxes go in green organics cart. Clean boxes in blue recycling cart.",
    "plastic bag": "Not recyclable curbside. Recycle at participating retail locations.",
    "glass bottle": "Place in blue recycling cart. Rinse and remove caps.",
    "food scraps": "All food waste accepted in green organics cart including oils and fats.",
    "cardboard": "Flatten and place in blue recycling cart. Remove non-paper materials.",
    "styrofoam": "Not recyclable in Pleasanton. Place in black trash cart.",
    "plastic container": "Plastics #1-7 accepted. Rinse clean and remove lids.",
    "yard waste": "Place in green organics cart. Branches under 3 feet and 3 inches diameter.",
    "batteries": "Never in carts. Drop off at household hazardous waste collection events.",
    "electronics": "Schedule bulky item pickup online or call (925) 417-0700.",
  },
  "livermore": {
    "pizza box": "Soiled boxes in green organics bin. Clean boxes in blue recycling bin.",
    "plastic bag": "Not accepted curbside. Return to grocery stores for recycling.",
    "glass bottle": "Place in blue recycling bin. Rinse and leave caps on.",
    "food scraps": "All food waste in green organics bin. Includes meat, dairy, and cooking oil.",
    "cardboard": "Flatten and place in blue recycling bin. Remove packing materials.",
    "styrofoam": "Not recyclable. Place in black trash bin.",
    "plastic container": "Plastics #1-7 accepted. Rinse and keep lids on containers.",
    "yard waste": "Place in green organics bin. Branches must be bundled and under 4 feet.",
    "batteries": "Take to Livermore Transfer Station or household hazardous waste events.",
    "electronics": "Schedule free bulky pickup or drop at transfer station.",
  },
  "dublin": {
    "pizza box": "Food residue in green organics cart. Clean boxes in blue recycling cart.",
    "plastic bag": "Not recyclable curbside. Return to retail drop-off locations.",
    "glass bottle": "Place in blue recycling cart. Rinse and keep caps on.",
    "food scraps": "All food waste goes in green organics cart including bones and grease.",
    "cardboard": "Flatten and place in blue recycling cart. Remove tape and labels.",
    "styrofoam": "Not recyclable. Place in black trash cart.",
    "plastic container": "Plastics #1-7 accepted. Rinse clean and leave lids on.",
    "yard waste": "Place in green organics cart. Branches under 3 feet long.",
    "batteries": "Drop off at Dublin Transfer Station. Never place in any cart.",
    "electronics": "Free curbside pickup - schedule online at www.republicservices.com",
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
  "cincinnati": {
    "pizza box": "Clean boxes can be recycled. Greasy boxes go in trash.",
    "plastic bag": "Not accepted curbside. Return to grocery stores for recycling.",
    "glass bottle": "All colors accepted in recycling cart. Rinse and leave caps/lids on.",
    "food scraps": "Not collected curbside. Consider home composting or drop-off sites.",
    "cardboard": "Flatten and place in recycling cart. Remove packing materials and tape.",
    "styrofoam": "Not recyclable in Cincinnati. Place in trash cart.",
    "plastic container": "Plastics #1-5 accepted. Rinse clean and leave lids on.",
    "yard waste": "Bundle branches or use paper bags. Set out separately from trash. 4 foot length limit.",
    "batteries": "Never in trash or recycling. Drop off at Rumpke Recycling Center or hazardous waste events.",
    "electronics": "Free curbside pickup for TVs and electronics. Call (513) 591-6000 to schedule.",
    "aluminum can": "Rinse and place in recycling cart. No need to crush.",
    "newspaper": "Bundle or place loose in recycling cart. Keep dry.",
  },
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
    const locationKey = (location || "default").toLowerCase().trim();
    const locationRules = municipalRules[locationKey] || municipalRules.default;
    
    console.log("Looking up rules for location:", locationKey);
    
    // Find the most specific matching rule
    let bestMatch = "";
    let bestMatchLength = 0;
    
    for (const [key, note] of Object.entries(locationRules)) {
      if (itemLower.includes(key) && key.length > bestMatchLength) {
        result.municipalNotes = note;
        bestMatch = key;
        bestMatchLength = key.length;
      }
    }
    
    if (bestMatch) {
      console.log("Found municipal note for:", bestMatch);
    } else {
      console.log("No specific municipal note found, using general classification");
    }

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
