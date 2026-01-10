import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface DropdownMenuContentProps {
  children: React.ReactNode
  align?: 'start' | 'end' | 'center'
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const DropdownMenuContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = ({ children, asChild }: DropdownMenuTriggerProps) => {
  const { isOpen, setIsOpen } = React.useContext(DropdownMenuContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
        // Call original onClick if it exists
        const originalOnClick = (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick
        if (originalOnClick) {
          originalOnClick(e as unknown as React.MouseEvent<HTMLElement>)
        }
      }
    })
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setIsOpen(!isOpen)
      }}
    >
      {children}
    </button>
  )
}

const DropdownMenuContent = ({ children, align = 'start', className, onClick }: DropdownMenuContentProps) => {
  const { isOpen, setIsOpen } = React.useContext(DropdownMenuContext)

  if (!isOpen) return null

  const alignClasses = {
    start: 'left-0',
    end: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(false)
        }}
      />
      <div
        className={cn(
          "absolute top-full mt-1 z-50 min-w-[8rem] bg-popover border border-border rounded-md shadow-md py-1",
          alignClasses[align],
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    </>
  )
}

const DropdownMenuItem = ({ children, className, onClick, ...props }: DropdownMenuItemProps) => {
  const { setIsOpen } = React.useContext(DropdownMenuContext)

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        className
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
        setIsOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
