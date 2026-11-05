import { QueryClient } from "@tanstack/react-query";

export function createPulseQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 30 * 1000,
      },
    },
  });
}
