import { MomentumDashboard } from "@/components/momentum-dashboard";
import { getDashboardData } from "@/lib/db";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const data = getDashboardData();
  const todayLabel = format(new Date(), "EEEE, MMM d");

  return <MomentumDashboard data={data} todayLabel={todayLabel} />;
}
