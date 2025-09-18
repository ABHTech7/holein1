import { supabase } from "@/integrations/supabase/client";

export type ImageCategory = 'hero' | 'action' | 'club' | 'celebration' | 'feature';

export interface GenerateImageOptions {
  prompt: string;
  category?: ImageCategory;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
}

export interface GeneratedImage {
  imageUrl: string | null;
  category: ImageCategory;
  prompt: string;
  error?: string;
}

/**
 * Generate custom golf imagery using OpenAI's image generation
 */
export const generateGolfImage = async (options: GenerateImageOptions): Promise<GeneratedImage> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-golf-imagery', {
      body: {
        prompt: options.prompt,
        category: options.category || 'hero',
        size: options.size || '1024x1024',
        style: options.style || 'vivid'
      }
    });

    if (error) {
      console.error('Error calling generate-golf-imagery function:', error);
      return {
        imageUrl: null,
        category: options.category || 'hero',
        prompt: options.prompt,
        error: error.message || 'Failed to generate image'
      };
    }

    return {
      imageUrl: data.imageUrl,
      category: data.category,
      prompt: data.prompt,
      error: data.error
    };

  } catch (error) {
    console.error('Error generating golf image:', error);
    return {
      imageUrl: null,
      category: options.category || 'hero',
      prompt: options.prompt,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Generate multiple images for different categories
 */
export const generateImageSet = async (basePrompt: string): Promise<Record<ImageCategory, GeneratedImage>> => {
  const categories: ImageCategory[] = ['hero', 'action', 'club', 'celebration', 'feature'];
  
  const promises = categories.map(async (category) => {
    const categoryPrompt = getCategoryPrompt(basePrompt, category);
    const result = await generateGolfImage({
      prompt: categoryPrompt,
      category,
      size: category === 'hero' ? '1792x1024' : '1024x1024'
    });
    
    return [category, result] as [ImageCategory, GeneratedImage];
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results) as Record<ImageCategory, GeneratedImage>;
};

/**
 * Get category-specific prompt variations
 */
const getCategoryPrompt = (basePrompt: string, category: ImageCategory): string => {
  const categoryPrompts = {
    hero: `${basePrompt} - panoramic golf course view with dramatic sky`,
    action: `${basePrompt} - golfer in mid-swing action shot`,
    club: `${basePrompt} - elegant golf clubhouse and facilities`,
    celebration: `${basePrompt} - golfer celebrating a perfect shot`,
    feature: `${basePrompt} - clean professional golf equipment or technology`
  };

  return categoryPrompts[category] || basePrompt;
};

/**
 * Predefined prompts for common golf imagery needs
 */
export const golfImagePrompts = {
  heroBackgrounds: [
    "Stunning championship golf course at golden hour with pristine fairways",
    "Dramatic par 3 hole with water hazard and mountain backdrop",
    "Majestic golf course aerial view with clubhouse in distance",
    "Perfect golf green with flag pin against sunset sky"
  ],
  
  actionShots: [
    "Professional golfer executing perfect hole-in-one shot",
    "Dynamic golf swing captured at impact with ball in flight",
    "Golfer celebrating successful putt on championship green",
    "Precise golf shot over water hazard with perfect form"
  ],
  
  clubAtmosphere: [
    "Luxurious golf clubhouse interior with trophy displays",
    "Elegant golf pro shop with premium equipment display",
    "Sophisticated golf club dining area with course views",
    "Professional golf instruction area with modern facilities"
  ],
  
  celebrations: [
    "Golfer jumping in celebration after hole-in-one achievement",
    "Golf partners celebrating successful tournament win",
    "Trophy presentation ceremony at prestigious golf event",
    "Emotional hole-in-one celebration with crowd cheering"
  ]
};