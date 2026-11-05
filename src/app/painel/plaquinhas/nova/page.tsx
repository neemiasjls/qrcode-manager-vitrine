import { listClientOptions } from "@/lib/data/clients";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { NewLinkForm } from "./new-link-form";

export const metadata = { title: "Nova plaquinha" };

export default async function NovaPlaquinhaPage() {
  const clients = await listClientOptions();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        back={{ href: "/painel/plaquinhas", label: "Plaquinhas" }}
        title="Nova plaquinha"
        description="O link fica gravado no QR para sempre; o destino pode mudar depois."
      />
      <Card>
        <CardContent>
          <NewLinkForm clients={clients} />
        </CardContent>
      </Card>
    </div>
  );
}
