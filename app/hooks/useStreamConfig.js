"use client";

import { createContext, createElement, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { watchStreamConfig } from "@/lib/stream-config-client";
import { subscribePusherChannel, unsubscribePusherChannel } from "./usePusherClient";

const StreamConfigContext = createContext({ data: undefined, error: undefined });

async function fetchStreamConfig(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Failed to fetch stream config");
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export function StreamConfigProvider({ children }) {
  const enabled = usePathname() !== "/studio-link";
  const inFlight = useRef(null);
  const { data, error, mutate } = useSWR("/api/stream-config", fetchStreamConfig, {
    revalidateOnMount: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (!enabled) return;

    const subscription = subscribePusherChannel("live-status");
    const stopWatching = watchStreamConfig(() => {
      if (!inFlight.current) {
        inFlight.current = mutate().finally(() => {
          inFlight.current = null;
        });
      }
      return inFlight.current;
    }, subscription?.channel);

    return () => {
      stopWatching();
      if (subscription) unsubscribePusherChannel("live-status");
    };
  }, [enabled, mutate]);

  return createElement(StreamConfigContext.Provider, { value: { data, error } }, children);
}

export function useStreamConfig() {
  return useContext(StreamConfigContext);
}
