import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#D0D5DD] bg-white px-3.5 py-2 text-sm text-[#172033] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#98A2B3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/20 focus-visible:border-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F9FAFB]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
