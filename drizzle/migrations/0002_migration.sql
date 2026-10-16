CREATE OR REPLACE FUNCTION public.insert_synthesis(p_body text, p_title text, p_item_date date, p_created_at timestamp with time zone, p_synthesis jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'must be signed in'; end if;
  insert into public.items (user_id, type, writer, title, body, is_synthesis, synthesis, item_date, created_at)
  values (v_user, 'note', 'AI', p_title, p_body, true, p_synthesis, coalesce(p_created_at, now()), coalesce(p_created_at, now()))
  returning id into v_id;
  return v_id;
end;
$function$;