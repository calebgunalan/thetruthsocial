import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const POSTS_PER_PAGE = 20;

export interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  post_type: string;
  likes_count: number;
  comments_count: number;
  repost_count: number | null;
  is_pinned: boolean | null;
  thumbnail_url: string | null;
  video_duration: number | null;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

interface FetchPostsParams {
  pageParam?: string;
}

const fetchPosts = async ({ pageParam }: FetchPostsParams) => {
  let query = supabase
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
    .order('created_at', { ascending: false })
    .limit(POSTS_PER_PAGE);

  if (pageParam) {
    query = query.lt('created_at', pageParam);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
};

export const useInfinitePosts = () => {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite'],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < POSTS_PER_PAGE) return undefined;
      return lastPage[lastPage.length - 1]?.created_at;
    },
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (previously cacheTime)
  });
};

export const useUserPosts = (userId: string) => {
  return useQuery({
    queryKey: ['posts', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPost: {
      user_id: string;
      content: string;
      post_type: string;
      media_type?: string | null;
      media_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('posts')
        .insert(newPost)
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      // Check if already liked
      const { data: existing } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Unlike
        await supabase.from('likes').delete().eq('id', existing.id);
        return { action: 'unliked' };
      } else {
        // Like
        await supabase.from('likes').insert({ post_id: postId, user_id: userId });
        return { action: 'liked' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};