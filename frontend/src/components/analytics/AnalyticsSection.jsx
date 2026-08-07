// Phase 8 - Admin-only analytics dashboard. Aggregates come from
// app/services/analytics_service.py; this component only fetches and lays
// them out - StatCard, Card, EmptyState, Skeleton are all reused from the
// existing design system, nothing new invented for the stat grid itself.
import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Clock, FileText, FolderOpen, XCircle } from "lucide-react";
import Card from "../ui/Card";
import { StatCardSkeleton } from "../ui/Skeleton";
import StatCard from "../dashboard/StatCard";
import UploadsOverTimeChart from "./UploadsOverTimeChart";
import ApprovalRatioChart from "./ApprovalRatioChart";
import BreakdownChart from "./BreakdownChart";
import SuccessRateBars from "./SuccessRateBars";
import {
  getAnalyticsSummaryRequest,
  getCategoryBreakdownRequest,
  getDepartmentBreakdownRequest,
  getUploadsOverTimeRequest,
} from "../../api/analytics";
import { useToast } from "../../hooks/useToast";

export default function AnalyticsSection() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [uploadsOverTime, setUploadsOverTime] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAnalyticsSummaryRequest(),
      getUploadsOverTimeRequest(30),
      getDepartmentBreakdownRequest(),
      getCategoryBreakdownRequest(),
    ])
      .then(([summaryRes, uploadsRes, deptRes, catRes]) => {
        if (!isMounted) return;
        setSummary(summaryRes.data);
        setUploadsOverTime(uploadsRes.data);
        setDepartments(deptRes.data);
        setCategories(catRes.data);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (error.response?.status === 403) setIsForbidden(true);
        else showToast("Could not load analytics.", "error");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isForbidden) {
    return (
      <Card>
        <p className="text-sm text-ink-soft">Analytics is available to Admin accounts only.</p>
      </Card>
    );
  }

  const statCards = summary
    ? [
        { key: "total", label: "Total documents", value: summary.total, icon: FileText, tone: "primary" },
        { key: "today", label: "Today's uploads", value: summary.uploaded_today, icon: Clock, tone: "primary" },
        { key: "approved", label: "Approved", value: summary.approved, icon: CheckCircle2, tone: "success" },
        { key: "rejected", label: "Rejected", value: summary.rejected, icon: XCircle, tone: "danger" },
      ]
    : [];

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Analytics</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink dark:text-slate-100">
          System analytics
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">Document processing and approval trends</p>
      </div>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map(({ key, ...card }) => <StatCard key={key} {...card} />)}
      </section>

      {!isLoading && summary && (
        <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary dark:bg-primary/15">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-ink-soft">Most common department</p>
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                {summary.most_common_department || "-"}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary dark:bg-primary/15">
              <FolderOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-ink-soft">Most common category</p>
              <p className="text-sm font-semibold text-ink dark:text-slate-100">
                {summary.most_common_category || "-"}
              </p>
            </div>
          </Card>
        </section>
      )}

      {!isLoading && (
        <>
          <section className="mt-6">
            <UploadsOverTimeChart data={uploadsOverTime} />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ApprovalRatioChart summary={summary} />
            <SuccessRateBars summary={summary} />
          </section>

          <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BreakdownChart title="Documents by department" data={departments} icon={Building2} />
            <BreakdownChart title="Documents by category" data={categories} icon={FolderOpen} />
          </section>
        </>
      )}
    </div>
  );
}
