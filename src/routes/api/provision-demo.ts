import { createFileRoute } from "@tanstack/react-router";

// One-off: creates the read-only landing-page demo visitor account.
// Gated to the two owner accounts, then this file is deleted.
const ALLOWED = new Set(["lirazaxelrad@gmail.com", "lirazaxelrad2@gmail.com"]);
const DEMO_EMAIL = "demo-visitor@ariadne-thread.app";

export const Route = createFileRoute("/api/provision-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") || "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return Response.json({ ok: false, error: "no token" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: who, error: whoErr } = await supabaseAdmin.auth.getUser(token);
        if (whoErr || !who.user || !ALLOWED.has(who.user.email || "")) {
          return Response.json({ ok: false, error: "not allowed" }, { status: 403 });
        }

        const password = process.env["DEMO_VISITOR_PASSWORD"];
        if (!password) return Response.json({ ok: false, error: "secret missing" }, { status: 500 });

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: DEMO_EMAIL,
          password,
          email_confirm: true,
        });
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        return Response.json({ ok: true, userId: data.user.id });
      },
    },
  },
});
