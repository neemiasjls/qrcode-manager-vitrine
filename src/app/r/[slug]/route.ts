import { NextResponse, after, type NextRequest } from "next/server";
import { recordScan as saveScan, resolveSlug } from "@/lib/data/redirect";
import { decide, type ResolvedRow } from "@/lib/redirect/decide";
import { renderPage, type PublicPage } from "@/lib/redirect/pages";
import { classifyUserAgent } from "@/lib/bot";
import { baseHost } from "@/lib/env";
import { SLUG_REGEX } from "@/lib/slug";

const NO_STORE = { "Cache-Control": "no-store" };

function htmlResponse(kind: PublicPage, status: number) {
  return new Response(renderPage(kind), {
    status,
    headers: { "content-type": "text/html; charset=utf-8", ...NO_STORE },
  });
}

function isPrefetch(request: NextRequest): boolean {
  const secPurpose = request.headers.get("sec-purpose") ?? "";
  const purpose = request.headers.get("purpose") ?? "";
  return /prefetch/i.test(secPurpose) || /prefetch/i.test(purpose);
}

async function handle(
  request: NextRequest,
  params: Promise<{ slug: string }>,
  recordScan: boolean,
): Promise<Response> {
  const { slug: rawSlug } = await params;

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug).toLowerCase();
  } catch {
    return htmlResponse("not_found", 404);
  }
  if (!SLUG_REGEX.test(slug) || slug.includes("--")) {
    return htmlResponse("not_found", 404);
  }

  let row: ResolvedRow = null;
  try {
    row = await resolveSlug(slug);
  } catch (err) {
    console.error("resolve_slug falhou", err);
    return htmlResponse("unavailable_error", 503);
  }

  const decision = decide(row, baseHost());

  if (row && recordScan && !isPrefetch(request)) {
    const linkId = row.link_id;
    const ua = request.headers.get("user-agent");
    const { isBot, device } = classifyUserAgent(ua);
    const country = request.headers.get("cf-ipcountry");
    after(async () => {
      try {
        await saveScan({
          linkId,
          slug,
          userAgent: ua ? ua.slice(0, 300) : null,
          device,
          country,
          isBot,
        });
      } catch (err) {
        console.error("falha ao registrar scan", err);
      }
    });
  }

  if (decision.type === "redirect") {
    const res = NextResponse.redirect(decision.url, 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  return htmlResponse(decision.page, decision.status);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  return handle(request, ctx.params, true);
}

export async function HEAD(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  return handle(request, ctx.params, false);
}
