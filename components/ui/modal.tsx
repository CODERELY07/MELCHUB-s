"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function Modal({ open, onClose, title, description, children, className }: ModalProps) {
  const ref = React.useRef<HTMLDialogElement>(null)

  React.useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      data-slot="modal"
      className={cn(
        // Below sm: a full-width sheet pinned to the bottom edge, the
        // pattern phone users expect instead of a centered desktop dialog.
        "inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-2xl rounded-b-none border-t border-border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/50 open:animate-in open:fade-in-0 open:slide-in-from-bottom open:duration-300",
        "sm:inset-0 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-xl sm:rounded-t-xl sm:border-t-0 sm:border sm:shadow-lg sm:open:slide-in-from-bottom-0 sm:open:zoom-in-95 sm:open:duration-150",
        className
      )}
    >
      <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted sm:hidden" aria-hidden="true" />
      <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </dialog>
  )
}

export { Modal }
