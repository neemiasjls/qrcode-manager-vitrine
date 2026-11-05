export type Device = "mobile" | "desktop" | "bot" | "unknown";

const BOT_REGEX =
  /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|slack|discord|preview|curl|wget|headless/i;
const MOBILE_REGEX = /mobile|android|iphone|ipad|ipod/i;

export function classifyUserAgent(ua: string | null | undefined): { isBot: boolean; device: Device } {
  if (!ua || !ua.trim()) return { isBot: false, device: "unknown" };
  if (BOT_REGEX.test(ua)) return { isBot: true, device: "bot" };
  if (MOBILE_REGEX.test(ua)) return { isBot: false, device: "mobile" };
  return { isBot: false, device: "desktop" };
}
