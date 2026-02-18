import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Save } from "lucide-react";
import { getLeadById, updateLead, type Lead } from "@/lib/leads";
import { mockPros } from "@/data/pros";

const statuses: Lead["status"][] = ["New", "Contacted", "Won", "Lost"];

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const l = getLeadById(id || "");
    if (l) { setLead(l); setNotes(l.ownerNotes); }
  }, [id]);

  if (!lead) return (
    <div className="p-8 text-center">
      <p className="text-muted-foreground">Lead not found.</p>
      <button onClick={() => navigate("/admin/inbox")} className="mt-4 px-5 py-2.5 rounded-xl border border-border text-sm hover:bg-accent transition-colors">Back to Inbox</button>
    </div>
  );

  const changeStatus = (status: Lead["status"]) => {
    const updated = updateLead(lead.id, { status });
    if (updated) setLead(updated);
  };

  const saveNotes = () => {
    const updated = updateLead(lead.id, { ownerNotes: notes });
    if (updated) setLead(updated);
  };

  const selectedProNames = lead.selectedPros
    .map((pid) => mockPros.find((p) => p.id === pid)?.company)
    .filter(Boolean);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate("/admin/inbox")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Inbox
      </button>

      <div className="bg-card rounded-2xl border border-border/50 p-7 mb-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{lead.fullName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{lead.serviceSlug} · {lead.zip}</p>
          </div>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  lead.status === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/50 text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 text-sm">
          {[
            { label: "Service", value: lead.selectedServiceOption },
            lead.subtype ? { label: "Subtype", value: lead.subtype } : null,
            { label: "Location Type", value: lead.locationType },
            { label: "Email", value: lead.email },
            { label: "Phone", value: lead.phone },
            { label: "Address", value: lead.address },
          ].filter(Boolean).map((item) => (
            <div key={item!.label} className="flex justify-between py-2 border-b border-border/30">
              <span className="text-muted-foreground">{item!.label}</span>
              <span className="font-medium">{item!.value}</span>
            </div>
          ))}
          {lead.details && (
            <div className="md:col-span-2 py-2 border-b border-border/30">
              <span className="text-muted-foreground text-xs block mb-1">Details</span>
              <p className="text-sm">{lead.details}</p>
            </div>
          )}
          {selectedProNames.length > 0 && (
            <div className="md:col-span-2 py-2">
              <span className="text-muted-foreground text-xs block mb-1">Selected Pros</span>
              <span className="font-medium">{selectedProNames.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card rounded-2xl border border-border/50 p-7 mb-6">
        <h3 className="font-semibold text-sm mb-4">Owner Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this lead..."
          className="w-full p-4 bg-accent/30 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
        />
        <button onClick={saveNotes} className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all duration-200">
          <Save className="h-3.5 w-3.5" /> Save Notes
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-2xl border border-border/50 p-7">
        <h3 className="font-semibold text-sm mb-5">Timeline</h3>
        <div className="space-y-4">
          {lead.statusHistory.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className="font-medium">→ {entry.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
