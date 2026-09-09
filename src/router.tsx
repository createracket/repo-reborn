import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Created per request so SSR never leaks one visitor's cache into another's.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Revisiting a page shows the cached result instantly and refreshes
        // quietly in the background instead of blanking out and refetching.
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
