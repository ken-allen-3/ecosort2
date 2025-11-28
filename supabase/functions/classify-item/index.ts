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
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, location } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Classifying item for location:", location);

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
      throw new Error(`AI classification failed: ${response.status}`);
    }

    const aiData = await response.json();
    console.log("AI response:", aiData);

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response
    const result = JSON.parse(content);

    // Add municipal notes if available
    const itemLower = result.item.toLowerCase();
    const locationRules = municipalRules[location.toLowerCase()] || municipalRules.default;
    
    for (const [key, note] of Object.entries(locationRules)) {
      if (itemLower.includes(key)) {
        result.municipalNotes = note;
        break;
      }
    }

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
