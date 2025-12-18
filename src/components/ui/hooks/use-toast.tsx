// src/hooks/use-toast.ts
"use client"

import * as React from "react"
import { useToastContext } from "@/components/ui/toast"
import type { ToastActionElement } from "@/components/ui/toast"

interface ToastInput {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  duration?: number
  action?: ToastActionElement
  onDismiss?: () => void
}

export const useToast = () => {
  const context = useToastContext()

  const toast = React.useCallback((props: ToastInput) => {
    return context.addToast(props)
  }, [context])

  return {
    toast,
    dismiss: context.removeToast,
    toasts: context.toasts,
  }
}