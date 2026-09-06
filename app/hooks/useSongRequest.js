"use client";
import { useContext } from "react";
import { SongRequestContext } from "@/app/components/song-request/SongRequestProvider";

export function useSongRequest() {
  const ctx = useContext(SongRequestContext);
  if (!ctx) {
    throw new Error("useSongRequest harus dipakai di dalam SongRequestProvider");
  }
  return ctx;
}
