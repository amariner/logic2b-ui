import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn("inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90", className)} {...props} /> }
