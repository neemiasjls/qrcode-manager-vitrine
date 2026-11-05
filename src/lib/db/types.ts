// Tipos de linha escritos à mão a partir de db/migrations. Datas como string ISO.
export type LinkStatus = "unassigned" | "active" | "paused" | "archived";

export type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Batch = {
  id: string;
  name: string;
  kind: string;
  quantity: number;
  request_id: string;
  created_at: string;
};

export type Link = {
  id: string;
  slug: string;
  client_id: string | null;
  batch_id: string | null;
  destination_url: string | null;
  status: LinkStatus;
  kind: string;
  label: string | null;
  printed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LinkOverview = Link & {
  client_name: string | null;
  scans_total: number;
  scans_7d: number;
  scans_30d: number;
};

export type LinkSlug = {
  slug: string;
  link_id: string;
  is_primary: boolean;
  created_at: string;
};

export type DestinationHistory = {
  id: string;
  link_id: string;
  old_url: string | null;
  new_url: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type ScanDay = { day: string; total: number };

/** Usuário do painel (sem password_hash). */
export type User = {
  id: string;
  username: string;
  session_version: number;
  is_active: boolean;
};
