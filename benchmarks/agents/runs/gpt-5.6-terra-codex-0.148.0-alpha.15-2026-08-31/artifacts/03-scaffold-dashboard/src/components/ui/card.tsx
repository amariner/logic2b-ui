import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
export function Card({ className, ...props }: ComponentProps<"section">) { return <section className={cn("rounded-[var(--radius)] border bg-card", className)} {...props} /> }
export function CardContent({ className, ...props }: ComponentProps<"div">) { return <div className={cn("p-5", className)} {...props} /> }
