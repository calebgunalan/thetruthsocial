import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Hashtag {
  id: string;
  tag: string;
  use_count: number;
  trending_score: number;
  created_at: string;
}

export const useTrendingHashtags = (limit = 10) => {
  return useQuery({
    queryKey: ['hashtags', 'trending', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('trending_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as Hashtag[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - hashtags don't change that often
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};

export const useHashtagPosts = (tag: string) => {
  return useQuery({
    queryKey: ['posts', 'hashtag', tag],
    queryFn: async () => {
      // First get hashtag ID
      const { data: hashtag, error: hashError } = await supabase
        .from('hashtags')
        .select('id')
        .eq('tag', tag.toLowerCase())
        .single();

      if (hashError || !hashtag) return [];

      // Get post IDs with this hashtag
      const { data: postHashtags, error: phError } = await supabase
        .from('post_hashtags')
        .select('post_id')
        .eq('hashtag_id', hashtag.id);

      if (phError || !postHashtags.length) return [];

      const postIds = postHashtags.map(ph => ph.post_id);

      // Get posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      return posts || [];
    },
    enabled: !!tag,
    staleTime: 1000 * 30,
  });
};