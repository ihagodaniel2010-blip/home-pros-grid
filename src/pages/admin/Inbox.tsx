import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { getLeads, updateLead, type Lead } from "@/lib/leads";

type StatusFilter = "All" | "New" | "Contacted" | "Won" | "Lost";
type DateFilter = "All" | "Today" | "7d" | "30d";

const AdminInbox = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>(getLeads());
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

  const bulkUpdate = (status: Lead["status"]) => {
    selected.forEach((id) => updateLead(id, { status }));
    setLeads(getLeads());
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
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            active === item
              ? "bg-primary text-primary-foreground"
              : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <input
            className="w-full h-10 pl-11 pr-4 bg-accent/30 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
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
        <div className="bg-card rounded-2xl border border-primary/30 p-4 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={() => bulkUpdate("Contacted")} className="px-3 py-1.5 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors">Mark Contacted</button>
          <button onClick={() => bulkUpdate("Won")} className="px-3 py-1.5 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors">Mark Won</button>
          <button onClick={() => bulkUpdate("Lost")} className="px-3 py-1.5 rounded-lg bg-accent text-xs font-medium hover:bg-accent/80 transition-colors">Mark Lost</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3.5 w-10">
                  <input type="checkbox" className="rounded border-border" onChange={(e) => {
                    setSelected(e.target.checked ? new Set(filtered.map(l => l.id)) : new Set());
                  }} />
                </th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Service</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">ZIP</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/30 hover:bg-accent/30 cursor-pointer transition-colors duration-150">
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-border" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground" onClick={() => navigate(`/admin/leads/${l.id}`)}>{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.serviceSlug}</td>
                  <td className="px-5 py-4 text-muted-foreground" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.zip}</td>
                  <td className="px-5 py-4 font-medium" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.fullName}</td>
                  <td className="px-5 py-4 text-muted-foreground" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.email}</td>
                  <td className="px-5 py-4 text-muted-foreground" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.phone}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      l.status === "New" ? "bg-primary/15 text-primary" :
                      l.status === "Contacted" ? "bg-amber-500/15 text-amber-400" :
                      l.status === "Won" ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">No leads match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;
