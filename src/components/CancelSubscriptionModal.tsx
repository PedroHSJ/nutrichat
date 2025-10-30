import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";

export interface CancelSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onCancel: (type: "immediate" | "period") => void;
  loadingCancel: boolean;
}

export function CancelSubscriptionModal({
  open,
  onClose,
  onCancel,
  loadingCancel,
}: CancelSubscriptionModalProps) {
  // Sempre será cancelamento ao final do período
  const cancelType = "period" as const;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar assinatura</DialogTitle>
        </DialogHeader>
        <p>
          Ao confirmar, sua assinatura será cancelada ao final do período atual.
        </p>
        <DialogFooter className="gap-2">
          <Button onClick={() => onCancel(cancelType)} disabled={loadingCancel}>
            {loadingCancel ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
          {/* <DialogClose onClick={onClose}>Voltar</DialogClose> */}
        </DialogFooter>
        <p style={{ marginTop: 16, fontSize: 12, color: "#888" }}>
          O acesso será mantido até o fim do ciclo já pago. Não há reembolso
          para esta opção.
        </p>
      </DialogContent>
    </Dialog>
  );
}
