import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-[#F0D6C8] bg-white px-3.5 py-2 text-sm text-[#25364B] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#667085]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2878C8]/25 focus-visible:border-[#2878C8] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#FFF0E8]/40",
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

