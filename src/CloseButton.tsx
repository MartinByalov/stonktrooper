import type { ComponentProps } from 'react';
import { X } from 'lucide-react';

/** Shared close control; callers retain their label, focus ref and handler. */
export function CloseButton({ className = '', ...props }: ComponentProps<'button'>) {
  return <button type="button" {...props} className={`${className} app-close-button`}>
    <X size={22} aria-hidden="true" />
  </button>;
}