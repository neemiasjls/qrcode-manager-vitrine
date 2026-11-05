import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/action-form";

type Values = { name?: string; phone?: string | null; email?: string | null; notes?: string | null };

export function ClientFields({ values = {} }: { values?: Values }) {
  return (
    <>
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" defaultValue={values.name ?? ""} required maxLength={120} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Telefone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={values.phone ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={values.email ?? ""} />
        </Field>
      </div>
      <Field label="Observações" htmlFor="notes">
        <Textarea id="notes" name="notes" defaultValue={values.notes ?? ""} rows={3} />
      </Field>
    </>
  );
}
