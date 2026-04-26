"use client"

import type React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface ServiceCardProps {
  icon: React.ElementType
  title: string
  description: string
  color?: string
  onClick?: () => void
  className?: string
}

export function ServiceCard({
  icon: Icon,
  title,
  description,
  color = "text-pmu-blue",
  onClick,
  className
}: ServiceCardProps) {
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-1",
        "border border-border bg-card",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-3 rounded-lg bg-secondary/50 transition-colors",
            "group-hover:bg-secondary",
            color
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        <Button
          variant="link"
          className="px-0 mt-2 h-auto text-sm font-medium text-primary hover:text-primary/80 group-hover:translate-x-1 transition-transform"
        >
          Access <ArrowRight className="ml-1 h-3 w-3 inline" />
        </Button>
      </CardContent>
    </Card>
  )
}

