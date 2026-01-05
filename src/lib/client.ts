import { treaty } from "@elysiajs/eden"
import type { App } from "../app/api/[[...slugs]]/route"

function getBaseUrl() {
  // Browser: use the current site (Vercel domain in prod, localhost in dev)
  if (typeof window !== "undefined") return window.location.origin

  // Server: use an env var if available, otherwise localhost for dev
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}

export const client = treaty<App>(getBaseUrl()).api
