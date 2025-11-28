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
    console.log('IP-based geolocation request');

    // Using ipapi.co free service (no API key required for basic usage)
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'User-Agent': 'EcoSort-Waste-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`IP geolocation API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('IP geolocation response:', data);

    // Return city name if available
    const city = data.city || data.region || 'Unknown location';
    
    return new Response(JSON.stringify({ city }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('IP geolocation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
