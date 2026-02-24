import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Save } from "lucide-react";
import { getLeadById, updateLead, type Lead } from "@/lib/leads";

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
      <p className="text-gray-600">Lead not found.</p>
      <button onClick={() => navigate("/admin/inbox")} className="mt-4 px-5 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Back to Inbox</button>
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

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={() => navigate("/admin/inbox")} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Inbox
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-7 mb-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{lead.fullName}</h1>
            <p className="text-sm text-gray-600 mt-2">{lead.serviceSlug} · {lead.zip}</p>
          </div>
          <div className="flex gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  lead.status === s
                    ? s === "New" ? "bg-blue-600 text-white" :
                      s === "Contacted" ? "bg-orange-600 text-white" :
                      s === "Won" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-300"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 text-sm">
          {[
            { label: "Service", value: lead.selectedServiceOption },
            lead.subtype ? { label: "Subtype", value: lead.subtype } : null,
            { label: "Location Type", value: lead.locationType },
            { label: "Email", value: lead.email },
            { label: "Phone", value: lead.phone },
            { label: "Address", value: lead.address },
          ].filter(Boolean).map((item) => (
            <div key={item!.label} className="pb-4 border-b border-gray-200">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-widest block mb-1">{item!.label}</span>
              <span className="text-gray-900 font-medium">{item!.value}</span>
            </div>
          ))}
          {lead.details && (
            <div className="md:col-span-2 pb-4 border-b border-gray-200">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-widest block mb-2">Details</span>
              <p className="text-gray-900">{lead.details}</p>
            </div>
          )}
          {lead.selectedPros.length > 0 && (
            <div className="md:col-span-2">
              <span className="text-gray-600 text-xs font-semibold uppercase tracking-widest block mb-2">Selected Professionals</span>
              <span className="text-gray-900 font-medium">{lead.selectedPros.join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-7 mb-6">
        <h3 className="font-semibold text-sm text-gray-900 mb-4">Owner Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about this lead..."
          className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 resize-none"
        />
        <button onClick={saveNotes} className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200">
          <Save className="h-3.5 w-3.5" /> Save Notes
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-7">
        <h3 className="font-semibold text-sm text-gray-900 mb-6">Timeline</h3>
        <div className="space-y-4">
          {lead.statusHistory.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-gray-600">{new Date(entry.timestamp).toLocaleString()}</span>
              <span className="font-semibold text-gray-900">→ {entry.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
