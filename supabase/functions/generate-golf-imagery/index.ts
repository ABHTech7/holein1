import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageGenerationRequest {
  prompt: string;
  category?: 'hero' | 'action' | 'club' | 'celebration' | 'feature';
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.log('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your Supabase Edge Function secrets.',
          imageUrl: null 
        }),
        {
          status: 200, // Return 200 so app doesn't break
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { prompt, category = 'hero', size = '1024x1024', style = 'vivid' }: ImageGenerationRequest = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Enhance prompt based on category
    let enhancedPrompt = prompt;
    
    switch (category) {
      case 'hero':
        enhancedPrompt = `${prompt}. Dramatic golf course landscape, cinematic lighting, premium golf resort atmosphere, ultra high resolution, professional photography style`;
        break;
      case 'action':
        enhancedPrompt = `${prompt}. Dynamic golf action shot, perfect moment capture, professional sports photography, high energy, ultra sharp focus`;
        break;
      case 'club':
        enhancedPrompt = `${prompt}. Elegant golf clubhouse atmosphere, premium facilities, sophisticated ambiance, architectural beauty, warm lighting`;
        break;
      case 'celebration':
        enhancedPrompt = `${prompt}. Joyful golf celebration moment, emotional victory, triumphant atmosphere, golden hour lighting, cinematic composition`;
        break;
      case 'feature':
        enhancedPrompt = `${prompt}. Clean professional golf imagery, modern design elements, premium quality, perfect for marketing materials`;
        break;
    }

    console.log(`Generating ${category} image with prompt:`, enhancedPrompt);

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: enhancedPrompt,
        n: 1,
        size: size,
        quality: 'high',
        style: style,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate image',
          details: errorData 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const imageUrl = data.data[0]?.url;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'No image URL returned from OpenAI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Image generated successfully:', imageUrl);

    return new Response(
      JSON.stringify({ 
        imageUrl,
        category,
        prompt: enhancedPrompt 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-golf-imagery function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});