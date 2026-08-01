import { useEffect, useState } from "react";
import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import StatCard from "./StatCard";
import { StatCardSkeleton } from "../ui/Skeleton";
import DashboardHeader from "./DashboardHeader";
import RecentDocuments from "./RecentDocuments";
import ActivityTimeline from "./ActivityTimeline";
import PendingApprovals from "./PendingApprovals";
import QuickActions from "./QuickActions";
import Announcements from "./Announcements";
import SystemStatus from "./SystemStatus";

// All four counts are genuinely zero right now - Document Upload (Phase 4)
// and Approval Workflow (Phase 7) haven't been built, so there is no real
// document data to show. These wire up to real counts the moment that data
// exists; nothing here is a mock number standing in for a real one.
const STATS = [
  { key: "total", label: "Total documents", value: 0, icon: FileText, tone: "primary" },
  { key: "pending", label: "Pending", value: 0, icon: Clock, tone: "warning" },
  { key: "approved", label: "Approved", value: 0, icon: CheckCircle2, tone: "success" },
  { key: "rejected", label: "Rejected", value: 0, icon: XCircle, tone: "danger" },
];

export default function DashboardHome({ user, sessionStartedAt, onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <DashboardHeader username={user.username} pendingCount={0} documentCount={0} />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isLoading
          ? STATS.map((stat) => <StatCardSkeleton key={stat.key} />)
          : STATS.map((stat) => <StatCard key={stat.key} {...stat} />)}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RecentDocuments />
          <PendingApprovals />
        </div>
        <div className="space-y-6">
          <QuickActions role={user.role} onNavigate={onNavigate} />
          <ActivityTimeline username={user.username} sessionStartedAt={sessionStartedAt} />
          <Announcements />
          <SystemStatus />
        </div>
      </section>
    </div>
  );
}
