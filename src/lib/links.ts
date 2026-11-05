import { publicBaseUrl } from "@/lib/env";

export function publicLinkFor(slug: string): string {
  return `${publicBaseUrl()}/r/${slug}`;
}
