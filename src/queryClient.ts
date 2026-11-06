import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Retry only what might succeed next time; a 404 or 400 will not
        retry: (failures, error) => failures < 2 && (!(error instanceof ApiError) || error.retryable),
        refetchOnWindowFocus: false,
      },
      // Mutations are never retried automatically; the cart retries an order explicitly with the same key
      mutations: { retry: false },
    },
  });
}
