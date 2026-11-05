import Link from "next/link";
import { Search, Users, X } from "lucide-react";
import { listClients } from "@/lib/data/clients";
import { sanitizeSearch, formatDate } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionForm } from "@/components/action-form";
import { ClientFields } from "@/components/client-fields";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { createClientAction } from "./actions";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = sanitizeSearch(q);
  const clients = (await listClients(term)) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Quem recebe as plaquinhas." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="gap-0 py-0">
          <form className="flex gap-2 border-b border-border p-3" method="get" role="search">
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Buscar por nome"
                aria-label="Buscar por nome"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
            {q && (
              <Link
                href="/painel/clientes"
                aria-label="Limpar busca"
                className={buttonVariants({ variant: "ghost", size: "icon", className: "text-muted-foreground" })}
              >
                <X aria-hidden />
              </Link>
            )}
          </form>
          {clients.length === 0 ? (
            <EmptyState icon={Users} title={q ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}>
              {q ? "Confira a grafia ou busque por outra parte do nome." : "Cadastre o primeiro cliente no formulário ao lado."}
            </EmptyState>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                  <TableHead className="pr-4 text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id} className="group relative">
                    <TableCell className="max-w-56 truncate pl-4">
                      <Link
                        href={`/painel/clientes/${c.id}`}
                        className="rounded-sm font-semibold underline-offset-4 outline-none group-hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 after:absolute after:inset-0"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{c.phone ?? "—"}</TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground tabular-nums">
                      {formatDate(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="lg:sticky lg:top-16">
          <CardHeader>
            <CardTitle>Novo cliente</CardTitle>
            <CardDescription>Só o nome é obrigatório.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={createClientAction} submitLabel="Criar cliente" pendingLabel="Criando...">
              <ClientFields />
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
