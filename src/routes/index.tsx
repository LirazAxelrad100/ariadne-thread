import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ariadne’s Thread — AI that finds the thread in the maze of your mind" },
      { name: "description", content: "A private stream of your thoughts and the things you read, with AI that finds the threads between them." },
      { property: "og:title", content: "Ariadne’s Thread" },
      { property: "og:description", content: "AI that finds the thread in the maze of your mind." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://ariadne-thread.lovable.app/og-card.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://ariadne-thread.lovable.app/og-card.jpg" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || !alive) return;
      // Only go on if the server still knows this account. A login left over
      // from one we removed would bounce off /write straight back here.
      const { data: me, error } = await supabase.auth.getUser();
      if (error || !me.user) {
        if (!error || error.name !== "AuthRetryableFetchError") {
          await supabase.auth.signOut();
          queryClient.clear();
        }
        return;
      }
      if (alive) navigate({ to: "/write", replace: true });
    })();
    return () => { alive = false; };
  }, [navigate, queryClient]);

  return <LandingPage />;
}
