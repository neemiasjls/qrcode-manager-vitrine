"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleAlert, Loader2, PencilLine, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { normalizeSlug } from "@/lib/slug";
import { publicLinkFor } from "@/lib/links";
import { changeSlugAction } from "../actions";
import type { ActionState } from "@/components/action-form";

export function ChangeSlugDialog({
  linkId,
  currentSlug,
  locked,
}: {
  linkId: string;
  currentSlug: string;
  /** já impresso ou já acessado */
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [state, action, pending] = useActionState<ActionState, FormData>(changeSlugAction, {});

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state]);

  const normalized = normalizeSlug(value);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <PencilLine aria-hidden /> Alterar link
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar link</DialogTitle>
          <DialogDescription>
            Link atual: <span className="font-mono">{currentSlug}</span>
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={linkId} />
          {locked && (
            <Alert variant="warning">
              <TriangleAlert aria-hidden />
              <AlertDescription>
                Esta plaquinha já foi impressa/acessada. O link antigo continuará funcionando como
                apelido e nunca poderá ser usado por outra plaquinha.
              </AlertDescription>
            </Alert>
          )}
          <Input
            name="slug"
            aria-label="Novo link"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="novo-link"
            autoComplete="off"
            required
          />
          {normalized && (
            <p className="break-all rounded-md bg-muted px-2.5 py-1.5 font-mono text-sm text-muted-foreground">{publicLinkFor(normalized)}</p>
          )}
          {state.error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending || !normalized} aria-busy={pending || undefined}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {pending ? "Alterando..." : locked ? "Confirmar e alterar" : "Alterar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
