"use client"

import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn("flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0", classNames?.months),
        month: cn("space-y-4", classNames?.month),
        month_caption: cn("flex justify-center pt-1 relative items-center", classNames?.month_caption),
        caption_label: cn("text-sm font-medium", classNames?.caption_label),
        nav: cn("space-x-1 flex items-center", classNames?.nav),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          classNames?.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          classNames?.button_next
        ),
        month_grid: cn("w-full border-collapse space-y-1", classNames?.month_grid),
        weekdays: cn("flex", classNames?.weekdays),
        weekday: cn("text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]", classNames?.weekday),
        week: cn("flex w-full mt-2", classNames?.week),
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
          classNames?.day
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
          classNames?.day_button
        ),
        range_start: cn("day-range-start", classNames?.range_start),
        range_end: cn("day-range-end", classNames?.range_end),
        selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          classNames?.selected
        ),
        today: cn("bg-accent text-accent-foreground font-bold", classNames?.today),
        outside: cn("day-outside text-muted-foreground aria-selected:text-muted-foreground", classNames?.outside),
        disabled: cn("text-muted-foreground opacity-50", classNames?.disabled),
        range_middle: cn("aria-selected:bg-accent aria-selected:text-accent-foreground", classNames?.range_middle),
        hidden: cn("invisible", classNames?.hidden),
        focused: cn(defaultClassNames.focused, classNames?.focused),
        weeks: cn(defaultClassNames.weeks, classNames?.weeks),
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
