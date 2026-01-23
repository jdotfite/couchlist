'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tooltip } from 'recharts';

interface ActivityData {
  date: string;
  count: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getColorForCount(count: number, maxCount: number): string {
  if (count === 0) return '#18181b'; // zinc-900
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);

  if (intensity <= 0.25) return '#3b0764'; // purple-950
  if (intensity <= 0.5) return '#6b21a8'; // purple-800
  if (intensity <= 0.75) return '#9333ea'; // purple-600
  return '#a855f7'; // purple-500
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  // Build a map of date -> count
  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(({ date, count }) => {
      map.set(date, count);
    });
    return map;
  }, [data]);

  // Generate last 52 weeks of data
  const weeks = useMemo(() => {
    const today = new Date();
    const weeks: { date: Date; count: number }[][] = [];

    // Start from 52 weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Go back ~52 weeks
    // Align to Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentDate = new Date(startDate);
    let currentWeek: { date: Date; count: number }[] = [];

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      currentWeek.push({
        date: new Date(currentDate),
        count: activityMap.get(dateStr) || 0,
      });

      if (currentDate.getDay() === 6) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [activityMap]);

  // Find max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(...data.map(d => d.count), 1);
  }, [data]);

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      if (week.length > 0) {
        const month = week[0].date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  // Calculate total
  const totalCount = useMemo(() => {
    return data.reduce((sum, d) => sum + d.count, 0);
  }, [data]);

  const cellSize = 11;
  const gap = 3;
  const dayLabelWidth = 28;

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex mb-1" style={{ marginLeft: dayLabelWidth }}>
        {monthLabels.map(({ month, weekIndex }, i) => (
          <div
            key={i}
            className="text-xs text-gray-500"
            style={{
              position: 'absolute',
              left: dayLabelWidth + weekIndex * (cellSize + gap),
            }}
          >
            {month}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex mt-4">
        {/* Day labels */}
        <div className="flex flex-col justify-around pr-2" style={{ width: dayLabelWidth }}>
          <span className="text-xs text-gray-500 h-3 leading-3">Mon</span>
          <span className="text-xs text-gray-500 h-3 leading-3">Wed</span>
          <span className="text-xs text-gray-500 h-3 leading-3">Fri</span>
        </div>

        {/* Heatmap cells */}
        <div className="flex gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const dayData = week.find(d => d.date.getDay() === dayIndex);

                if (!dayData) {
                  return (
                    <div
                      key={dayIndex}
                      className="rounded-sm"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: 'transparent',
                      }}
                    />
                  );
                }

                const dateStr = dayData.date.toISOString().split('T')[0];
                const color = getColorForCount(dayData.count, maxCount);

                return (
                  <div
                    key={dayIndex}
                    className="rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/30"
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: color,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({
                        date: dateStr,
                        count: dayData.count,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-500">
          {totalCount} titles in the last year
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: getColorForCount(intensity * maxCount, maxCount),
              }}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 px-2 py-1 bg-zinc-800 text-white text-xs rounded shadow-lg pointer-events-none"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 30,
            transform: 'translateX(-50%)',
          }}
        >
          <strong>{hoveredCell.count}</strong> {hoveredCell.count === 1 ? 'title' : 'titles'} on{' '}
          {new Date(hoveredCell.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      )}
    </div>
  );
}
