import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-border [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground border-border [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive text-white border-border focus-visible:ring-destructive/20 [a]:hover:bg-destructive/80",
        outline:
          "bg-card text-foreground border-border [a]:hover:bg-muted [a]:hover:text-foreground",
        ghost:
          "bg-transparent text-foreground border-transparent hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        success:
          "bg-[var(--success)] text-white border-border [a]:hover:bg-[var(--success)]/80",
        warning:
          "bg-[var(--warning)] text-[var(--warning-foreground,#1a120b)] border-border [a]:hover:bg-[var(--warning)]/80",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
