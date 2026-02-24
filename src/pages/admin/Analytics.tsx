import { useMemo, useState, useEffect } from "react";
import { getLeads } from "@/lib/leads";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["#2563eb", "#7c3aed", "#059669", "#0b2a4a"];

interface ChartDataPoint {
  date: string;
  count: number;
}

interface ServiceDataPoint {
  name: string;
  count: number;
}

interface LocationDataPoint {
  name: string;
  value: number;
}

const Analytics = () => {
  const [hasError, setHasError] = useState(false);

  try {
    const leads = useMemo(() => {
      try {
        const data = getLeads();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }, []);

    const now = new Date();

    const dailyData: ChartDataPoint[] = useMemo(() => {
      try {
        const days: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
          days[d] = 0;
        }
        leads.forEach((l) => {
          try {
            const d = l.createdAt?.slice(0, 10);
            if (d && days[d] !== undefined) days[d]++;
          } catch {
            // Skip malformed lead
          }
        });
        return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), count }));
      } catch {
        return [];
      }
    }, [leads]);

    const serviceData: ServiceDataPoint[] = useMemo(() => {
      try {
        const map: Record<string, number> = {};
        leads.forEach((l) => {
          try {
            const slug = l.serviceSlug || "unknown";
            map[slug] = (map[slug] || 0) + 1;
          } catch {
            // Skip malformed lead
          }
        });
        return Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      } catch {
        return [];
      }
    }, [leads]);

    const locationData: LocationDataPoint[] = useMemo(() => {
      try {
        let home = 0, biz = 0;
        leads.forEach((l) => {
          try {
            const locationType = l.locationType || "";
            if (locationType.includes("Home")) home++;
            else if (locationType.includes("Business")) biz++;
          } catch {
            // Skip malformed lead
          }
        });
        return [
          { name: "Home", value: home },
          { name: "Business", value: biz },
        ].filter((d) => d.value > 0);
      } catch {
        return [];
      }
    }, [leads]);

    if (leads.length === 0) {
      return (
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-8 text-gray-900">Analytics</h1>
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="h-12 w-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm font-medium text-gray-900">No data available yet</p>
              <p className="text-xs text-gray-600 mt-1">Submit quotes to see analytics here</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Analytics</h1>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Leads */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-sm text-gray-900 mb-6">Leads per Day (30 days)</h3>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p className="text-sm">No data available</p>
              </div>
            )}
          </div>

          {/* Top Services */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="font-semibold text-sm text-gray-900 mb-6">Top Services</h3>
            {serviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p className="text-sm">No data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Location Breakdown */}
        {locationData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 max-w-md">
            <h3 className="font-semibold text-sm text-gray-900 mb-6">Location Type</h3>
            <ResponsiveContainer width="100%" height={250}>
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
      </div>
    );
  } catch (error) {
    console.error("Analytics error:", error);
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Analytics</h1>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-gray-600 text-sm">Unable to load analytics. Please refresh the page.</p>
        </div>
      </div>
    );
  }
};

export default Analytics;
