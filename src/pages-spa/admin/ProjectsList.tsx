import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Wrench, Calendar, User, MapPin, DollarSign, ArrowRight, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { getServiceJobs } from "@/lib/service-jobs";
import { getEstimates, Estimate } from "@/lib/estimates";
import { getClientPayments } from "@/lib/client-payments";
import { getServiceExtrasByJobId } from "@/lib/service-extras";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  client_name: string;
  address: string;
  project_type: string;
  created_at: string;
  original_contract: number;
  approved_extras: number;
  current_contract: number;
  amount_paid: number;
  balance_due: number;
}

export default function ProjectsList() {
  const { user, isLoading: isUserLoading } = useUser();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const orgId = user?.organization?.id || DEFAULT_ORG_ID;

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    async function loadProjectsData() {
      try {
        const [jobsData, estimatesData, paymentsData] = await Promise.all([
          getServiceJobs(orgId).catch(() => []),
          getEstimates(orgId).catch(() => []),
          getClientPayments(orgId).catch(() => [])
        ]);

        if (!mounted) return;

        const estMap: Record<string, Estimate> = {};
        (estimatesData || []).forEach(e => { estMap[e.id] = e; });

        // Map jobs to project summaries
        const summaries: ProjectSummary[] = await Promise.all(
          (jobsData || []).map(async (job: any) => {
            const linkedEst = job.estimate_id ? estMap[job.estimate_id] : null;

            // Fetch extras for this job
            const extrasData = job.id ? await getServiceExtrasByJobId(job.id).catch(() => []) : [];
            const approvedExtras = (extrasData || [])
              .filter((ex: any) => ex.status === 'approved')
              .reduce((acc: number, ex: any) => acc + (ex.amount || 0), 0);

            // Fetch lead info if needed
            let clientName = linkedEst?.client_name || "Client Project";
            let address = linkedEst?.client_address || "Sinop / Local Address";
            let projectType = linkedEst?.project_type || "General Construction";

            if (job.lead_id && supabase) {
              const { data: leadData } = await supabase.from('leads').select('*').eq('id', job.lead_id).maybeSingle();
              if (leadData) {
                if (!linkedEst?.client_name && leadData.fullName) clientName = leadData.fullName;
                if (!linkedEst?.client_address && leadData.address) address = leadData.address;
                if (!linkedEst?.project_type && leadData.selectedServiceOption) projectType = leadData.selectedServiceOption;
              }
            }

            const originalContract = linkedEst?.total_amount || 0;
            const currentContract = originalContract + approvedExtras;

            // Calculate paid for this job
            const paidForJob = (paymentsData || [])
              .filter(p => p.status === 'received' && (p.service_job_id === job.id || p.estimate_id === job.estimate_id))
              .reduce((acc, p) => acc + (p.amount || 0), 0);

            const balanceDue = currentContract - paidForJob;

            return {
              id: job.id,
              title: job.title || `Job #${job.id.slice(0, 8)}`,
              status: job.status || 'scheduled',
              client_name: clientName,
              address: address,
              project_type: projectType,
              created_at: job.created_at || new Date().toISOString(),
              original_contract: originalContract,
              approved_extras: approvedExtras,
              current_contract: currentContract,
              amount_paid: paidForJob,
              balance_due: balanceDue
            };
          })
        );

        setProjects(summaries);
      } catch (err: any) {
        console.error("Error loading projects list:", err);
        if (mounted) toast.error("Failed to load projects list.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    if (!isUserLoading) {
      loadProjectsData();
    }

    return () => {
      mounted = false;
    };
  }, [orgId, isUserLoading]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p =>
      p.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.project_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Scheduled</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0b2a4a] tracking-tight flex items-center gap-2">
            <Wrench className="h-7 w-7 text-blue-600" />
            Active Projects & Jobs
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Centralized job operations, contract values, Extras, and client balances
          </p>
        </div>
        <Link to="/admin/estimates/new">
          <Button className="bg-[#0b2a4a] hover:bg-[#081e35] text-white font-bold gap-2">
            <Plus className="h-4 w-4" />
            + New Estimate
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search project by client name, address, or service..."
            className="pl-10 h-11 text-sm bg-gray-50 border-gray-200 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
            {filteredProjects.length} Projects Total
          </span>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Loading projects...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">No active projects found.</p>
          <p className="text-xs text-gray-400 mt-1">Convert an approved estimate to start a Job Workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => navigate(`/admin/jobs/${proj.id}`)}
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  {getStatusBadge(proj.status)}
                  <span className="text-xs text-gray-400 font-mono">#{proj.id.slice(0, 8)}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {proj.client_name}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  {proj.address}
                </p>
                <p className="text-xs text-blue-600 font-bold mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded">
                  {proj.project_type}
                </p>

                {/* Financial Math Summary */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Original Contract:</span>
                    <span className="font-semibold">${proj.original_contract.toLocaleString()}</span>
                  </div>
                  {proj.approved_extras > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Approved Extras:</span>
                      <span>+${proj.approved_extras.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-dashed border-gray-100">
                    <span>Current Contract:</span>
                    <span>${proj.current_contract.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Amount Paid:</span>
                    <span className="text-emerald-700 font-medium">${proj.amount_paid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-orange-600 pt-1">
                    <span>Balance Due:</span>
                    <span>${proj.balance_due.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  Created {new Date(proj.created_at).toLocaleDateString()}
                </span>
                <Button size="sm" className="bg-[#0b2a4a] hover:bg-[#081e35] text-white font-bold text-xs gap-1">
                  Open Project
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
