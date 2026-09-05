export interface WeekDayInfo {
  dateStr: string;
  dayName: string;
  shortDate: string;
  isToday: boolean;
}

export function getWeekDays(startDateStr: string): WeekDayInfo[] {
  const [year, month, day] = startDateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const todayStr = new Date().toISOString().split("T")[0];

  const days: WeekDayInfo[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    
    days.push({
      dateStr,
      dayName: dayNames[current.getDay()],
      shortDate: `${d}/${m}`,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export interface TaskMinimal {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  dueDate?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  clientName?: string | null;
  assigneeName?: string | null;
}

export interface DayGroup {
  dateStr: string;
  dayName: string;
  shortDate: string;
  isToday: boolean;
  tasks: TaskMinimal[];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export interface WeeklyStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  percentage: number;
}

export function calculateWeeklyStats(tasks: TaskMinimal[]): WeeklyStats {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "review").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    todo,
    percentage,
  };
}

export function groupTasksByWeek(startDateStr: string, tasks: TaskMinimal[]) {
  const days = getWeekDays(startDateStr);
  const dateSet = new Set(days.map((d) => d.dateStr));

  const dayGroups: DayGroup[] = days.map((day) => {
    const dayTasks = tasks.filter((t) => t.dueDate === day.dateStr);
    const totalCount = dayTasks.length;
    const completedCount = dayTasks.filter((t) => t.status === "done").length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      ...day,
      tasks: dayTasks,
      totalCount,
      completedCount,
      percentage,
    };
  });

  // Also collect undated tasks or tasks outside this week
  const otherTasks = tasks.filter((t) => !t.dueDate || !dateSet.has(t.dueDate));

  return {
    days: dayGroups,
    otherTasks,
    stats: calculateWeeklyStats(tasks),
  };
}

export function getMondayOfCurrentWeek(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}
