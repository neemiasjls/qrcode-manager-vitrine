"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markPrinted } from "@/app/painel/plaquinhas/actions";

type Props = { linkId: string; slug: string; url: string };

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function QrPanel({ linkId, slug, url }: Props) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível gerar o QR code");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function downloadSvg() {
    const s = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
    const blob = new Blob([s], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    triggerDownload(href, `${slug}.svg`);
    URL.revokeObjectURL(href);
    await markPrinted([linkId]);
  }

  async function downloadPng() {
    const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
    triggerDownload(dataUrl, `${slug}.png`);
    await markPrinted([linkId]);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="space-y-4">
      {/* O QR é sempre preto no branco (impressão), nos dois temas. */}
      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <div
          className="mx-auto aspect-square w-full max-w-60 rounded-lg bg-white p-2 shadow-[0_1px_3px_oklch(0_0_0/0.12)] [&_svg]:h-full [&_svg]:w-full"
          // SVG gerado localmente pela biblioteca qrcode a partir do nosso próprio link
          dangerouslySetInnerHTML={{ __html: svg }}
          aria-label={`QR code de ${url}`}
          role="img"
        />
        {!svg && <span className="sr-only">Gerando QR code...</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={downloadSvg} disabled={!svg}>
          <Download aria-hidden /> Baixar SVG
        </Button>
        <Button type="button" variant="outline" onClick={downloadPng} disabled={!svg}>
          <Download aria-hidden /> Baixar PNG
        </Button>
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 py-1 pr-1 pl-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-xs" title={url}>
          {url}
        </code>
        <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label="Copiar link">
          <Copy aria-hidden /> Copiar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Baixe em SVG para a gráfica ou PNG (1024 px). Para NFC, grave este mesmo link.
      </p>
    </div>
  );
}
