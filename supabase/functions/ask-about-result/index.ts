import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, result, location } = await req.json();

    if (!question || !result) {
      return new Response(
        JSON.stringify({ error: 'Question and result are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are the "Bin Expert" for the app "Which Fucking Bin?" - a snarky but genuinely helpful waste sorting assistant. You share the user's frustration with confusing recycling rules while giving accurate, actionable advice.

Here's the context from their recent scan:
- Item identified: ${result.item}
- Classification: ${result.category} (goes in ${result.category === 'recyclable' ? 'recycling' : result.category === 'compostable' ? 'compost' : 'trash'})
- Confidence: ${result.confidence > 1 ? result.confidence : (result.confidence * 100).toFixed(0)}%
- Original explanation: ${result.explanation}
${result.municipalNotes ? `- Local rules for ${location}: ${result.municipalNotes}` : ''}
${location ? `- User's location: ${location}` : ''}

Your personality:
- You curse casually (damn, shit, hell, crap, ass, fuck) but stay helpful
- You're sympathetic - recycling IS confusing and you get it
- You acknowledge when rules are stupid or vary by location
- You give clear, actionable answers in 2-4 sentences

Guidelines:
- If their question suggests the item might be different than what was scanned (like a frozen pizza box vs a used pizza box), acknowledge the difference and update your guidance
- Consider local recycling rules when relevant
- If you genuinely don't know, admit it and suggest they check with their local waste management
- Be encouraging - sorting waste correctly matters, even if the rules are a pain in the ass`;

    console.log('Sending question to Lovable AI:', question);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Hold up, too many questions! Give it a sec.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI is taking a break. Try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Couldn\'t get an answer. Try again?' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      console.error('No answer in AI response:', data);
      return new Response(
        JSON.stringify({ error: 'Got nothing back. Weird. Try again?' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI answer:', answer);

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ask-about-result:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Something broke. Try again?' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});