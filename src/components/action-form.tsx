"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type ActionState = { error?: string; ok?: string };

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "default" | "destructive" | "outline";
  className?: string;
  /** esconde o botão de enviar (quando o formulário traz o seu próprio) */
  hideSubmit?: boolean;
};

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Salvando...",
  variant = "default",
  className,
  hideSubmit,
}: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) toast.success(state.ok);
  }, [state]);

  return (
    <form action={formAction} className={className ?? "space-y-5"}>
      {children}
      {state.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {!hideSubmit && (
        <Button type="submit" variant={variant} disabled={pending} aria-busy={pending || undefined}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      )}
    </form>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}
