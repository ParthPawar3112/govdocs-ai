// Now that Document Management (Phase 4) exists, stats and recent documents
// are fetched for real - no more hardcoded zeros. The loading skeleton is
// tied to the actual fetch instead of an artificial delay.
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
import AboutSection from "./AboutSection";
import { getDocumentStatsRequest, listDocumentsRequest } from "../../api/documents";
import { useToast } from "../../hooks/useToast";

const emptyStats = { total: 0, uploaded_today: 0, pending: 0, approved: 0, rejected: 0 };

export default function DashboardHome({ user, sessionStartedAt, onNavigate }) {
  const { showToast } = useToast();
  const [stats, setStats] = useState(emptyStats);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getDocumentStatsRequest(),
      listDocumentsRequest({ limit: 5 }),
      listDocumentsRequest({ status: "Pending", limit: 5 }),
    ])
      .then(([statsRes, recentRes, pendingRes]) => {
        if (!isMounted) return;
        setStats(statsRes.data);
        setRecentDocuments(recentRes.data.items);
        setPendingDocuments(pendingRes.data.items);
      })
      .catch(() => {
        if (isMounted) showToast("Could not load dashboard data.", "error");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    { key: "total", label: "Total documents", value: stats.total, icon: FileText, tone: "primary" },
    { key: "pending", label: "Pending", value: stats.pending, icon: Clock, tone: "warning" },
    { key: "approved", label: "Approved", value: stats.approved, icon: CheckCircle2, tone: "success" },
    { key: "rejected", label: "Rejected", value: stats.rejected, icon: XCircle, tone: "danger" },
  ];

  return (
    <div>
      <DashboardHeader
        username={user.username}
        pendingCount={stats.pending}
        documentCount={stats.total}
        uploadedToday={stats.uploaded_today}
      />

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isLoading
          ? statCards.map((stat) => <StatCardSkeleton key={stat.key} />)
          : statCards.map(({ key, ...card }) => <StatCard key={key} {...card} />)}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <RecentDocuments documents={recentDocuments} isLoading={isLoading} onNavigate={onNavigate} />
          <PendingApprovals documents={pendingDocuments} isLoading={isLoading} onNavigate={onNavigate} />
        </div>
        <div className="space-y-6">
          <QuickActions role={user.role} onNavigate={onNavigate} />
          <ActivityTimeline username={user.username} sessionStartedAt={sessionStartedAt} />
          <Announcements />
          <SystemStatus />
          <AboutSection />
        </div>
      </section>
    </div>
  );
}
