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
        months: cn("flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 items-center justify-center", classNames?.months),
        month: cn("space-y-3 w-full", classNames?.month),
        month_caption: cn("relative flex items-center justify-center pt-1 pb-2 border-b border-border mb-2 w-full px-8", classNames?.month_caption),
        caption_label: cn("text-xs font-bold tracking-wide text-foreground text-center", classNames?.caption_label),
        nav: cn("flex items-center justify-between w-full absolute top-1 left-0 right-0 px-2 pointer-events-none", classNames?.nav),
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md pointer-events-auto",
          classNames?.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md pointer-events-auto",
          classNames?.button_next
        ),
        month_grid: cn("w-full border-collapse mt-1 mx-auto", classNames?.month_grid),
        weekdays: cn("flex justify-between border-b border-border pb-1.5 mb-1 w-full", classNames?.weekdays),
        weekday: cn("text-muted-foreground w-7 text-center font-semibold text-[0.75rem] flex items-center justify-center", classNames?.weekday),
        week: cn("flex w-full justify-between mt-1", classNames?.week),
        day: cn(
          "relative p-0 text-center text-xs focus-within:relative focus-within:z-20",
          classNames?.day
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-xs font-normal rounded-md hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100",
          classNames?.day_button
        ),
        range_start: cn("day-range-start", classNames?.range_start),
        range_end: cn("day-range-end", classNames?.range_end),
        selected: cn(
          "!bg-primary !text-primary-foreground font-semibold hover:!bg-primary hover:!text-primary-foreground focus:!bg-primary focus:!text-primary-foreground rounded-md",
          classNames?.selected
        ),
        today: cn("border border-primary text-primary font-bold rounded-md", classNames?.today),
        outside: cn("day-outside text-slate-300 opacity-40 aria-selected:text-slate-300", classNames?.outside),
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
