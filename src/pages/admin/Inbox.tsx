import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, FileText, User, MapPin, Calendar, Clock, ChevronRight, MoreVertical, Filter, ArrowUpRight } from "lucide-react";
import { getLeads, updateLead, type Lead } from "@/lib/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type StatusFilter = "All" | "New" | "Contacted" | "Won" | "Lost";
type DateFilter = "All" | "Today" | "7d" | "30d";

const AdminInbox = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getLeads().then(data => {
      setLeads(data);
      setIsLoading(false);
    });
  }, []);

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
    try {
      await Promise.all(Array.from(selected).map((id) => updateLead(id, { status })));
      const refreshed = await getLeads();
      setLeads(refreshed);
      setSelected(new Set());
      toast.success(`Updated ${selected.size} leads to ${status}`);
    } catch (err) {
      toast.error("Failed to update leads");
    }
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-50 text-blue-700 border-blue-100 ring-4 ring-blue-500/5";
      case "Contacted": return "bg-orange-50 text-orange-700 border-orange-100 ring-4 ring-orange-500/5";
      case "Won": return "bg-emerald-50 text-emerald-700 border-emerald-100 ring-4 ring-emerald-500/5";
      case "Lost": return "bg-slate-50 text-slate-700 border-slate-100 ring-4 ring-slate-500/5";
      default: return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0b2a4a] tracking-tight">Leads Central</h1>
          <p className="text-gray-500 mt-1.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Manage incoming requests and commercial opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={exportCsv}
            className="rounded-xl border-gray-200 hover:bg-gray-50 font-medium"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters & Search - Premium Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/60 p-5 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-11 h-11 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-blue-500/10 focus:border-blue-500"
              placeholder="Search leads by name, email, or zip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 md:pb-0">
            <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
              {["All", "New", "Contacted", "Won"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s
                    ? "bg-white text-[#0b2a4a] shadow-sm"
                    : "text-gray-500 hover:text-gray-800"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
              {["All", "7d", "30d"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d as any)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${dateFilter === d
                    ? "bg-white text-[#0b2a4a] shadow-sm"
                    : "text-gray-500 hover:text-gray-800"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#0b2a4a] text-white rounded-2xl p-4 flex items-center justify-between shadow-xl ring-4 ring-blue-900/10 mb-6"
          >
            <div className="flex items-center gap-3 ml-2">
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">{selected.size}</span>
              <span className="font-semibold text-sm">Leads Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => bulkUpdate("Contacted")} variant="ghost" className="text-white hover:bg-white/10 text-xs font-bold">Mark Contacted</Button>
              <Button onClick={() => bulkUpdate("Won")} variant="ghost" className="text-white hover:bg-white/10 text-xs font-bold">Mark Won</Button>
              <div className="w-px h-6 bg-white/10 mx-2" />
              <Button onClick={() => setSelected(new Set())} variant="ghost" className="text-white/60 hover:text-white text-xs">Clear</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Table - Enhanced */}
      <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 accent-[#0b2a4a] w-4 h-4"
                    onChange={(e) => {
                      setSelected(e.target.checked ? new Set(filtered.map(l => l.id)) : new Set());
                    }}
                  />
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Lead Details</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Service & Location</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="inline-flex items-center gap-2 text-gray-400 font-medium">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      Carregando oportunidades...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-500 font-medium">No leads match your search criteria.</td></tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/40 transition-all duration-150 group">
                    <td className="px-6 py-6">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 accent-[#0b2a4a] w-4 h-4"
                        checked={selected.has(l.id)}
                        onChange={() => toggleSelect(l.id)}
                      />
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-[#0b2a4a] text-sm group-hover:bg-[#0b2a4a] group-hover:text-white transition-colors">
                          {l.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p onClick={() => navigate(`/admin/leads/${l.id}`)} className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">{l.fullName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{l.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium text-sm text-gray-700">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 bg-white shadow-sm">{l.serviceSlug.toUpperCase()}</Badge>
                        </span>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <MapPin className="h-3 w-3" />
                          {l.zip} · {l.locationType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border pointer-events-none transition-all ${getStatusStyle(l.status)}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/admin/estimates/new?leadId=${l.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-9 px-4 font-bold text-xs shadow-md shadow-blue-500/10 group/btn"
                        >
                          <FileText className="h-3.5 w-3.5 mr-2 group-hover/btn:scale-110 transition-transform" />
                          Convert
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/admin/leads/${l.id}`)}
                          className="h-9 w-9 rounded-lg border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminInbox;

