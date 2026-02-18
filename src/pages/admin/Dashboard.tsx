import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLeads } from "@/lib/leads";
import { Users, TrendingUp, Calendar, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(210,60%,50%)", "hsl(209,50%,35%)", "hsl(210,40%,60%)", "hsl(210,33%,70%)"];

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
      const d = l.createdAt.slice(0, 10);
      if (days[d] !== undefined) days[d]++;
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
    leads.forEach((l) => { if (l.locationType.includes("Home")) home++; else biz++; });
    return [
      { name: "Home", value: home },
      { name: "Business", value: biz },
    ].filter((d) => d.value > 0);
  }, [leads]);

  const kpis = [
    { label: "Today", value: leadsToday, icon: Clock },
    { label: "This Week", value: leadsWeek, icon: Calendar },
    { label: "This Month", value: leadsMonth, icon: TrendingUp },
    { label: "Total", value: leads.length, icon: Users },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 tracking-tight">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-2xl border border-border/50 p-6 hover:border-primary/30 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.label}</span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <k.icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight"><AnimatedNumber value={k.value} /></p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h3 className="font-semibold text-sm mb-5">Leads per Day (30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(209,40%,18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(210,15%,55%)" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(210,15%,55%)" }} />
              <Tooltip contentStyle={{ background: "hsl(209,65%,10%)", border: "1px solid hsl(209,40%,18%)", borderRadius: "12px", fontSize: "12px" }} />
              <Line type="monotone" dataKey="count" stroke="hsl(210,60%,50%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-6">
          <h3 className="font-semibold text-sm mb-5">Top Services</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(209,40%,18%)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(210,15%,55%)" }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(210,15%,55%)" }} />
              <Tooltip contentStyle={{ background: "hsl(209,65%,10%)", border: "1px solid hsl(209,40%,18%)", borderRadius: "12px", fontSize: "12px" }} />
              <Bar dataKey="count" fill="hsl(210,60%,50%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {locationData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8 max-w-md">
          <h3 className="font-semibold text-sm mb-5">Location Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} label>
                {locationData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(209,65%,10%)", border: "1px solid hsl(209,40%,18%)", borderRadius: "12px", fontSize: "12px" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent leads */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h3 className="font-semibold text-sm">Recent Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">ZIP</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-border/30 hover:bg-accent/30 cursor-pointer transition-colors duration-150"
                  onClick={() => navigate(`/admin/leads/${l.id}`)}
                >
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">{l.serviceSlug}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.zip}</td>
                  <td className="px-5 py-4 font-medium">{l.fullName}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.email}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      l.status === "New" ? "bg-primary/15 text-primary" :
                      l.status === "Contacted" ? "bg-amber-500/15 text-amber-400" :
                      l.status === "Won" ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">No leads yet. Submit a quote to see data here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
