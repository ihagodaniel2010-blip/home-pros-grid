import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { getLeads, updateLead, type Lead } from "@/lib/leads";

type StatusFilter = "All" | "New" | "Contacted" | "Won" | "Lost";
type DateFilter = "All" | "Today" | "7d" | "30d";

const AdminInbox = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  useEffect(() => { getLeads().then(setLeads); }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("All");
  const [locFilter, setLocFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const now = new Date();

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "All" && l.status !== statusFilter) return false;
      if (locFilter !== "All" && !l.locationType.includes(locFilter)) return false;
      if (dateFilter !== "All") {
        const created = new Date(l.createdAt);
        if (dateFilter === "Today" && created.toDateString() !== now.toDateString()) return false;
        if (dateFilter === "7d" && now.getTime() - created.getTime() > 7 * 86400000) return false;
        if (dateFilter === "30d" && now.getTime() - created.getTime() > 30 * 86400000) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return l.fullName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.phone.includes(q) || l.zip.includes(q);
      }
      return true;
    });
  }, [leads, search, statusFilter, dateFilter, locFilter]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkUpdate = async (status: Lead["status"]) => {
    await Promise.all(Array.from(selected).map((id) => updateLead(id, { status })));
    const refreshed = await getLeads();
    setLeads(refreshed);
    setSelected(new Set());
  };

  const exportCsv = () => {
    const headers = "Date,Service,ZIP,Name,Email,Phone,Status\n";
    const rows = filtered.map((l) =>
      `${l.createdAt},${l.serviceSlug},${l.zip},"${l.fullName}",${l.email},${l.phone},${l.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const statuses: StatusFilter[] = ["All", "New", "Contacted", "Won", "Lost"];
  const dates: DateFilter[] = ["All", "Today", "7d", "30d"];

  const FilterPills = ({ items, active, onChange }: { items: string[]; active: string; onChange: (v: any) => void }) => (
    <div className="flex gap-1.5">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${active === item
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-300"
            }`}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and track all leads</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:text-gray-900 hover:border-gray-400 transition-all duration-200"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full h-10 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            placeholder="Search name, email, phone, zip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <FilterPills items={statuses} active={statusFilter} onChange={setStatusFilter} />
        <FilterPills items={dates} active={dateFilter} onChange={setDateFilter} />
        <FilterPills items={["All", "Home", "Business"]} active={locFilter} onChange={setLocFilter} />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-white rounded-lg border border-blue-300 bg-blue-50 p-4 mb-4 flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-900">{selected.size} selected</span>
          <button onClick={() => bulkUpdate("Contacted")} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">Mark Contacted</button>
          <button onClick={() => bulkUpdate("Won")} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">Mark Won</button>
          <button onClick={() => bulkUpdate("Lost")} className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">Mark Lost</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="rounded border-gray-300" onChange={(e) => {
                    setSelected(e.target.checked ? new Set(filtered.map(l => l.id)) : new Set());
                  }} />
                </th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">Date</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">Service</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">ZIP</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">Name</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">Email</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">Phone</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-900 text-xs uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-150">
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-gray-300" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600" onClick={() => navigate(`/admin/leads/${l.id}`)}>{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.serviceSlug}</td>
                  <td className="px-6 py-4 text-gray-600" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.zip}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.fullName}</td>
                  <td className="px-6 py-4 text-gray-600" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.email}</td>
                  <td className="px-6 py-4 text-gray-600" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.phone}</td>
                  <td className="px-6 py-4" onClick={() => navigate(`/admin/leads/${l.id}`)}>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${l.status === "New" ? "bg-blue-100 text-blue-700" :
                      l.status === "Contacted" ? "bg-orange-100 text-orange-700" :
                        l.status === "Won" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-16 text-center text-gray-600">No leads match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;
