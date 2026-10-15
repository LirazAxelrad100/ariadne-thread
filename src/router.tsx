import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // The page itself never scrolls (only .stream does), so restoring the
    // window position after a route swap only fights the views' own
    // scroll-to-top. Keep it off.
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
