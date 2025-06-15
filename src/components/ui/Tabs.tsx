"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Custom Tabs implementation without radix-ui dependency
interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [tabValue, setTabValue] = React.useState(value || defaultValue || "")
  
  const handleValueChange = React.useCallback((newValue: string) => {
    if (value === undefined) {
      setTabValue(newValue)
    }
    onValueChange?.(newValue)
  }, [onValueChange, value])
  
  const contextValue = React.useMemo(() => ({
    value: value !== undefined ? value : tabValue,
    onValueChange: handleValueChange
  }), [value, tabValue, handleValueChange])
  
  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div 
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-lg bg-white/5 p-1 text-white/70",
        className
      )} 
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
  children: React.ReactNode
}

export function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }
  
  const { value: selectedValue, onValueChange } = context
  const isSelected = selectedValue === value
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      data-state={isSelected ? "active" : "inactive"}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected ? "bg-[#00c6ff] text-black shadow-sm" : "hover:bg-white/10",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
}

export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }
  
  const { value: selectedValue } = context
  const isSelected = selectedValue === value
  
  if (!isSelected) {
    return null
  }
  
  return (
    <div
      role="tabpanel"
      data-state={isSelected ? "active" : "inactive"}
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}