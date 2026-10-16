import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// True for the landing page's read-only demo account. The database answers —
// public.is_demo_visitor() reads public.demo_visitors, which only the backend
// can write to — so this cannot be faked from the browser.
export function demoModeQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: ["demoMode", userId ?? "none"],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_demo_visitor");
      return data === true;
    },
  });
}

export function useDemoMode(userId: string | undefined) {
  return useQuery(demoModeQueryOptions(userId));
}
