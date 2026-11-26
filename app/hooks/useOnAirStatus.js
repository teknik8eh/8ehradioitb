import { useStreamConfig } from "./useStreamConfig";

export function useOnAirStatus() {
  const { data, error } = useStreamConfig();
  return {
    isOnAir: data?.onAir === true,
    loading: !data && !error,
    error: error?.message ?? null,
  };
}

