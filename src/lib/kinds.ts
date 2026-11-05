export const KINDS = [
  { id: "google_review", label: "Avaliação Google", icon: "star" },
  { id: "instagram", label: "Instagram", icon: "camera" },
  { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  { id: "cardapio", label: "Cardápio", icon: "utensils" },
  { id: "site", label: "Site", icon: "globe" },
  { id: "outro", label: "Outro", icon: "link" },
] as const;

export type KindId = (typeof KINDS)[number]["id"];

export const KIND_IDS: readonly string[] = KINDS.map((k) => k.id);

export function kindLabel(id: string): string {
  return KINDS.find((k) => k.id === id)?.label ?? id;
}
