import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeads } from "@/lib/leads";
import { Users, TrendingUp, Calendar, Clock } from "lucide-react";
import { fetchLoginAttempts, type LoginAttempt } from "@/lib/admin-auth";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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
  const leads = useMemo(() => getLeads(), []);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [attemptFilter, setAttemptFilter] = useState<"all" | "success" | "fail">("all");
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const leadsToday = leads.filter((l) => l.createdAt.slice(0, 10) === today).length;
  const leadsWeek = leads.filter((l) => l.createdAt >= weekAgo).length;
  const leadsMonth = leads.filter((l) => l.createdAt >= monthAgo).length;

  const dailyData = useMemo(() => {
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
  }, [leads]);

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
    { label: "Total", value: leads.length, icon: Users, color: "#0b2a4a" },
  ];

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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of all leads and metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-all duration-200">
            <div style={{ borderTop: `3px solid ${k.color}` }} className="mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">{k.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                <k.icon className="h-4 w-4" style={{ color: k.color }} strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight"><AnimatedNumber value={k.value} /></p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sm text-gray-900 mb-6">Leads per Day (30 days)</h3>
          {dailyData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-sm text-gray-900 mb-6">Top Services</h3>
          {serviceData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serviceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {locationData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 max-w-md">
          <h3 className="font-semibold text-sm text-gray-900 mb-6">Location Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} label>
                {locationData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm text-gray-900">Login Attempts</h3>
            <p className="text-xs text-gray-500 mt-1">Latest 50 attempts</p>
          </div>
          <select
            value={attemptFilter}
            onChange={(event) => setAttemptFilter(event.target.value as "all" | "success" | "fail")}
            className="rounded-lg border border-gray-200 py-2 px-3 text-xs uppercase tracking-widest text-gray-600"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="fail">Fail</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">IP</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Outcome</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody>
              {loginAttempts.map((attempt) => (
                <tr key={`${attempt.timestamp}-${attempt.email}`} className="border-t border-gray-200">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {new Date(attempt.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{attempt.email}</td>
                  <td className="px-6 py-4 text-gray-600">{attempt.ip}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      attempt.outcome === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{attempt.outcome}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{attempt.reason}</td>
                </tr>
              ))}
              {loginAttempts.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-600">No login attempts logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900">Recent Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Service</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">ZIP</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  onClick={() => navigate(`/admin/leads/${l.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">{l.serviceSlug}</td>
                  <td className="px-6 py-4 text-gray-600">{l.zip}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{l.fullName}</td>
                  <td className="px-6 py-4 text-gray-600">{l.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      l.status === "New" ? "bg-blue-100 text-blue-700" :
                      l.status === "Contacted" ? "bg-orange-100 text-orange-700" :
                      l.status === "Won" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-600">No leads yet. Submit a quote to see data here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
