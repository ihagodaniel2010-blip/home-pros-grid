import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Lead not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/inbox")}>Back to Inbox</Button>
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
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate("/admin/inbox")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Inbox
      </button>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{lead.fullName}</h1>
            <p className="text-sm text-muted-foreground">{lead.serviceSlug} · {lead.zip}</p>
          </div>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  lead.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Service:</span> <strong>{lead.selectedServiceOption}</strong></div>
          {lead.subtype && <div><span className="text-muted-foreground">Subtype:</span> <strong>{lead.subtype}</strong></div>}
          <div><span className="text-muted-foreground">Location Type:</span> <strong>{lead.locationType}</strong></div>
          <div><span className="text-muted-foreground">Email:</span> <strong>{lead.email}</strong></div>
          <div><span className="text-muted-foreground">Phone:</span> <strong>{lead.phone}</strong></div>
          <div><span className="text-muted-foreground">Address:</span> <strong>{lead.address}</strong></div>
          {lead.details && <div className="md:col-span-2"><span className="text-muted-foreground">Details:</span> <p className="mt-1">{lead.details}</p></div>}
          {selectedProNames.length > 0 && (
            <div className="md:col-span-2"><span className="text-muted-foreground">Selected Pros:</span> <strong>{selectedProNames.join(", ")}</strong></div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h3 className="font-semibold text-sm mb-3">Owner Notes</h3>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Add notes about this lead..." />
        <Button size="sm" className="mt-3" onClick={saveNotes}>Save Notes</Button>
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-sm mb-4">Timeline</h3>
        <div className="space-y-3">
          {lead.statusHistory.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className="font-medium">Status → {entry.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
