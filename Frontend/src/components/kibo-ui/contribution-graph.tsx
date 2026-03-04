"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ContributionData {
    date: string;  // 'YYYY-MM-DD'
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
}

interface ContributionGraphContextValue {
    data: ContributionData[];
    weeks: (ContributionData | null)[][];
}

const ContributionGraphContext = React.createContext<ContributionGraphContextValue>({
    data: [],
    weeks: [],
});

// ─── Build 52-week grid ──────────────────────────────────────────────────────
function buildWeeks(data: ContributionData[]): (ContributionData | null)[][] {
    const dataMap = new Map(data.map((d) => [d.date, d]));
    const today = new Date();
    const endDate = new Date(today);
    // end on Saturday of current week
    const dayOfWeek = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - dayOfWeek));

    // start 52 weeks back, on a Sunday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 52 * 7 + 1);

    const weeks: (ContributionData | null)[][] = [];
    let week: (ContributionData | null)[] = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
        const dateStr = cursor.toISOString().slice(0, 10);
        week.push(dataMap.get(dateStr) ?? null);
        if (cursor.getDay() === 6) {
            weeks.push(week);
            week = [];
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);

    return weeks;
}

// ─── Month labels ────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Provider ────────────────────────────────────────────────────────────────
interface ContributionGraphProps {
    data: ContributionData[];
    children: React.ReactNode;
    className?: string;
}

export function ContributionGraph({ data, children, className }: ContributionGraphProps) {
    const weeks = React.useMemo(() => buildWeeks(data), [data]);
    return (
        <ContributionGraphContext.Provider value={{ data, weeks }}>
            <div className={cn("w-full overflow-x-auto", className)}>
                {children}
            </div>
        </ContributionGraphContext.Provider>
    );
}

// ─── Calendar ────────────────────────────────────────────────────────────────
interface BlockRendererArgs {
    activity: ContributionData | null;
    dayIndex: number;
    weekIndex: number;
}

interface ContributionGraphCalendarProps {
    children: (args: BlockRendererArgs) => React.ReactNode;
    className?: string;
}

export function ContributionGraphCalendar({ children, className }: ContributionGraphCalendarProps) {
    const { weeks } = React.useContext(ContributionGraphContext);

    // Compute month labels per week
    const monthLabels: (string | null)[] = weeks.map((week, wi) => {
        const firstDay = week.find(Boolean);
        if (!firstDay) return null;
        const d = new Date(firstDay.date + "T00:00:00");
        if (wi === 0 || d.getDate() <= 7) return MONTHS[d.getMonth()];
        return null;
    });

    return (
        <div className={cn("inline-flex flex-col gap-1 min-w-max", className)}>
            {/* Month row */}
            <div className="flex gap-[3px] ml-9">
                {months(weeks, monthLabels)}
            </div>
            <div className="flex gap-[3px]">
                {/* Day labels */}
                <div className="flex flex-col gap-[3px] mr-1 w-8">
                    {[1, 3, 5].map((i) => (
                        <span key={i} style={{ marginTop: i === 1 ? 0 : (i - 1) * (13 + 3) }} className="text-[10px] text-muted-foreground leading-none h-[13px] flex items-center">
                            {DAYS[i]}
                        </span>
                    ))}
                </div>
                {/* Grid */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                        {week.map((activity, di) => (
                            <div key={di}>
                                {children({ activity, dayIndex: di, weekIndex: wi })}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function months(weeks: (ContributionData | null)[][], labels: (string | null)[]) {
    const result: React.ReactNode[] = [];
    let consecutive = 0;
    for (let wi = 0; wi < weeks.length; wi++) {
        if (labels[wi]) {
            if (consecutive > 0) {
                result.push(
                    <span key={`spacer-${wi}`} style={{ width: consecutive * (13 + 3) - 3 }} className="inline-block" />
                );
                consecutive = 0;
            }
            result.push(
                <span key={wi} className="text-[10px] text-muted-foreground w-[13px]">{labels[wi]}</span>
            );
        } else {
            consecutive++;
        }
    }
    return result;
}

// ─── Block ───────────────────────────────────────────────────────────────────
interface ContributionGraphBlockProps {
    activity: ContributionData | null;
    dayIndex: number;
    weekIndex: number;
    className?: string;
}

export function ContributionGraphBlock({
    activity,
    className,
}: ContributionGraphBlockProps) {
    const level = activity?.level ?? 0;
    const [tooltip, setTooltip] = React.useState(false);

    return (
        <div className="relative">
            <div
                data-level={level}
                onMouseEnter={() => setTooltip(true)}
                onMouseLeave={() => setTooltip(false)}
                className={cn(
                    "w-[13px] h-[13px] rounded-sm cursor-pointer transition-opacity hover:opacity-80",
                    "data-[level='0']:bg-muted",
                    "data-[level='1']:bg-primary/20",
                    "data-[level='2']:bg-primary/45",
                    "data-[level='3']:bg-primary/70",
                    "data-[level='4']:bg-primary",
                    className
                )}
            />
            {tooltip && activity && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 whitespace-nowrap rounded bg-popover border border-border text-popover-foreground text-[10px] px-2 py-1 shadow-md pointer-events-none">
                    <span className="font-medium">{activity.count} {activity.count === 1 ? "activity" : "activities"}</span>
                    <br />
                    <span className="text-muted-foreground">{activity.date}</span>
                </div>
            )}
        </div>
    );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
export function ContributionGraphFooter({ className }: { className?: string }) {
    const { data } = React.useContext(ContributionGraphContext);
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className={cn("flex items-center justify-between mt-2 text-xs text-muted-foreground", className)}>
            <span>{total} activities in the last year</span>
            <div className="flex items-center gap-1">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((l) => (
                    <div
                        key={l}
                        data-level={l}
                        className={cn(
                            "w-[13px] h-[13px] rounded-sm",
                            "data-[level='0']:bg-muted",
                            "data-[level='1']:bg-primary/20",
                            "data-[level='2']:bg-primary/45",
                            "data-[level='3']:bg-primary/70",
                            "data-[level='4']:bg-primary",
                        )}
                    />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}
