import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

export function Toaster() {
  const { toasts } = useToast()
  
  if (!toasts || toasts.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded shadow-md ${
            toast.variant === "destructive" 
              ? "bg-red-500 text-white" 
              : toast.variant === "success"
              ? "bg-green-500 text-white"
              : "bg-white text-gray-900"
          }`}
        >
          <div className="font-medium">{toast.title}</div>
          {toast.description && (
            <div className="text-sm mt-1">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  )
}
