"use client"

import * as React from "react"
import { cn } from "cn"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn("flex w-fit flex-row items-center gap-2 rounded-lg", className)}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "group/toggle inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-input bg-transparent px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus:z-10 focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
