import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#FED7AA] bg-white px-3.5 py-2 text-sm text-[#172554] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#64748B]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]/25 focus-visible:border-[#F59E0B] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#FFEDD5]/40",
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
