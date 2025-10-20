-- Update existing handles based on display_name
UPDATE streamers 
SET handle = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(display_name, '[áàãâä]', 'a', 'gi'),
            '[éèêë]', 'e', 'gi'
          ),
          '[íìîï]', 'i', 'gi'
        ),
        '[óòõôö]', 'o', 'gi'
      ),
      '[úùûü]', 'u', 'gi'
    ),
    '[^a-z0-9\s]', '', 'gi'
  )
)
WHERE handle LIKE 'streamer_%';