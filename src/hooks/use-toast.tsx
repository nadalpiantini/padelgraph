// Simple toast hook for notifications
import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

const toasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

let toastCount = 0;

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_VALUE;
  return toastCount.toString();
}

export function toast({ title, description, action, variant = 'default' }: Omit<Toast, 'id'>) {
  const id = genId();

  const newToast: Toast = {
    id,
    title,
    description,
    action,
    variant,
  };

  toasts.push(newToast);
  listeners.forEach((listener) => listener([...toasts]));

  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      listeners.forEach((listener) => listener([...toasts]));
    }
  }, 5000);

  return {
    id,
    dismiss: () => {
      const index = toasts.findIndex((t) => t.id === id);
      if (index > -1) {
        toasts.splice(index, 1);
        listeners.forEach((listener) => listener([...toasts]));
      }
    },
    update: (props: Partial<Omit<Toast, 'id'>>) => {
      const index = toasts.findIndex((t) => t.id === id);
      if (index > -1) {
        toasts[index] = { ...toasts[index], ...props };
        listeners.forEach((listener) => listener([...toasts]));
      }
    },
  };
}

export function useToast() {
  const [state, setState] = useState<Toast[]>([...toasts]);

  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const unsubscribe = useCallback(() => {
    listeners = [];
  }, []);

  return {
    toasts: state,
    toast,
    dismiss: (toastId: string) => {
      const index = toasts.findIndex((t) => t.id === toastId);
      if (index > -1) {
        toasts.splice(index, 1);
        listeners.forEach((listener) => listener([...toasts]));
      }
    },
    subscribe,
    unsubscribe,
  };
}
