import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastAction {
  type: "ADD_TOAST" | "REMOVE_TOAST";
  toast?: Toast;
  toastId?: string;
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

// Simple implementation of toast hook
export function useToast() {
  const [state, setState] = useState<ToastState>(initialState);

  const toast = useCallback(
    ({ title, description, variant = "default", duration = 5000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        id,
        title,
        description,
        variant,
        duration,
      };

      setState((prevState) => ({
        toasts: [...prevState.toasts, newToast],
      }));

      // Automatically remove toast after duration
      setTimeout(() => {
        setState((prevState) => ({
          toasts: prevState.toasts.filter((t) => t.id !== id),
        }));
      }, duration);

      return id;
    },
    []
  );

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }));
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
} 