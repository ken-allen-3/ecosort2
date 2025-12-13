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
    const { item, location } = await req.json();
    
    // Validate inputs
    if (!item || typeof item !== 'string' || item.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Item description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Location is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate item length
    if (item.trim().length > 200) {
      return new Response(
        JSON.stringify({ error: "Keep the item description under 200 characters" }),
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
    const itemDescription = item.trim();
    console.log("Classifying item by text:", itemDescription, "for location:", cityName);

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
  "item": "the item the user described (cleaned up if needed)",
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

For reasoning, provide 2-4 short steps explaining your logic.

IMPORTANT: The user is describing an item by text, not showing a photo. Be helpful even if the description is vague - ask clarifying details in your explanation if the answer depends on specifics (e.g., "If it's the greasy part, trash. Clean cardboard? Recycle that shit.").`,
          },
          {
            role: "user",
            content: `I'm in ${cityName}. Which fucking bin does this go in: ${itemDescription}`,
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
    console.log("AI response received for text classification");

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error("No content in AI response");
      throw new Error("No response from AI");
    }

    // Parse the JSON response
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
      console.error("JSON parse error:", parseError, "Content:", jsonString);
      throw new Error("Invalid response format from AI");
    }

    // Validate result structure
    if (!result.category || !result.item) {
      console.error("Invalid result structure:", result);
      throw new Error("Invalid classification result");
    }

    // Ensure category is valid
    if (!["recyclable", "compostable", "trash"].includes(result.category)) {
      console.error("Invalid category:", result.category);
      result.category = "trash"; // Default to trash if invalid
    }

    // Add disclaimer
    result.disclaimer = `Rules vary by city. Double-check with ${cityName}'s waste management if unsure.`;

    console.log("Text classification successful:", result.item, "->", result.category);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in classify-text function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Classification failed" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
