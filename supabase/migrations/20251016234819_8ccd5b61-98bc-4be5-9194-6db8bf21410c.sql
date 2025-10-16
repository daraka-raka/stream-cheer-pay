-- STREAMERS TABLE
CREATE TABLE public.streamers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE CHECK (length(handle) BETWEEN 3 AND 30 AND handle ~ '^[a-z0-9_-]+$'),
  display_name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  email_verified BOOLEAN DEFAULT false,
  public_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ALERTS TABLE
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL CHECK (price_cents >= 100),
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video')),
  media_path TEXT NOT NULL,
  thumb_path TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  stripe_payment_id TEXT UNIQUE,
  amount_cents INT NOT NULL,
  fee_stripe_cents INT NOT NULL DEFAULT 0,
  fee_streala_cents INT NOT NULL DEFAULT 0,
  amount_streamer_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded', 'failed')),
  buyer_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ALERT QUEUE TABLE
CREATE TABLE public.alert_queue (
  id BIGSERIAL PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES public.streamers(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id),
  is_test BOOLEAN DEFAULT false,
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'playing', 'done', 'error')),
  enqueued_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- SETTINGS TABLE
CREATE TABLE public.settings (
  streamer_id UUID PRIMARY KEY REFERENCES public.streamers(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  overlay_image_duration_seconds INT DEFAULT 5,
  show_prices BOOLEAN DEFAULT true
);

-- USER ROLES TABLE (for admin access)
CREATE TYPE public.app_role AS ENUM ('admin', 'streamer', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'streamer',
  UNIQUE(user_id, role)
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.streamers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- STREAMERS RLS POLICIES
CREATE POLICY "Users can view their own streamer profile"
  ON public.streamers FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own streamer profile"
  ON public.streamers FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert their own streamer profile"
  ON public.streamers FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Public can view streamer profiles by handle"
  ON public.streamers FOR SELECT
  USING (true);

-- ALERTS RLS POLICIES
CREATE POLICY "Streamers can view their own alerts"
  ON public.alerts FOR SELECT
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Streamers can create their own alerts"
  ON public.alerts FOR INSERT
  WITH CHECK (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Streamers can update their own alerts"
  ON public.alerts FOR UPDATE
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Streamers can delete their own alerts"
  ON public.alerts FOR DELETE
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Public can view published alerts"
  ON public.alerts FOR SELECT
  USING (status = 'published');

-- TRANSACTIONS RLS POLICIES
CREATE POLICY "Streamers can view their own transactions"
  ON public.transactions FOR SELECT
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

-- ALERT QUEUE RLS POLICIES
CREATE POLICY "Streamers can view their own queue"
  ON public.alert_queue FOR SELECT
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service role can manage queue"
  ON public.alert_queue FOR ALL
  USING (true);

-- SETTINGS RLS POLICIES
CREATE POLICY "Streamers can view their own settings"
  ON public.settings FOR SELECT
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Streamers can update their own settings"
  ON public.settings FOR UPDATE
  USING (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

CREATE POLICY "Streamers can insert their own settings"
  ON public.settings FOR INSERT
  WITH CHECK (streamer_id IN (SELECT id FROM public.streamers WHERE auth_user_id = auth.uid()));

-- USER ROLES RLS POLICIES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- FUNCTION TO CHECK IF USER HAS ROLE
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- FUNCTION TO CREATE STREAMER PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_handle TEXT;
BEGIN
  -- Generate random handle
  random_handle := 'streamer_' || substring(md5(random()::text) from 1 for 8);
  
  -- Insert streamer profile
  INSERT INTO public.streamers (auth_user_id, email, handle, display_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    random_handle,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );
  
  -- Insert default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'streamer');
  
  -- Insert default settings
  INSERT INTO public.settings (streamer_id)
  SELECT id FROM public.streamers WHERE auth_user_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- TRIGGER TO CREATE STREAMER PROFILE ON SIGNUP
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- FUNCTION TO UPDATE UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- TRIGGERS FOR UPDATED_AT
CREATE TRIGGER update_streamers_updated_at
  BEFORE UPDATE ON public.streamers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- STORAGE BUCKET FOR ALERTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('alerts', 'alerts', true);

-- STORAGE POLICIES FOR ALERTS
CREATE POLICY "Public can view alert files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'alerts');

CREATE POLICY "Authenticated users can upload alert files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'alerts' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.streamers WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own alert files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'alerts' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.streamers WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own alert files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'alerts' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.streamers WHERE auth_user_id = auth.uid()
    )
  );

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_streamers_auth_user_id ON public.streamers(auth_user_id);
CREATE INDEX idx_streamers_handle ON public.streamers(handle);
CREATE INDEX idx_streamers_public_key ON public.streamers(public_key);
CREATE INDEX idx_alerts_streamer_id ON public.alerts(streamer_id);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_transactions_streamer_id ON public.transactions(streamer_id);
CREATE INDEX idx_transactions_stripe_payment_id ON public.transactions(stripe_payment_id);
CREATE INDEX idx_alert_queue_streamer_id ON public.alert_queue(streamer_id);
CREATE INDEX idx_alert_queue_status ON public.alert_queue(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);