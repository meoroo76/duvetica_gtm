'use client';

import { Milestone } from '@/lib/types';

interface MilestoneBarProps {
  milestones: Milestone[];
  season: '27SS' | '26FW';
  dates: string[];
}

export default function MilestoneBar({ milestones, season, dates }: MilestoneBarProps) {
  const seasonMilestones = milestones
    .filter((m) => m.season === season)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col">
      {dates.map((date) => {
        const milestone = seasonMilestones.find(
          (m) => date >= m.startDate && date <= m.endDate
        );

        if (!milestone) {
          return (
            <div key={date} className="h-[32px] border-b border-gray-100" />
          );
        }

        const isStart = date === milestone.startDate;

        return (
          <div
            key={date}
            className="h-[32px] border-b border-gray-100 flex items-center"
            style={{ backgroundColor: `${milestone.color}15` }}
          >
            {isStart && (
              <div
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap truncate w-full"
                style={{ color: milestone.color }}
                title={milestone.name}
              >
                {milestone.name}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
