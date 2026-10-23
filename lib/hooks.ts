"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { api, ApiError } from "./api";

/** GET a backend path with loading, error and retry. Pass null to skip. */
export function useApi<T>(path: string | null, config?: SWRConfiguration<T, ApiError>) {
  const { data, error, isLoading, mutate } = useSWR<T, ApiError>(path, (p: string) => api<T>(p), {
    revalidateOnFocus: false,
    ...config,
  });
  return { data, error, loading: isLoading, reload: () => mutate() , mutate };
}
