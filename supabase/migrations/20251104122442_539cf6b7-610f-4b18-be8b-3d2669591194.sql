-- Fix storage bucket security: Add file size limits and MIME type restrictions
-- This prevents storage exhaustion DoS and malware hosting

UPDATE storage.buckets
SET 
  file_size_limit = 104857600,  -- 100MB limit (sufficient for alert media: images, audio, video)
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
WHERE name = 'alerts';