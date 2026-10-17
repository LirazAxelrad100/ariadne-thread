import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Ariadne’s Thread" },
      { name: "description", content: "AI that finds the thread in the maze of your mind." },
      { property: "og:title", content: "Ariadne’s Thread" },
      { property: "og:description", content: "AI that finds the thread in the maze of your mind." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#f0f3f7" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@300;400;500&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/icon-mark.svg?v=3" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icon-16.png?v=3" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png?v=3" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/icon-48.png?v=3" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico?v=3" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Name this tab so the bookmarklet's window.open(…, "ariadne") reuses it.
  useEffect(() => {
    if (window.top === window) window.name = "ariadne";
    // Lets phones install the app so it appears in the Share menu. Not in the
    // editor preview iframe or dev, where a worker would serve stale pages.
    const inIframe = window.top !== window;
    const preview = /id-preview--|lovableproject\.com|localhost/.test(location.hostname);
    if ("serviceWorker" in navigator && !inIframe && !preview) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Relay bookmarklet captures to this tab (Chrome won't target an open tab
  // by window name) and keep a heartbeat so the capture tab knows we exist.
  // The capture tab itself is excluded — it must never take its own capture.
  useEffect(() => {
    const onCapture = () => location.pathname.startsWith("/capture");
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("ariadne-tabs");
      bc.onmessage = (e) => {
        if (e.data !== "ariadne:incoming" || onCapture()) return;
        try { bc?.postMessage("ariadne:claimed"); } catch { /* gone */ }
        window.location.assign("/write");
      };
    } catch { /* no BroadcastChannel */ }
    const beat = () => {
      if (onCapture()) return;
      try { localStorage.setItem("ariadne:hb", String(Date.now())); } catch { /* private mode */ }
    };
    beat();
    const t = window.setInterval(beat, 25000);
    return () => { try { bc?.close(); } catch { /* closed */ } window.clearInterval(t); };
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
