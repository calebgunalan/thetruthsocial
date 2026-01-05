-- Fix function search path for extract_and_link_hashtags
CREATE OR REPLACE FUNCTION public.extract_and_link_hashtags()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    INSERT INTO public.hashtags (tag, use_count, trending_score)
    VALUES (hashtag_match, 1, 1)
    ON CONFLICT (tag) DO UPDATE SET 
      use_count = public.hashtags.use_count + 1,
      trending_score = public.hashtags.trending_score + 1
    RETURNING id INTO hashtag_id;
    
    -- Link post to hashtag
    INSERT INTO public.post_hashtags (post_id, hashtag_id)
    VALUES (NEW.id, hashtag_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;