-- Enable extensions needed for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Allow the system user to insert daily stories (bypass RLS)
CREATE POLICY "System can insert daily stories"
ON public.posts
FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Allow system to delete its own stories (for admin management)
CREATE POLICY "System stories can be deleted by admins"
ON public.posts
FOR DELETE
USING (
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update story images
CREATE POLICY "Admins can update daily stories"
ON public.posts
FOR UPDATE
USING (
  user_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND has_role(auth.uid(), 'admin'::app_role)
);