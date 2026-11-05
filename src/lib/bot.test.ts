import { describe, expect, it } from "vitest";
import { classifyUserAgent } from "./bot";

describe("classifyUserAgent", () => {
  it("detecta WhatsApp como bot", () => {
    expect(classifyUserAgent("WhatsApp/2.23.20 A")).toEqual({ isBot: true, device: "bot" });
  });
  it("detecta curl, Googlebot e preview", () => {
    expect(classifyUserAgent("curl/8.4.0").isBot).toBe(true);
    expect(classifyUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)").isBot).toBe(true);
    expect(classifyUserAgent("Slackbot-LinkExpanding 1.0").isBot).toBe(true);
    expect(classifyUserAgent("facebookexternalhit/1.1").isBot).toBe(true);
    expect(classifyUserAgent("HeadlessChrome/120").isBot).toBe(true);
  });
  it("detecta celular", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(classifyUserAgent(ua)).toEqual({ isBot: false, device: "mobile" });
  });
  it("detecta desktop", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";
    expect(classifyUserAgent(ua)).toEqual({ isBot: false, device: "desktop" });
  });
  it("UA vazio vira unknown", () => {
    expect(classifyUserAgent(null)).toEqual({ isBot: false, device: "unknown" });
    expect(classifyUserAgent("")).toEqual({ isBot: false, device: "unknown" });
  });
});
