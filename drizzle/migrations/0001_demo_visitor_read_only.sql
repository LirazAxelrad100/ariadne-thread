CREATE TABLE public.demo_visitors (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_visitors TO authenticated;
GRANT ALL ON public.demo_visitors TO service_role;
ALTER TABLE public.demo_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own demo visitor row" ON public.demo_visitors FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_demo_visitor() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.demo_visitors WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.is_demo_visitor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_demo_visitor() TO authenticated;

DROP POLICY "Own items insert" ON public.items;
CREATE POLICY "Own items insert" ON public.items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT public.is_demo_visitor());
DROP POLICY "Own items update" ON public.items;
CREATE POLICY "Own items update" ON public.items FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_demo_visitor())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_demo_visitor());
DROP POLICY "Own items delete" ON public.items;
CREATE POLICY "Own items delete" ON public.items FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_demo_visitor());

DROP POLICY "Own annotations insert" ON public.annotations;
CREATE POLICY "Own annotations insert" ON public.annotations FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND EXISTS (SELECT 1 FROM items i WHERE i.id = annotations.item_id AND i.user_id = auth.uid()) AND NOT public.is_demo_visitor());
DROP POLICY "Own annotations update" ON public.annotations;
CREATE POLICY "Own annotations update" ON public.annotations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_demo_visitor())
  WITH CHECK (user_id = auth.uid() AND NOT public.is_demo_visitor());
DROP POLICY "Own annotations delete" ON public.annotations;
CREATE POLICY "Own annotations delete" ON public.annotations FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND NOT public.is_demo_visitor());