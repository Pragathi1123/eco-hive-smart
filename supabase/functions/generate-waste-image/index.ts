import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { category, productName, subcategory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const focusText = productName
      ? `Focus on ${productName}${subcategory ? ` (${subcategory})` : ''}.`
      : 'Focus on the specific item and its packaging.';

    const prompts: Record<string, string> = {
      Recyclable:
        `${focusText} Photorealistic close-up showing the item/packaging being correctly placed into a BLUE recycling bin. Emphasize clean, empty, dry materials (plastic bottles, cans, paper, cardboard). Modern, bright environment, sustainability theme. Ultra high resolution, 16:9 aspect ratio`,
      Compostable:
        `${focusText} Photorealistic image of organic scraps being placed into a BROWN/GREEN compost bin. Show fruit peels, veggie scraps, coffee grounds. Natural garden setting, eco-friendly vibe. Ultra high resolution, 16:9 aspect ratio`,
      'E-Waste':
        `${focusText} Photorealistic image of an electronic device being deposited at a designated E-WASTE collection point (no regular bins). Modern tech recycling station. Ultra high resolution, 16:9 aspect ratio`,
    };

    console.log('Generating image for category:', category, 'product:', productName);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompts[category] || prompts['E-Waste'],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image URL in response');
    }

    console.log('Successfully generated image');

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-waste-image function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
