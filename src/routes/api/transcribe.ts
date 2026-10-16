import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 24 * 1024 * 1024;

/** Speech-to-text for the Write composer. Audio is forwarded and never stored. */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        if (token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { data: claims, error } = await sb.auth.getClaims(token);
        if (error || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

        const len = Number(request.headers.get("content-length") ?? 0);
        if (len > MAX_BYTES) return new Response("Recording too long", { status: 413 });
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || !file.size || file.size > MAX_BYTES || !file.type.startsWith("audio/"))
          return new Response("Invalid recording", { status: 400 });

        const out = new FormData();
        out.append("model", "openai/gpt-transcribe");
        out.append("file", file, file.name);
        out.append("response_format", "json");
        out.append("stream", "true");
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`, "X-Lovable-AIG-SDK": "fetch" },
            body: out,
            signal: request.signal,
          });
          return new Response(res.body, {
            status: res.status,
            headers: { "content-type": res.headers.get("content-type") ?? "text/plain" },
          });
        } catch (e) {
          if ((e as Error).name === "AbortError") return new Response(null, { status: 499 });
          throw e;
        }
      },
    },
  },
});
