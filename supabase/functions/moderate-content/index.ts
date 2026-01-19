import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationResult {
  isApproved: boolean;
  flaggedCategories: string[];
  confidence: number;
  suggestedAction: 'allow' | 'warn' | 'block';
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, contentType = 'text' } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Lovable AI Gateway for content moderation
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a content moderation AI. Analyze the following ${contentType} content and determine if it should be allowed on a social media platform.

Check for:
- Hate speech or discrimination
- Violence or threats
- Sexual content
- Harassment or bullying
- Spam or scams
- Misinformation
- Self-harm or dangerous content

Respond in JSON format only:
{
  "isApproved": boolean,
  "flaggedCategories": ["category1", "category2"],
  "confidence": number between 0 and 1,
  "suggestedAction": "allow" | "warn" | "block",
  "reason": "brief explanation if flagged"
}`
          },
          {
            role: 'user',
            content: `Analyze this content for moderation:\n\n${content}`
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from AI');
    }

    // Parse AI response - extract JSON from potential markdown code blocks
    let moderationResult: ModerationResult;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      moderationResult = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      // Default to allowing content if parsing fails
      moderationResult = {
        isApproved: true,
        flaggedCategories: [],
        confidence: 0.5,
        suggestedAction: 'allow',
        reason: 'Unable to parse moderation result'
      };
    }

    return new Response(
      JSON.stringify(moderationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Moderation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        isApproved: true, // Default to allowing on error
        suggestedAction: 'allow'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});