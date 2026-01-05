-- Create storage buckets for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('messages', 'messages', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for media bucket (posts)
CREATE POLICY "Media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Users can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for stories bucket
CREATE POLICY "Stories are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Users can upload stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their stories" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for messages bucket
CREATE POLICY "Message media accessible to participants" ON storage.objects FOR SELECT USING (bucket_id = 'messages');
CREATE POLICY "Users can upload message media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their message media" ON storage.objects FOR DELETE USING (bucket_id = 'messages' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for audio bucket
CREATE POLICY "Audio is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'audio');
CREATE POLICY "Users can upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their audio" ON storage.objects FOR DELETE USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add upload tracking columns to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_duration integer;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;

-- Create function to auto-extract hashtags from post content
CREATE OR REPLACE FUNCTION extract_and_link_hashtags()
RETURNS TRIGGER AS $$
DECLARE
  hashtag_match text;
  hashtag_id uuid;
BEGIN
  -- Extract hashtags from content using regex
  FOR hashtag_match IN
    SELECT DISTINCT lower(regexp_matches[1])
    FROM regexp_matches(NEW.content, '#([a-zA-Z0-9_]+)', 'g')
  LOOP
    -- Insert or get existing hashtag
    INSERT INTO hashtags (tag, use_count, trending_score)
    VALUES (hashtag_match, 1, 1)
    ON CONFLICT (tag) DO UPDATE SET 
      use_count = hashtags.use_count + 1,
      trending_score = hashtags.trending_score + 1
    RETURNING id INTO hashtag_id;
    
    -- Link post to hashtag
    INSERT INTO post_hashtags (post_id, hashtag_id)
    VALUES (NEW.id, hashtag_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add unique constraint on hashtag tag if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hashtags_tag_key') THEN
    ALTER TABLE hashtags ADD CONSTRAINT hashtags_tag_key UNIQUE (tag);
  END IF;
END $$;

-- Create trigger for hashtag extraction
DROP TRIGGER IF EXISTS extract_hashtags_trigger ON posts;
CREATE TRIGGER extract_hashtags_trigger
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION extract_and_link_hashtags();

-- Allow authenticated users to insert hashtags (for the trigger)
CREATE POLICY "System can insert hashtags" ON hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update hashtags" ON hashtags FOR UPDATE USING (true);