import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "@/lib/navigation-compat";
import { useUser } from "@/context/UserContext";
import { getLeads, type Lead } from "@/lib/leads";
import { Users, TrendingUp, Calendar, Clock, DollarSign, FileText, CheckCircle2, AlertCircle, Play, ClipboardList, Plus, Sparkles, Check, Loader2, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { fetchLoginAttempts, type LoginAttempt } from "@/lib/admin-auth";
import { getEstimates, type Estimate } from "@/lib/estimates";
import { getServiceJobs } from "@/lib/service-jobs";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#0b2a4a"];

const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display}</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [attemptFilter, setAttemptFilter] = useState<"all" | "success" | "fail">("all");
  const [showLoginAttempts, setShowLoginAttempts] = useState(false);

  const userRole = user?.organization?.role;

  if (userRole === "worker") {
    return <WorkerDashboard />;
  }

  useEffect(() => {
    if (isUserLoading) return;
    let mounted = true;

    const orgId = user?.organization?.id;

    Promise.all([
      getLeads(orgId).catch(() => []),
      getEstimates(orgId).catch(() => []),
      getServiceJobs(orgId).catch(() => [])
    ]).then(([l, e, j]) => {
      if (!mounted) return;
      setLeads(l || []);
      setEstimates(e || []);
      setActiveJobs(j || []);
    });

    return () => {
      mounted = false;
    };
  }, [user?.id, user?.organization?.id, isUserLoading]);

  // Stable date boundaries for KPIs
  const dateBoundaries = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    return { today, weekAgo, monthAgo, now };
  }, []);

  const leadsToday = leads.filter((l) => l.createdAt.slice(0, 10) === dateBoundaries.today).length;
  const leadsWeek = leads.filter((l) => l.createdAt >= dateBoundaries.weekAgo).length;
  const leadsMonth = leads.filter((l) => l.createdAt >= dateBoundaries.monthAgo).length;

  const dailyData = useMemo(() => {
    const now = dateBoundaries.now;
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      days[d] = 0;
    }
    leads.forEach((l) => {
      const d = l.createdAt?.slice(0, 10);
      if (d && days[d] !== undefined) days[d]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
  }, [leads, dateBoundaries]);

  const serviceData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => { map[l.serviceSlug] = (map[l.serviceSlug] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [leads]);

  const locationData = useMemo(() => {
    let home = 0, biz = 0;
    leads.forEach((l) => { if (l.locationType?.includes("Home")) home++; else if (l.locationType?.includes("Business")) biz++; });
    return [
      { name: "Home", value: home },
      { name: "Business", value: biz },
    ].filter((d) => d.value > 0);
  }, [leads]);

  const kpis = [
    { label: "Today", value: leadsToday, icon: Clock, color: "#2563eb" },
    { label: "This Week", value: leadsWeek, icon: Calendar, color: "#7c3aed" },
    { label: "This Month", value: leadsMonth, icon: TrendingUp, color: "#059669" },
    { label: "Total Leads", value: leads.length, icon: Users, color: "#0b2a4a" },
  ];

  const financialKpis = useMemo(() => {
    const totalRevenue = estimates.reduce((acc, e) => acc + (e.amount_paid || 0), 0);
    const outstanding = estimates.reduce((acc, e) => acc + (e.balance_due || 0), 0);
    const pendingCount = estimates.filter(e => e.status === 'Sent' || e.status === 'Viewed').length;
    const approvedCount = estimates.filter(e => e.status === 'Approved').length;

    return [
      { label: "Total Revenue", value: totalRevenue, icon: DollarSign, color: "#059669", isCurrency: true },
      { label: "Outstanding", value: outstanding, icon: AlertCircle, color: "#ea580c", isCurrency: true },
      { label: "Pending Issues", value: pendingCount, icon: FileText, color: "#2563eb" },
      { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "#7c3aed" },
    ];
  }, [estimates]);

  const unpaidEstimates = useMemo(() => {
    return estimates.filter(e => (e.status === 'Approved' || e.status === 'Sent' || e.status === 'Viewed') && ((e.balance_due ?? e.total_amount) > 0));
  }, [estimates]);

  useEffect(() => {
    let active = true;
    const status = attemptFilter === "all" ? undefined : attemptFilter;
    fetchLoginAttempts(status)
      .then((attempts) => {
        if (!active) return;
        setLoginAttempts(attempts.slice(0, 50));
      })
      .catch(() => {
        if (!active) return;
        setLoginAttempts([]);
      });
    return () => {
      active = false;
    };
  }, [attemptFilter]);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">H&A Construction Operations & Overview</p>
      </div>

      {/* Mobile-First Quick Actions */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          <button
            onClick={() => navigate("/admin/estimates/new")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all text-center group"
          >
            <Plus className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">+ New Estimate</span>
          </button>
          <button
            onClick={() => navigate("/admin/inbox")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all text-center group"
          >
            <Users className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">+ Client Request</span>
          </button>
          <button
            onClick={() => navigate("/admin/client-receipts")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-all text-center group"
          >
            <DollarSign className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">+ Record Payment</span>
          </button>
          <button
            onClick={() => navigate("/admin/expenses")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-all text-center group"
          >
            <FileText className="h-5 w-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">+ New Expense</span>
          </button>
          <button
            onClick={() => navigate("/admin/estimates")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-xl shadow-sm transition-all text-center group"
          >
            <ClipboardList className="h-5 w-5 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Pending Estimates</span>
          </button>
          <button
            onClick={() => navigate("/admin/client-receipts")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-xl shadow-sm transition-all text-center group"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Client Receipts</span>
          </button>
          <button
            onClick={() => navigate("/admin/reimbursements")}
            className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-xl shadow-sm transition-all text-center group col-span-2 sm:col-span-1"
          >
            <TrendingUp className="h-5 w-5 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Reimbursements</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-400" />
          Financial Insights
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {financialKpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:border-gray-300 transition-all duration-200 shadow-sm">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-widest">{k.label}</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                  <k.icon className="h-4 w-4" style={{ color: k.color }} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {k.isCurrency && "$"}
                {k.isCurrency ? k.value.toLocaleString() : <AnimatedNumber value={k.value} />}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Jobs / Obras em Andamento */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Active Jobs / Obras em Andamento
          </h2>
          <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
            {activeJobs.length} active
          </span>
        </div>

        {activeJobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-xs sm:text-sm text-gray-500">
            No active jobs registered yet. Convert an approved estimate to start a job.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeJobs.slice(0, 6).map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/admin/jobs/${job.id}`)}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      job.status === "completed" ? "bg-green-100 text-green-800" :
                      job.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {job.status?.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">#{job.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors">
                    {job.title || `Job #${job.id.slice(0, 8)}`}
                  </h3>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/jobs/${job.id}`);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    Open Project Workspace →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saldos a Receber / Outstanding Receivables */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Saldos a Receber / Outstanding Balances
          </h2>
          <span className="text-xs font-bold bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full">
            {unpaidEstimates.length} pending
          </span>
        </div>

        {unpaidEstimates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-xs sm:text-sm text-gray-500">
            All estimates are fully paid! No outstanding balances.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unpaidEstimates.slice(0, 6).map((est) => (
              <div key={est.id} className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-orange-500 p-5 shadow-sm hover:border-gray-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-900">{est.client_name}</span>
                    <span className="text-[10px] uppercase font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">{est.status}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Total</p>
                      <p className="text-sm font-bold text-gray-700">${est.total_amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider text-orange-600 font-bold">Balance Due</p>
                      <p className="text-lg font-black text-orange-600">${(est.balance_due ?? est.total_amount).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/admin/estimates/${est.id}`)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center gap-1"
                  >
                    <DollarSign className="h-3.5 w-3.5" /> Register Payment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads KPIs & Charts */}
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-gray-400" />
          Leads & Performance
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:border-gray-300 transition-all duration-200">
              <div style={{ borderTop: `3px solid ${k.color}` }} className="mb-3 sm:mb-4" />
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-widest">{k.label}</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                  <k.icon className="h-4 w-4" style={{ color: k.color }} strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight"><AnimatedNumber value={k.value} /></p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-4">Leads per Day (30 days)</h3>
            {dailyData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-4">Top Services</h3>
            {serviceData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={serviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Leads Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="font-semibold text-xs sm:text-sm text-gray-900">Recent Leads / Client Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wider">Date</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wider">Service</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 sm:px-6 py-3 font-semibold text-gray-900 text-[10px] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 10).map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/leads/${l.id}`)}
                >
                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-gray-600">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 sm:px-6 py-3 text-gray-900 font-medium">{l.serviceSlug}</td>
                  <td className="px-4 sm:px-6 py-3 text-gray-900 font-semibold">{l.fullName}</td>
                  <td className="px-4 sm:px-6 py-3">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${l.status === "New" ? "bg-blue-100 text-blue-700" :
                      l.status === "Contacted" ? "bg-orange-100 text-orange-700" :
                        l.status === "Approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No leads logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collapsible Security & System Logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowLoginAttempts(!showLoginAttempts)}
          className="w-full p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
        >
          <div className="text-left">
            <h3 className="font-semibold text-xs sm:text-sm text-gray-900">Security & Login Logs</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Click to expand recent system authentication attempts</p>
          </div>
          {showLoginAttempts ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </button>

        {showLoginAttempts && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 text-[10px] uppercase">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 text-[10px] uppercase">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 text-[10px] uppercase">IP</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 text-[10px] uppercase">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {loginAttempts.slice(0, 15).map((attempt) => (
                  <tr key={`${attempt.timestamp}-${attempt.email}`} className="border-t border-gray-200">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{new Date(attempt.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{attempt.email}</td>
                    <td className="px-4 py-2.5 text-gray-600">{attempt.ip}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${attempt.outcome === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {attempt.outcome}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


const WorkerDashboard = () => {
  const { user } = useUser();
  const [jobs, setJobs] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<Record<string, any[]>>({});
  const [files, setFiles] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [newFileTitle, setNewFileTitle] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkerData();
  }, [user?.id, user?.organization?.id]);

  const loadWorkerData = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from("service_jobs")
        .select(`
          id,
          status,
          scheduled_at,
          address_released_to_worker,
          lead_id,
          lead:leads (
            id,
            fullName,
            phone,
            address,
            serviceSlug
          )
        `);

      if (jobsError) {
        console.error("Error loading worker jobs:", jobsError);
      } else if (jobsData) {
        setJobs(jobsData);
        for (const job of jobsData) {
          await loadChecklistsForJob(job.id);
          await loadFilesForJob(job.id);
        }
      }
    } catch (err) {
      console.error("Worker load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadChecklistsForJob = async (jobId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("service_checklists")
      .select(`
        id,
        title,
        tasks:checklist_tasks (
          id,
          description,
          is_completed
        )
      `)
      .eq("service_job_id", jobId);

    if (!error && data) {
      setChecklists(prev => ({ ...prev, [jobId]: data }));
    }
  };

  const loadFilesForJob = async (jobId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("service_files")
      .select("id, title, file_url, created_at, uploaded_by")
      .eq("service_job_id", jobId);

    if (!error && data) {
      setFiles(prev => ({ ...prev, [jobId]: data }));
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    if (!supabase) return;
    setActionLoading(prev => ({ ...prev, [jobId]: true }));
    try {
      const { error } = await supabase
        .from("service_jobs")
        .update({
          status: newStatus,
          started_at: newStatus === "in_progress" ? new Date().toISOString() : undefined,
          completed_at: newStatus === "completed" ? new Date().toISOString() : undefined,
        })
        .eq("id", jobId);

      if (error) {
        toast.error(`Failed to update job status: ${error.message}`);
      } else {
        toast.success(`Job marked as ${newStatus.replace("_", " ")}!`);
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating job status.");
    } finally {
      setActionLoading(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleToggleTask = async (jobId: string, taskId: string, currentCompleted: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("checklist_tasks")
        .update({ is_completed: !currentCompleted })
        .eq("id", taskId);

      if (error) {
        toast.error(`Failed to toggle task: ${error.message}`);
      } else {
        await loadChecklistsForJob(jobId);
      }
    } catch (err: any) {
      toast.error(err.message || "Error toggling task.");
    }
  };

  const handleAddFile = async (jobId: string) => {
    if (!supabase || !user) return;
    if (!newFileTitle.trim()) {
      toast.error("Please enter a title for the file.");
      return;
    }
    const urlToUse = newFileUrl.trim() || "https://api.dicebear.com/7.x/shapes/svg?seed=" + encodeURIComponent(newFileTitle);
    
    try {
      const { error } = await supabase
        .from("service_files")
        .insert({
          organization_id: user.organization?.id,
          service_job_id: jobId,
          file_url: urlToUse,
          title: newFileTitle,
          file_type: "image",
          mime_type: "image/png",
          file_size: 10240,
          visibility: "internal",
          uploaded_by: user.id
        });

      if (error) {
        toast.error(`Failed to add file: ${error.message}`);
      } else {
        toast.success("File added successfully!");
        setNewFileTitle("");
        setNewFileUrl("");
        await loadFilesForJob(jobId);
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding file.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Operational Panel</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900">My Assigned Jobs</h1>
        <p className="text-sm text-slate-600 mt-1">Manage your active service orders and checklists.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-12 w-12 text-slate-400 mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Jobs Assigned</h3>
          <p className="text-sm text-slate-600">You don't have any active jobs assigned to you at the moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map(job => {
            const jobChecklists = checklists[job.id] || [];
            const jobFiles = files[job.id] || [];
            const isExpanded = expandedJobId === job.id;
            
            let totalTasks = 0;
            let completedTasks = 0;
            jobChecklists.forEach(c => {
              c.tasks?.forEach((t: any) => {
                totalTasks++;
                if (t.is_completed) completedTasks++;
              });
            });
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <div key={job.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        job.status === "completed" ? "bg-green-100 text-green-800" :
                        job.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      }`}>
                        {job.status.replace("_", " ")}
                      </span>
                      {job.scheduled_at && (
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(job.scheduled_at).toLocaleDateString()} at {new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{job.lead?.serviceSlug || "Service Job"}</h2>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{job.lead?.fullName}</p>
                    {job.address_released_to_worker && job.lead?.address && (
                      <p className="text-xs text-slate-500 mt-0.5">{job.lead.address}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {job.status === "scheduled" && (
                      <button
                        onClick={() => handleUpdateJobStatus(job.id, "in_progress")}
                        disabled={actionLoading[job.id]}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <Play size={14} /> Start Job
                      </button>
                    )}
                    {job.status === "in_progress" && (
                      <button
                        onClick={() => handleUpdateJobStatus(job.id, "completed")}
                        disabled={actionLoading[job.id]}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Complete Job
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      {isExpanded ? "Collapse" : "View Checklist & Media"}
                    </button>
                  </div>
                </div>

                {totalTasks > 0 && (
                  <div className="h-1.5 bg-slate-100 w-full relative">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}

                {isExpanded && (
                  <div className="p-6 space-y-8 divide-y divide-slate-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Job Checklists ({progress}% complete)</h3>
                      {jobChecklists.length === 0 ? (
                        <p className="text-sm text-slate-500">No checklists set up for this job.</p>
                      ) : (
                        <div className="space-y-4">
                          {jobChecklists.map((c: any) => (
                            <div key={c.id} className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                              <h4 className="font-bold text-sm text-slate-900 mb-3">{c.title}</h4>
                              <div className="space-y-2">
                                {c.tasks?.map((t: any) => (
                                  <label key={t.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-50/80 transition-all select-none">
                                    <input
                                      type="checkbox"
                                      checked={t.is_completed}
                                      onChange={() => handleToggleTask(job.id, t.id, t.is_completed)}
                                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                                    />
                                    <span className={`text-xs font-medium text-slate-800 ${t.is_completed ? "line-through text-slate-400" : ""}`}>
                                      {t.description}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-6">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Job Files / Photos</h3>
                      
                      {jobFiles.length === 0 ? (
                        <p className="text-sm text-slate-500 mb-4">No photos uploaded yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          {jobFiles.map((f: any) => (
                            <div key={f.id} className="group relative rounded-xl border border-slate-200 overflow-hidden shadow-sm aspect-square bg-slate-50">
                              <img src={f.file_url} alt={f.title} className="w-full h-full object-cover" />
                              <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-2 text-white">
                                <p className="text-[10px] font-bold truncate">{f.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700">Add Service Photo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Photo Title (e.g. Work Progress)"
                            value={newFileTitle}
                            onChange={e => setNewFileTitle(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                          />
                          <input
                            type="text"
                            placeholder="Photo URL (Optional - default generated)"
                            value={newFileUrl}
                            onChange={e => setNewFileUrl(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                          />
                        </div>
                        <button
                          onClick={() => handleAddFile(job.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all"
                        >
                          <Plus size={12} /> Add Photo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
