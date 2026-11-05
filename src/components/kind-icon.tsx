import { Camera, Globe, Link as LinkIcon, MessageCircle, Star, Utensils } from "lucide-react";
import { KINDS } from "@/lib/kinds";
import { cn } from "@/lib/utils";

const ICONS = {
  star: Star,
  camera: Camera,
  "message-circle": MessageCircle,
  utensils: Utensils,
  globe: Globe,
  link: LinkIcon,
} as const;

function iconFor(kind: string) {
  const def = KINDS.find((k) => k.id === kind);
  return { Icon: ICONS[(def?.icon ?? "link") as keyof typeof ICONS], label: def?.label ?? kind };
}

export function KindIcon({ kind, className }: { kind: string; className?: string }) {
  const { Icon, label } = iconFor(kind);
  return <Icon className={className ?? "size-4"} aria-label={label} role="img" />;
}

/** Ícone do tipo dentro de uma "plaquinha" (quadrado arredondado), para listas e cabeçalhos. */
export function KindTile({ kind, size = "md", className }: { kind: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const { Icon, label } = iconFor(kind);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground/80",
        size === "sm" && "size-7 rounded-md [&_svg]:size-3.5",
        size === "md" && "size-8 [&_svg]:size-4",
        size === "lg" && "size-11 rounded-xl [&_svg]:size-5",
        className,
      )}
    >
      <Icon aria-label={label} role="img" />
    </span>
  );
}
