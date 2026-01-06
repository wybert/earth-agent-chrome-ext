import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {}
})

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext)
    
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ children, side = 'bottom', className }: SelectContentProps) => {
  const { isOpen, setIsOpen } = React.useContext(SelectContext)

  if (!isOpen) return null

  const positionClasses = side === 'top'
    ? 'bottom-full mb-1'
    : 'top-full mt-1'

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setIsOpen(false)}
      />
      <div className={cn(
        "absolute left-0 z-50 min-w-full bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto",
        positionClasses,
        className
      )}>
        {children}
      </div>
    </>
  )
}

const SelectItem = ({ value, children }: SelectItemProps) => {
  const { value: selectedValue, onValueChange, setIsOpen } = React.useContext(SelectContext)
  const isSelected = selectedValue === value
  
  return (
    <div
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm text-gray-200 outline-none hover:bg-gray-700/50 focus:bg-gray-700/50",
        isSelected && "bg-gray-700/50"
      )}
      onClick={() => {
        onValueChange?.(value)
        setIsOpen(false)
      }}
    >
      {children}
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}

const SelectValue = ({ placeholder }: SelectValueProps) => {
  const { value } = React.useContext(SelectContext)
  
  return (
    <span className={cn(!value && "text-muted-foreground")}>
      {value || placeholder}
    </span>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } 