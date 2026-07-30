import { QueryClient } from "@tanstack/react-query";

export function createPulseQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { // TODO: Review these parameters ensure they fit our use case
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 30 * 1000,
      },
    },
  });
}
