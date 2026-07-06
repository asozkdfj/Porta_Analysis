"use client";

import { GrrConfigProvider } from "@/contexts/GrrConfigContext";
import { GoldenSocketProvider } from "@/contexts/GoldenSocketContext";

export function GaiaProviders({ children }: { children: React.ReactNode }) {
  return (
    <GrrConfigProvider>
      <GoldenSocketProvider>{children}</GoldenSocketProvider>
    </GrrConfigProvider>
  );
}