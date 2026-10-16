-- Step 1 of removing the landing page's "Try the demo" account: rebuild the
-- write policies without the demo-visitor block. The table and function stay
-- for now because the currently deployed app still calls is_demo_visitor();
-- they are dropped in a follow-up migration after the next publish.

DROP POLICY "Own items insert" ON public.items;
CREATE POLICY "Own items insert" ON public.items FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY "Own items update" ON public.items;
CREATE POLICY "Own items update" ON public.items FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY "Own items delete" ON public.items;
CREATE POLICY "Own items delete" ON public.items FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY "Own annotations insert" ON public.annotations;
CREATE POLICY "Own annotations insert" ON public.annotations FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id) AND EXISTS (SELECT 1 FROM items i WHERE i.id = annotations.item_id AND i.user_id = auth.uid()));
DROP POLICY "Own annotations update" ON public.annotations;
CREATE POLICY "Own annotations update" ON public.annotations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY "Own annotations delete" ON public.annotations;
CREATE POLICY "Own annotations delete" ON public.annotations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.demo_visitors IS 'DEPRECATED: the landing-page demo visitor was removed; pending drop after next publish';