import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/write", replace: true });
    });
  }, [navigate]);

  return <LandingPage />;
}
