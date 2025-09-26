import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] max-w-[90vw]">
        {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
        {children}
        <button
          className="mt-4 text-sm text-gray-500 hover:underline"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
