/// <reference types="vite/client" />

import type { StatForgeApi } from "../../shared/ipc-types";

declare global {
  interface Window {
    statforge: StatForgeApi;
  }
}

export {};
