import React, { useEffect } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#283638]/50 backdrop-blur-xs"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="bg-[#FFFFFF] dark:bg-[#1F2B2D] border border-[#E5E2D8] dark:border-[#33403F] rounded-xl max-w-md w-full p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D8] dark:border-[#33403F]">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${tone === 'danger' ? 'text-[#B94D42]' : 'text-[#49686C]'}`} />
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-[#283638] dark:text-[#E7E4D9]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="p-1 text-[#737A72] hover:text-[#283638] dark:hover:text-white rounded disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 text-xs text-[#737A72] dark:text-[#A9B0A8] leading-relaxed">{message}</div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3.5 py-1.5 border border-[#E5E2D8] dark:border-[#33403F] rounded-lg text-xs font-semibold text-[#737A72] hover:bg-[#F6F4EC] dark:hover:bg-[#263335] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 ${
              tone === 'danger' ? 'bg-[#B94D42] hover:bg-[#a63c32]' : 'bg-[#49686C] hover:bg-[#30494B]'
            }`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
