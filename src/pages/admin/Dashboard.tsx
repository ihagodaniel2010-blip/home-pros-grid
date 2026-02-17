import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getLeads } from "@/lib/leads";
import { Users, TrendingUp, Calendar, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(209,75%,17%)", "hsl(209,60%,25%)", "hsl(210,40%,50%)", "hsl(210,33%,70%)"];

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

  // Chart: leads per day (last 30 days)
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

  // Chart: leads by service
  const serviceData = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => { map[l.serviceSlug] = (map[l.serviceSlug] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [leads]);

  // Chart: location type
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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{k.label}</span>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4 text-sm">Leads per Day (30 days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(209,75%,17%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4 text-sm">Top Services</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={serviceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,90%)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(209,75%,17%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {locationData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-8 max-w-md">
          <h3 className="font-semibold mb-4 text-sm">Location Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={locationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                {locationData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent leads */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-sm">Recent Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ZIP</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 20).map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/leads/${l.id}`)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{l.serviceSlug}</td>
                  <td className="px-4 py-3">{l.zip}</td>
                  <td className="px-4 py-3">{l.fullName}</td>
                  <td className="px-4 py-3">{l.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      l.status === "New" ? "bg-primary/10 text-primary" :
                      l.status === "Contacted" ? "bg-accent text-accent-foreground" :
                      l.status === "Won" ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No leads yet. Submit a quote to see data here.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
