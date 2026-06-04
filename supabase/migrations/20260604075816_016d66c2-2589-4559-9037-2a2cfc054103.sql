
CREATE TABLE public.slang_dictionary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  language TEXT NOT NULL DEFAULT 'sheng',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(word, language)
);

GRANT SELECT ON public.slang_dictionary TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.slang_dictionary TO authenticated;
GRANT ALL ON public.slang_dictionary TO service_role;

ALTER TABLE public.slang_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slang"
  ON public.slang_dictionary FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert slang"
  ON public.slang_dictionary FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update slang"
  ON public.slang_dictionary FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete slang"
  ON public.slang_dictionary FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_slang_dictionary_updated_at
  BEFORE UPDATE ON public.slang_dictionary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_slang_dictionary_language ON public.slang_dictionary(language);
