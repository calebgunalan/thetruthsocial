import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: 'text' | 'voice' | 'location' | 'media';
  media_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  self_destruct_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  name: string | null;
  chat_type: 'direct' | 'group' | 'secret';
  avatar_url: string | null;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export const useConversations = (userId: string) => {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations (
            id,
            name,
            chat_type,
            avatar_url,
            is_secret,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data?.map(p => p.conversations).filter(Boolean) || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
};

export const useMessages = (conversationId: string) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['messages', conversationId],
            (old: Message[] | undefined) => {
              if (!old) return [payload.new as Message];
              return [...old, payload.new as Message];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
    staleTime: 0, // Always fetch fresh for real-time messaging
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      conversation_id: string;
      sender_id: string;
      content?: string;
      message_type?: 'text' | 'voice' | 'location' | 'media';
      media_url?: string;
      location_lat?: number;
      location_lng?: number;
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...message,
          message_type: message.message_type || 'text',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Update conversation's updated_at
      supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', data.conversation_id);
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      chatType,
      participantIds,
    }: {
      name?: string;
      chatType: 'direct' | 'group' | 'secret';
      participantIds: string[];
    }) => {
      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name,
          chat_type: chatType,
          is_secret: chatType === 'secret',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participants = participantIds.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
      }));

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) throw partError;

      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};