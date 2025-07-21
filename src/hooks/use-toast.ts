import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

let toastCounter = 0;

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = (++toastCounter).toString();
    const newToast: Toast = { ...toast, id };
    
    setState((prev) => ({
      toasts: [...prev.toasts, newToast],
    }));

    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      setState((prev) => ({
        toasts: prev.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setState((prev) => ({
      toasts: prev.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  return {
    toast: addToast,
    toasts: state.toasts,
    removeToast,
  };
}