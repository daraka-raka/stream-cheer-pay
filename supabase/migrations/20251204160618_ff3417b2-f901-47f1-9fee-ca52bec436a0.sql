-- Allow public read access to streamer profiles for the public page
CREATE POLICY "Public can view streamer profiles"
ON public.streamers
FOR SELECT
TO anon, authenticated
USING (true);