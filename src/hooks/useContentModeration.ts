import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ModerationResult {
  isApproved: boolean;
  flaggedCategories: string[];
  confidence: number;
  suggestedAction: 'allow' | 'warn' | 'block';
  reason?: string;
}

export const useContentModeration = () => {
  const [moderating, setModerating] = useState(false);
  const { toast } = useToast();

  const moderateContent = useCallback(async (
    content: string,
    contentType: 'text' | 'comment' | 'message' = 'text'
  ): Promise<ModerationResult> => {
    setModerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('moderate-content', {
        body: { content, contentType }
      });

      if (error) {
        console.error('Moderation error:', error);
        // Return allow on error to not block users
        return {
          isApproved: true,
          flaggedCategories: [],
          confidence: 0,
          suggestedAction: 'allow'
        };
      }

      return data as ModerationResult;
    } catch (err) {
      console.error('Failed to moderate content:', err);
      return {
        isApproved: true,
        flaggedCategories: [],
        confidence: 0,
        suggestedAction: 'allow'
      };
    } finally {
      setModerating(false);
    }
  }, []);

  const checkAndWarn = useCallback(async (
    content: string,
    contentType: 'text' | 'comment' | 'message' = 'text'
  ): Promise<boolean> => {
    const result = await moderateContent(content, contentType);

    if (result.suggestedAction === 'block') {
      toast({
        title: 'Content Blocked',
        description: result.reason || 'Your content violates our community guidelines.',
        variant: 'destructive'
      });
      return false;
    }

    if (result.suggestedAction === 'warn') {
      toast({
        title: 'Content Warning',
        description: 'Your content may violate community guidelines. Please review before posting.',
        variant: 'default'
      });
    }

    return true;
  }, [moderateContent, toast]);

  return {
    moderateContent,
    checkAndWarn,
    moderating
  };
};