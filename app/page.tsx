import { getDashboardData, getUserProfile, getRecentGreetingIds, getSRItemsDueCount } from '@/lib/db';
import { getTimeMode } from '@/lib/time-mode';
import { selectGreeting } from '@/lib/greeting';
import MomentumDashboard from '@/components/momentum-dashboard';

export const dynamic = "force-dynamic";

export default function Home() {
  const data = getDashboardData();
  const profile = getUserProfile();
  const recentIds = getRecentGreetingIds(30);
  const srDueCount = getSRItemsDueCount();

  const mode = getTimeMode(); // uses server time — acceptable for IST
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

  const greeting = selectGreeting({
    mode,
    loadLevel,
    dayOfWeek: new Date().getDay(),
    isAbsent: false, // TODO Phase 5: detect from last_opened timestamp
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
