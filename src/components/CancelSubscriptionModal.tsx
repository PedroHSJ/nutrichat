import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from './ui/dialog';

export interface CancelSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  onCancel: (type: 'immediate' | 'period') => void;
}

export function CancelSubscriptionModal({
  open,
  onClose,
  onCancel
}: CancelSubscriptionModalProps) {
  const [cancelType, setCancelType] = useState<'immediate' | 'period'>('period');

  return (
  <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar assinatura</DialogTitle>
        </DialogHeader>
        <p>
          Escolha como deseja cancelar sua assinatura. O cancelamento imediato encerra o acesso e pode gerar reembolso proporcional. O cancelamento ao final do período mantém o acesso até o fim do ciclo já pago, sem reembolso.
        </p>
        <div style={{ marginTop: 16 }}>
          <label>
            <input
              type="radio"
              name="cancelType"
              value="immediate"
              checked={cancelType === 'immediate'}
              onChange={() => setCancelType('immediate')}
            />
            Cancelar imediatamente (reembolso proporcional)
          </label>
          <br />
          <label>
            <input
              type="radio"
              name="cancelType"
              value="period"
              checked={cancelType === 'period'}
              onChange={() => setCancelType('period')}
            />
            Cancelar ao final do período (sem reembolso)
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => onCancel(cancelType)}>
            Confirmar cancelamento
          </Button>
          <DialogClose onClick={onClose}>Voltar</DialogClose>
        </DialogFooter>
        <p style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
          {cancelType === 'immediate'
            ? 'Você poderá receber reembolso proporcional ao tempo não utilizado, conforme nossos Termos de Serviço.'
            : 'O acesso será mantido até o fim do ciclo já pago. Não há reembolso para esta opção.'}
        </p>
      </DialogContent>
    </Dialog>
  );
}


