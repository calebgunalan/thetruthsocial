import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

export const useProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

export const useProfileByUsername = (username: string) => {
  return useQuery({
    queryKey: ['profile', 'username', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!username,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: Partial<Omit<Profile, 'id' | 'created_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      followerId, 
      followingId 
    }: { 
      followerId: string; 
      followingId: string 
    }) => {
      // Check if already following
      const { data: existing } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      if (existing) {
        // Unfollow
        await supabase.from('follows').delete().eq('id', existing.id);
        return { action: 'unfollowed' };
      } else {
        // Follow
        await supabase.from('follows').insert({ 
          follower_id: followerId, 
          following_id: followingId 
        });
        return { action: 'followed' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

export const useFollowStatus = (followerId: string | undefined, followingId: string) => {
  return useQuery({
    queryKey: ['follows', followerId, followingId],
    queryFn: async () => {
      if (!followerId) return false;
      
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      return !!data;
    },
    enabled: !!followerId && !!followingId,
    staleTime: 1000 * 30,
  });
};

export const useFollowerCount = (userId: string) => {
  return useQuery({
    queryKey: ['followers', 'count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
};

export const useFollowingCount = (userId: string) => {
  return useQuery({
    queryKey: ['following', 'count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
  });
};