import { getDashboardData, getUserProfile, getRecentGreetingIds, getSRItemsDueCount, isUserAbsent } from '@/lib/db';
import { getTimeMode } from '@/lib/time-mode';
import { selectGreeting } from '@/lib/greeting';
import MomentumDashboard from '@/components/momentum-dashboard';

export const dynamic = "force-dynamic";

export default function Home() {
  const data = getDashboardData();
  const profile = getUserProfile();
  const recentIds = getRecentGreetingIds(30);
  const srDueCount = getSRItemsDueCount();

  const schedule = profile
    ? {
        sadhana_morning_end: profile.sadhana_morning_end,
        sadhana_afternoon_start: profile.sadhana_afternoon_start,
        sadhana_afternoon_end: profile.sadhana_afternoon_end,
        work_start: profile.work_start,
        work_end: profile.work_end,
      }
    : undefined;

  // Use stored timezone for server-side time calculation
  const now = profile?.timezone
    ? new Date(new Date().toLocaleString('en-US', { timeZone: profile.timezone }))
    : new Date();

  const mode = getTimeMode(now, schedule);
  // Note: this is an intentionally synchronous Server Component — all DB calls
  // use DatabaseSync from node:sqlite. Do NOT add async/await here.
  const activeCount =
    data.priorities.filter((p) => p.status === 'active').length +
    data.quickTasks.filter((t) => t.status === 'active').length;

  const loadLevel =
    activeCount === 0 ? 'empty'
    : activeCount > 8 ? 'overloaded'
    : activeCount > 5 ? 'full'
    : 'normal';

  const isAbsent = isUserAbsent(3);

  const greeting = selectGreeting({
    mode,
    loadLevel,
    dayOfWeek: now.getDay(),
    isAbsent,
    recentlyShownIds: recentIds,
  });

  return (
    <MomentumDashboard
      data={data}
      greeting={greeting}
      currentMode={mode}
      userProfile={profile}
      srDueCount={srDueCount}
    />
  );
}
