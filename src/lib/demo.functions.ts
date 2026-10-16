import { createServerFn } from "@tanstack/react-start";

// The landing page's "Try the demo" signs the visitor into a read-only demo
// account. The password lives in the DEMO_VISITOR_PASSWORD secret and never
// ships to the browser: the sign-in runs here, and only the session comes back.
// The account itself is listed in public.demo_visitors, which is what the
// database policies use to block every write except a synthesis.
const DEMO_EMAIL = "demo-visitor@ariadne-thread.app";

export type DemoSession =
  | { ok: true; session: Record<string, unknown> }
  | { ok: false };

export const startDemoSession = createServerFn({ method: "POST" }).handler(
  async (): Promise<DemoSession> => {
    const password = process.env["DEMO_VISITOR_PASSWORD"];
    if (!password) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password,
    });
    if (error || !data.session) return { ok: false };

    return { ok: true, session: data.session as unknown as Record<string, unknown> };
  },
);
