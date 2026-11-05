"use client";

import { useState } from "react";
import QRCode from "qrcode";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { normalizeSlug } from "@/lib/slug";
import { markPrinted } from "@/app/painel/plaquinhas/actions";

type Item = { id: string; slug: string; link: string };

export function BatchDownload({ batchName, items }: { batchName: string; items: Item[] }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function download() {
    setBusy(true);
    setProgress(0);
    try {
      const zip = new JSZip();
      const svgDir = zip.folder("svg")!;
      const pngDir = zip.folder("png")!;

      let i = 0;
      for (const it of items) {
        const svg = await QRCode.toString(it.link, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
        svgDir.file(`${it.slug}.svg`, svg);
        const dataUrl = await QRCode.toDataURL(it.link, { width: 1024, margin: 2 });
        pngDir.file(`${it.slug}.png`, dataUrl.replace(/^data:image\/png;base64,/, ""), { base64: true });
        i += 1;
        if (i % 10 === 0) setProgress(i);
      }

      // BOM UTF-8 para o Excel abrir corretamente
      const csv = "﻿" + "slug,link\r\n" + items.map((it) => `${it.slug},${it.link}`).join("\r\n") + "\r\n";
      zip.file("links.csv", csv);

      const blob = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `lote-${normalizeSlug(batchName) || "sem-nome"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);

      await markPrinted(items.map((it) => it.id));
      toast.success("ZIP gerado");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível gerar o ZIP");
    } finally {
      setBusy(false);
    }
  }

  const pct = items.length > 0 ? Math.round((progress / items.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={download} disabled={busy || items.length === 0} aria-busy={busy || undefined}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          {busy ? `Gerando... (${progress}/${items.length})` : "Baixar ZIP"}
        </Button>
        {busy && (
          <span
            role="progressbar"
            aria-label="Gerando ZIP"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={progress}
            className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"
          >
            <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        O ZIP contém um SVG e um PNG por plaquinha, mais o arquivo links.csv.
      </p>
    </div>
  );
}
