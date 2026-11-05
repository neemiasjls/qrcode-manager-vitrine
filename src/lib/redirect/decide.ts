export type ResolvedRow = {
  link_id: string;
  status: "unassigned" | "active" | "paused" | "archived";
  destination_url: string | null;
  is_alias: boolean;
} | null;

export type PageKind = "not_found" | "unassigned" | "unavailable";

export type Decision =
  | { type: "redirect"; status: 302; url: string }
  | { type: "page"; status: 200 | 404; page: PageKind };

/** Lógica pura do redirect. `baseHost` é o host de NEXT_PUBLIC_BASE_URL (evita loop). */
export function decide(row: ResolvedRow, baseHost: string): Decision {
  if (!row) return { type: "page", status: 404, page: "not_found" };

  switch (row.status) {
    case "active": {
      const dest = row.destination_url;
      if (!dest || !/^https?:\/\//i.test(dest)) {
        return { type: "page", status: 404, page: "not_found" };
      }
      let host: string;
      try {
        host = new URL(dest).host.toLowerCase();
      } catch {
        return { type: "page", status: 404, page: "not_found" };
      }
      if (baseHost && host === baseHost.toLowerCase()) {
        return { type: "page", status: 404, page: "not_found" };
      }
      return { type: "redirect", status: 302, url: dest };
    }
    case "unassigned":
      return { type: "page", status: 200, page: "unassigned" };
    case "paused":
    case "archived":
      return { type: "page", status: 200, page: "unavailable" };
    default:
      return { type: "page", status: 404, page: "not_found" };
  }
}
