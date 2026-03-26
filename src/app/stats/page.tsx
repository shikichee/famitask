'use client';

import { AppShell } from '@/components/app-shell';
import { ContributionChart } from '@/components/stats/contribution-chart';
import { StreakDisplay } from '@/components/stats/streak-display';
import { WeeklySummary } from '@/components/stats/weekly-summary';
import { useFamilyMembers } from '@/hooks/use-family-members';
import { useCompletions } from '@/hooks/use-completions';

export default function StatsPage() {
  const members = useFamilyMembers();
  const { completions } = useCompletions();

  return (
    <AppShell>
      {({ isChild }) => (
        <div className="space-y-6">
          <ContributionChart
            members={members}
            completions={completions}
            isChild={isChild}
          />
          <StreakDisplay
            members={members}
            completions={completions}
            isChild={isChild}
          />
          <WeeklySummary
            members={members}
            completions={completions}
            isChild={isChild}
          />
        </div>
      )}
    </AppShell>
  );
}
