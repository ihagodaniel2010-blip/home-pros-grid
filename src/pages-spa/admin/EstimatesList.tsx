import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText, Calendar, User, Clock, Wrench, ChevronRight } from "lucide-react";
import { getEstimates, Estimate } from "@/lib/estimates";
import { getServiceJobs } from "@/lib/service-jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser, DEFAULT_ORG_ID } from "@/context/UserContext";
import { toast } from "sonner";

const EstimatesList = () => {
    const { user, isLoading: isUserLoading } = useUser();
    const [estimates, setEstimates] = useState<Estimate[]>([]);
    const [jobsMap, setJobsMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const orgId = user?.organization?.id;

    useEffect(() => {
        if (isUserLoading) return;

        let mounted = true;
        setIsLoading(true);

        const timer = setTimeout(() => {
            if (mounted) setIsLoading(false);
        }, 6000);

        const targetOrgId = orgId || DEFAULT_ORG_ID;

        Promise.all([
            getEstimates(targetOrgId).catch(() => []),
            getServiceJobs(targetOrgId).catch(() => [])
        ]).then(([estimatesData, jobsData]) => {
            if (!mounted) return;
            setEstimates(estimatesData || []);
            
            const map: Record<string, string> = {};
            (jobsData || []).forEach((j: any) => {
                if (j.estimate_id) {
                    map[j.estimate_id] = j.id;
                }
            });
            setJobsMap(map);
        }).catch(err => {
            console.error("[EstimatesList] Error loading estimates:", err);
            if (mounted) toast.error(`Failed to load estimates: ${err?.message || 'Network / Database error'}`);
        }).finally(() => {
            clearTimeout(timer);
            if (mounted) setIsLoading(false);
        });

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [orgId, isUserLoading]);

    const filteredEstimates = estimates.filter(est =>
        est.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'Sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Declined': return 'bg-red-100 text-red-700 border-red-200';
            case 'Expired': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-[#0b2a4a] tracking-tight">Estimates & Projects Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Manage commercial proposals, approved contracts, and job workspaces
                    </p>
                </div>
                <Link to="/admin/estimates/new">
                    <Button className="bg-[#0b2a4a] hover:bg-[#081e35] text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Estimate
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search by client name..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Client / ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Expiry</th>
                                <th className="px-6 py-4">Created</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading estimates...</td>
                                </tr>
                            ) : filteredEstimates.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No estimates found.</td>
                                </tr>
                            ) : (
                                filteredEstimates.map((est) => {
                                    const linkedJobId = jobsMap[est.id];
                                    const isApproved = est.status === 'Approved';

                                    return (
                                        <tr key={est.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{est.client_name}</p>
                                                        <p className="text-xs text-gray-500 uppercase font-medium">{est.id.split('-')[0]}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(est.status)}`}>
                                                    {est.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                ${est.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                    {est.valid_until ? new Date(est.valid_until).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                    {new Date(est.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isApproved && linkedJobId ? (
                                                        <>
                                                            <Link to={`/admin/jobs/${linkedJobId}`}>
                                                                <Button size="sm" className="bg-[#0b2a4a] hover:bg-[#081e35] text-white font-bold text-xs gap-1">
                                                                    <Wrench className="h-3.5 w-3.5" />
                                                                    Open Project
                                                                </Button>
                                                            </Link>
                                                            <Link to={`/admin/estimates/${est.id}`}>
                                                                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 font-semibold text-xs">
                                                                    View Estimate
                                                                </Button>
                                                            </Link>
                                                        </>
                                                    ) : isApproved && !linkedJobId ? (
                                                        <>
                                                            <Link to={`/admin/estimates/${est.id}`}>
                                                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1">
                                                                    <Plus className="h-3.5 w-3.5" />
                                                                    Create Job
                                                                </Button>
                                                            </Link>
                                                        </>
                                                    ) : (
                                                        <Link to={`/admin/estimates/${est.id}`}>
                                                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold text-xs">
                                                                {est.status === 'Draft' ? 'Edit / Send' : 'View Details'}
                                                            </Button>
                                                        </Link>
                                                    )}

                                                    {est.public_token && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                const shareUrl = `${window.location.protocol}//${window.location.host}/estimate/${est.public_token}`;
                                                                navigator.clipboard.writeText(shareUrl);
                                                                toast.success("Proposal link copied!");
                                                            }}
                                                            className="text-xs h-8 text-gray-600 hover:text-blue-600"
                                                            title="Copy Client Proposal Link"
                                                        >
                                                            Copy Link
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EstimatesList;
