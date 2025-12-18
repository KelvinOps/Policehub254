// src/components/ui/toast.tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

// Toast Action Component
interface ToastActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  altText?: string
}

export const ToastAction = React.forwardRef<HTMLButtonElement, ToastActionProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors",
        "hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30",
        "group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground",
        "group-[.destructive]:focus:ring-destructive",
        className
      )}
      {...props}
    />
  )
)
ToastAction.displayName = "ToastAction"

// Toast types
export type ToastActionElement = React.ReactElement<typeof ToastAction>

export interface ToastProps {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive"
  duration?: number
  open?: boolean
}

// Toast Context
interface ToastContextValue {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, "id">) => string
  removeToast: (id: string) => void
  updateToast: (id: string, toast: Partial<ToastProps>) => void
  dismissToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Export for backward compatibility
export const useToastContext = useToast

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const dismissToast = React.useCallback((id: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === id ? { ...toast, open: false } : toast
      )
    )
    
    // Remove after animation
    setTimeout(() => {
      removeToast(id)
    }, 150)
  }, [removeToast])

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastProps = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
      open: true,
    }

    setToasts(prev => [...prev, newToast])

    // Auto dismiss toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, newToast.duration)
    }

    return id
  }, [dismissToast])

  const updateToast = React.useCallback((id: string, updates: Partial<ToastProps>) => {
    setToasts(prev =>
      prev.map(toast =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    )
  }, [])

  const contextValue: ToastContextValue = React.useMemo(() => ({
    toasts,
    addToast,
    removeToast,
    updateToast,
    dismissToast
  }), [toasts, addToast, removeToast, updateToast, dismissToast])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  )
}

// Toast Close Component
interface ToastCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onDismiss?: () => void
}

export const ToastClose = React.forwardRef<HTMLButtonElement, ToastCloseProps>(
  ({ className, onDismiss, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity",
        "hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
        "group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50",
        "group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
        className
      )}
      onClick={onDismiss}
      {...props}
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </button>
  )
)
ToastClose.displayName = "ToastClose"

// Toast Title
export const ToastTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm font-semibold", className)}
      {...props}
    />
  )
)
ToastTitle.displayName = "ToastTitle"

// Toast Description
export const ToastDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm opacity-90", className)}
      {...props}
    />
  )
)
ToastDescription.displayName = "ToastDescription"

// Toast variants
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Toast Component
interface ToastComponentProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id' | 'title'>, VariantProps<typeof toastVariants> {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  open?: boolean
}

export const Toast = React.forwardRef<HTMLDivElement, ToastComponentProps>(
  ({ className, variant, id, title, description, action, open = true, ...props }, ref) => {
    const { dismissToast } = useToast()

    const handleDismiss = () => {
      dismissToast(id)
    }

    return (
      <div
        ref={ref}
        className={cn(
          toastVariants({ variant }),
          "transform transition-all duration-300 ease-in-out mb-2",
          open ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95",
          className
        )}
        {...props}
      >
        <div className="grid gap-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
        </div>
        {action}
        <ToastClose onDismiss={handleDismiss} />
      </div>
    )
  }
)
Toast.displayName = "Toast"

// Toast Viewport
export const ToastViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { toasts } = useToast()

    return (
      <div
        ref={ref}
        className={cn(
          "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4",
          "sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
          className
        )}
        {...props}
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    )
  }
)
ToastViewport.displayName = "ToastViewport"