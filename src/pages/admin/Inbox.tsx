import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLeads, updateLead, type Lead } from "@/lib/leads";
import { allServices } from "@/data/services";

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, email, phone, zip..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
            >{s}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {dates.map((d) => (
            <button key={d} onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${dateFilter === d ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
            >{d}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {["All", "Home", "Business"].map((l) => (
            <button key={l} onClick={() => setLocFilter(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${locFilter === l ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-card rounded-xl border border-border p-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate("Contacted")}>Mark Contacted</Button>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate("Won")}>Mark Won</Button>
          <Button size="sm" variant="outline" onClick={() => bulkUpdate("Lost")}>Mark Lost</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="px-4 py-2.5 w-10"><input type="checkbox" onChange={(e) => {
                  setSelected(e.target.checked ? new Set(filtered.map(l => l.id)) : new Set());
                }} /></th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">ZIP</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-accent/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={() => navigate(`/admin/leads/${l.id}`)}>{new Date(l.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.serviceSlug}</td>
                  <td className="px-4 py-3" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.zip}</td>
                  <td className="px-4 py-3" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.fullName}</td>
                  <td className="px-4 py-3" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.email}</td>
                  <td className="px-4 py-3" onClick={() => navigate(`/admin/leads/${l.id}`)}>{l.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      l.status === "New" ? "bg-primary/10 text-primary" :
                      l.status === "Contacted" ? "bg-accent text-accent-foreground" :
                      l.status === "Won" ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"
                    }`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No leads match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;
