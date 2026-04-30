-- Create activity_rsvps table for tracking user RSVPs to activities
CREATE TABLE IF NOT EXISTS public.activity_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_rsvps_activity ON public.activity_rsvps(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_rsvps_user ON public.activity_rsvps(user_id);

ALTER TABLE public.activity_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSVPs"
  ON public.activity_rsvps FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own RSVP"
  ON public.activity_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own RSVP"
  ON public.activity_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function to keep activities.attendees in sync
CREATE OR REPLACE FUNCTION public.update_activity_attendees_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.activities SET attendees = attendees + 1, updated_at = now() WHERE id = NEW.activity_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.activities SET attendees = GREATEST(attendees - 1, 0), updated_at = now() WHERE id = OLD.activity_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_rsvps_count ON public.activity_rsvps;
CREATE TRIGGER trg_activity_rsvps_count
  AFTER INSERT OR DELETE ON public.activity_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_activity_attendees_count();

-- Allow authenticated users to update activities.attendees via the trigger (already SECURITY DEFINER, so OK)