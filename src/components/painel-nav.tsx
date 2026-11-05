"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Layers, LayoutDashboard, Link2, LogOut, Menu, Plus, QrCode, Users, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "/painel", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/painel/plaquinhas", label: "Plaquinhas", Icon: QrCode },
  { href: "/painel/vincular", label: "Vincular", Icon: Link2 },
  { href: "/painel/lotes", label: "Lotes", Icon: Layers },
  { href: "/painel/clientes", label: "Clientes", Icon: Users },
];

function isActive(pathname: string, href: string) {
  if (href === "/painel") return pathname === "/painel";
  // "Nova plaquinha" tem botão próprio; mesmo assim, fica sob Plaquinhas.
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="space-y-0.5">
      {MENU.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "opacity-75")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ username }: { username: string }) {
  return (
    <div className="space-y-3 border-t border-sidebar-border pt-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground">Tema</span>
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-2.5 px-1">
        <span
          aria-hidden
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent pt-0.5 text-sm font-bold text-sidebar-accent-foreground uppercase"
        >
          {username.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{username}</span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
            <LogOut aria-hidden /> Sair
          </Button>
        </form>
      </div>
    </div>
  );
}

function NewLinkButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/painel/plaquinhas/nova" onClick={onNavigate} className={cn(buttonVariants(), "w-full")}>
      <Plus aria-hidden /> Nova plaquinha
    </Link>
  );
}

/** Barra lateral fixa (desktop). */
export function Sidebar({ username }: { username: string }) {
  return (
    // a coluna ocupa toda a altura da página; o conteúdo fica preso no topo ao rolar
    <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
      <div className="sticky top-0 flex h-dvh flex-col gap-6 px-3 py-5">
      <Link
        href="/painel"
        className="self-start rounded-lg px-2 py-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Logo />
      </Link>
      <NewLinkButton />
      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        <NavLinks />
      </div>
      <UserFooter username={username} />
      </div>
    </aside>
  );
}

/** Barra superior com menu em gaveta (celular/tablet). */
export function MobileBar({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
      <Link href="/painel" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Logo markClassName="size-7" />
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger render={<Button variant="outline" size="icon" aria-label="Abrir menu" />}>
            <Menu aria-hidden />
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-150 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0 dark:bg-black/65" />
            <DialogPrimitive.Popup className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col gap-6 border-r border-sidebar-border bg-sidebar px-3 py-3 text-sidebar-foreground shadow-[8px_0_32px_-12px_oklch(0_0_0/0.35)] outline-none duration-200 ease-out data-closed:animate-out data-closed:slide-out-to-left data-open:animate-in data-open:slide-in-from-left">
              <div className="flex items-center justify-between pl-2">
                <DialogPrimitive.Title render={<div />}>
                  <Logo markClassName="size-7" />
                </DialogPrimitive.Title>
                <DialogPrimitive.Close render={<Button variant="ghost" size="icon" aria-label="Fechar menu" />}>
                  <X aria-hidden />
                </DialogPrimitive.Close>
              </div>
              <NewLinkButton onNavigate={close} />
              <div className="flex-1 overflow-y-auto">
                <NavLinks onNavigate={close} />
              </div>
              <UserFooter username={username} />
            </DialogPrimitive.Popup>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </div>
  );
}
