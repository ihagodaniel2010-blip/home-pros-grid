import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Save, FileText, User, Mail, Phone, MapPin, CheckCircle2, MoreHorizontal, Images, Wrench, UserCheck, Wand2 } from "lucide-react";
import { getLeadById, updateLead, type Lead } from "@/lib/leads";
import { getServiceExtrasByJobId, createServiceExtra, type ServiceExtra } from "@/lib/service-extras";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const statuses: Lead["status"][] = ["New", "Contacted", "Estimate Sent", "Approved", "Closed"];

type ServiceJob = {
  id: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_worker_id: string | null;
  worker_name?: string | null;
};

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [serviceJob, setServiceJob] = useState<ServiceJob | null>(null);
  const [serviceExtras, setServiceExtras] = useState<ServiceExtra[]>([]);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [newExtra, setNewExtra] = useState({ description: '', amount: '' });
  const [isSavingExtra, setIsSavingExtra] = useState(false);

  useEffect(() => {
    getLeadById(id || "").then((l) => {
      if (l) { setLead(l); setNotes(l.ownerNotes); }
    });
  }, [id]);

  // Fetch service job linked to this lead
  useEffect(() => {
    if (!id || !supabase) return;
    supabase
      .from("service_jobs")
      .select("id, status, scheduled_at, started_at, completed_at, assigned_worker_id, organization_id, estimate_id")
      .eq("lead_id", id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error) {
          console.warn("Could not load service job for lead:", error.message);
          return;
        }
        if (data) {
          setServiceJob(data as any);
          const extras = await getServiceExtrasByJobId(data.id);
          setServiceExtras(extras);
        }
      });
  }, [id]);

  const handleCreateExtra = async () => {
    if (!serviceJob || !newExtra.description || !newExtra.amount) return;
    setIsSavingExtra(true);
    try {
      const extra = await createServiceExtra({
        organization_id: (serviceJob as any).organization_id,
        service_job_id: serviceJob.id,
        estimate_id: (serviceJob as any).estimate_id,
        description: newExtra.description,
        amount: parseFloat(newExtra.amount)
      });
      setServiceExtras([extra, ...serviceExtras]);
      setIsAddingExtra(false);
      setNewExtra({ description: '', amount: '' });
      toast.success("Extra created successfully.");
    } catch (err) {
      toast.error("Failed to create extra.");
    } finally {
      setIsSavingExtra(false);
    }
  };

  const copyExtraLink = (token: string) => {
    const url = `${window.location.origin}/extra/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Extra link copied to clipboard!");
  };

  if (!lead) return (
    <div className="p-20 text-center">
      <p className="text-gray-400 font-medium">Lead or opportunity not found.</p>
      <Button variant="outline" onClick={() => navigate("/admin/inbox")} className="mt-4 rounded-xl">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Leads
      </Button>
    </div>
  );

  const changeStatus = async (status: Lead["status"]) => {
    try {
      const updated = await updateLead(lead.id, { status });
      if (updated) {
        setLead(updated);
        toast.success(`Status updated to ${status}`);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const saveNotes = async () => {
    setIsSaving(true);
    try {
      const updated = await updateLead(lead.id, { ownerNotes: notes });
      if (updated) {
        setLead(updated);
        toast.success("Notes saved successfully");
      }
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/inbox")}
            className="rounded-full h-10 w-10 border-gray-200 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#0b2a4a] tracking-tight">{lead.fullName}</h1>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-2.5 py-0.5">
                {lead.status}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">ID: {lead.id.split('-')[0].toUpperCase()} · Received on {new Date(lead.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(`/admin/estimate-assistant?leadId=${lead.id}`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-emerald-500/20"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Smart Assistant
          </Button>
          <Button
            onClick={() => navigate(`/admin/estimates/new?leadId=${lead.id}`)}
            variant="outline"
            className="h-11 px-6 font-bold rounded-xl border-gray-200"
          >
            <FileText className="h-4 w-4 mr-2" />
            Manual Estimate
          </Button>
          <Button variant="outline" className="rounded-xl h-11 border-gray-200">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-[#0b2a4a] flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                Lead Information
              </h3>
              <div className="flex bg-gray-200/60 p-1 rounded-lg">
                {statuses.slice(0, 3).map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${lead.status === s ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-x-12 gap-y-8">
              {[
                { label: "Phone Number", value: lead.phone, icon: Phone },
                { label: "Email Address", value: lead.email, icon: Mail },
                { label: "Address / Location", value: lead.address, icon: MapPin },
                { label: "Budget Option", value: lead.selectedServiceOption, icon: CheckCircle2 },
                { label: "Service Request", value: lead.serviceSlug.toUpperCase(), icon: FileText },
                { label: "Location Type", value: lead.locationType, icon: MapPin },
              ].map((item) => (
                <div key={item.label} className="group">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 group-hover:text-blue-500 transition-colors">
                    {item.label}
                  </span>
                  <div className="flex items-start gap-2.5">
                    <item.icon className="h-4 w-4 text-gray-300 mt-0.5" />
                    <span className="text-gray-900 font-semibold">{item.value || "—"}</span>
                  </div>
                </div>
              ))}

              {lead.details && (
                <div className="md:col-span-2 pt-4 border-t border-gray-50 mt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Project Details & Requirements</span>
                  <div className="bg-gray-50/80 rounded-xl p-6 text-gray-700 leading-relaxed italic border border-gray-100">
                    "{lead.details}"
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Media Section */}
          {lead.media_urls && lead.media_urls.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden p-8">
              <h3 className="font-bold text-[#0b2a4a] flex items-center gap-2 mb-6">
                <Images className="h-4 w-4 text-blue-600" />
                Media Attachments ({lead.media_urls.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {lead.media_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-2xl overflow-hidden border border-gray-100 group relative ring-offset-4 hover:ring-2 hover:ring-blue-500 transition-all shadow-sm"
                  >
                    {url.match(/\.(mp4|webm|ogg|mov)$|^.*video.*$/i) ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-white/40" />
                        <span className="absolute bottom-3 left-3 text-[9px] font-bold bg-white text-slate-900 px-2 py-0.5 rounded-full uppercase">Video</span>
                      </div>
                    ) : (
                      <img src={url} alt={`Lead file ${i + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h3 className="font-bold text-[#0b2a4a] text-sm mb-4">Internal Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Private notes for the team..."
              className="w-full p-4 bg-gray-50 border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none mb-4"
            />
            <Button
              onClick={saveNotes}
              disabled={isSaving}
              className="w-full bg-[#0b2a4a] hover:bg-[#081e35] text-white rounded-xl font-bold h-10 shadow-lg shadow-blue-900/10"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Internal Notes"}
            </Button>
          </section>

          {/* Service Job Status Card — shown when a job was created from this lead */}
          {serviceJob && (
            <section className="bg-white rounded-2xl border border-amber-200/60 shadow-sm p-6">
              <h3 className="font-bold text-[#0b2a4a] text-sm mb-4 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-500" />
                Service Job
              </h3>

              <div className="mb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Job Status</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  serviceJob.status === "completed"   ? "bg-green-50 text-green-700 border-green-100" :
                  serviceJob.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-100" :
                  serviceJob.status === "scheduled"   ? "bg-amber-50 text-amber-700 border-amber-100" :
                  "bg-gray-50 text-gray-700 border-gray-100"
                }`}>
                  {serviceJob.status.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {serviceJob.scheduled_at && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-300 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Scheduled</span>
                      <p className="text-gray-700 font-semibold">{new Date(serviceJob.scheduled_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {serviceJob.started_at && (
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Started</span>
                      <p className="text-gray-700 font-semibold">{new Date(serviceJob.started_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {serviceJob.completed_at && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Completed</span>
                      <p className="text-gray-700 font-semibold">{new Date(serviceJob.completed_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {serviceJob.assigned_worker_id && (
                  <div className="flex items-start gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Assigned Worker</span>
                      <p className="text-gray-700 font-mono text-[10px]">{serviceJob.assigned_worker_id.split("-")[0].toUpperCase()}</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-gray-50 leading-relaxed">
                ℹ️ Job status is independent from lead status. Updating the commercial lead status above does not change the service job.
              </p>
            </section>
          )}

          {serviceJob && (
            <section className="bg-white rounded-2xl border border-purple-200/60 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[#0b2a4a] text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  Service Extras
                </h3>
                <Button variant="outline" size="sm" onClick={() => setIsAddingExtra(!isAddingExtra)} className="h-7 text-xs">
                  {isAddingExtra ? "Cancel" : "Add Extra"}
                </Button>
              </div>

              {isAddingExtra && (
                <div className="mb-4 space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <input
                    type="text"
                    placeholder="Description"
                    value={newExtra.description}
                    onChange={(e) => setNewExtra({ ...newExtra, description: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border-gray-200"
                  />
                  <input
                    type="number"
                    placeholder="Amount ($)"
                    value={newExtra.amount}
                    onChange={(e) => setNewExtra({ ...newExtra, amount: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border-gray-200"
                  />
                  <Button
                    onClick={handleCreateExtra}
                    disabled={isSavingExtra}
                    className="w-full h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSavingExtra ? "Saving..." : "Save Extra"}
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {serviceExtras.map((extra) => (
                  <div key={extra.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-gray-900">{extra.description}</span>
                      <span className="font-bold text-gray-900">${extra.amount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        extra.status === 'approved' ? 'bg-green-100 text-green-700' :
                        extra.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        extra.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {extra.status}
                      </span>
                      {extra.public_token && (
                        <button
                          onClick={() => copyExtraLink(extra.public_token!)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Copy Link
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {serviceExtras.length === 0 && !isAddingExtra && (
                  <p className="text-xs text-gray-400 italic">No extras added yet.</p>
                )}
              </div>
            </section>
          )}

          <section className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6">
            <h3 className="font-bold text-[#0b2a4a] text-sm mb-6 flex items-center justify-between">
              Timeline
              <Clock className="h-3.5 w-3.5 text-gray-400" />
            </h3>
            <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {lead.statusHistory.map((entry, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${i === 0 ? "bg-blue-600 border-blue-100" : "bg-white border-gray-100"}`}>
                    <Clock className={`h-3 w-3 ${i === 0 ? "text-white" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-none">Status: {entry.status}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;

