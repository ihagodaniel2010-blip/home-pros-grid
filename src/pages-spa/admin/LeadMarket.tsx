import { useState, useEffect } from "react";
import { getPublicAvailableLeads, buyLead, getOrganizationBalance } from "@/lib/lead-market";
import { getServiceAreas } from "@/lib/service-areas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Store, DollarSign, MapPin, AlertCircle, Clock, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useNavigate, Link } from "react-router-dom";

export default function LeadMarket() {
    const { user, isWorker } = useUser();
    const navigate = useNavigate();
    const [leads, setLeads] = useState<any[]>([]);
    const [balance, setBalance] = useState<number>(0);
    const [hasServiceAreas, setHasServiceAreas] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isBuying, setIsBuying] = useState<string | null>(null);
    const [purchasedLeads, setPurchasedLeads] = useState<Set<string>>(new Set());

    const orgId = user?.organization?.id;

    useEffect(() => {
        if (isWorker) {
            navigate("/admin/inbox");
            return;
        }
        if (orgId) {
            loadMarketData();
        }
    }, [isWorker, navigate, orgId]);

    const loadMarketData = async () => {
        setIsLoading(true);
        if (!orgId) return;

        const [availableLeads, currentBalance, areas] = await Promise.all([
            getPublicAvailableLeads(),
            getOrganizationBalance(),
            getServiceAreas(orgId)
        ]);
        
        setLeads(availableLeads);
        setBalance(currentBalance);
        setHasServiceAreas(areas && areas.length > 0);
        setIsLoading(false);
    };

    const handleBuyLead = async (leadId: string) => {
        setIsBuying(leadId);
        const result = await buyLead(leadId);
        if (result.success) {
            toast.success(result.message);
            setPurchasedLeads(prev => new Set(prev).add(leadId));
            // Refresh balance
            const newBalance = await getOrganizationBalance();
            setBalance(newBalance);
        } else {
            toast.error(result.message);
        }
        setIsBuying(null);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Store className="h-6 w-6 text-blue-600" />
                        Lead Market
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Acquire exclusive new leads for your service area.</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 shadow-sm flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Credit</p>
                        <p className="text-xl font-black text-gray-900">${balance.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {!hasServiceAreas ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <MapPin className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-900">No service areas configured yet</p>
                        <p className="text-sm text-gray-500 mt-2 mb-6 max-w-md mx-auto">
                            You must configure your service areas to receive relevant leads in the market.
                        </p>
                        <Link 
                            to="/admin/locations" 
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-lg shadow-sm transition-colors"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Set service locations
                        </Link>
                    </div>
                ) : leads.filter(l => !purchasedLeads.has(l.id)).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500">
                        <Store className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-semibold text-gray-900">No leads available in your selected service areas right now.</p>
                        <p className="text-sm mt-1">Check back later or expand your service locations.</p>
                    </div>
                ) : (
                    leads.map(lead => {
                        const isPurchased = purchasedLeads.has(lead.id);
                        if (isPurchased) return null; // Hide after purchase or show as bought

                        return (
                            <div key={lead.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-100">
                                            {lead.service_slug}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                            lead.urgency === 'emergency' ? 'bg-red-50 text-red-700 border-red-100' :
                                            'bg-gray-50 text-gray-700 border-gray-100'
                                        }`}>
                                            {lead.urgency}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    <div>
                                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                            "{lead.details}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            {lead.city}, {lead.state} {lead.zip_code}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3 md:min-w-[200px] md:border-l md:border-gray-100 md:pl-6">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Lead Price</p>
                                        <p className="text-3xl font-black text-gray-900">${lead.base_price || 50}</p>
                                    </div>
                                    <Button 
                                        className="w-full bg-[#0b2a4a] hover:bg-[#081e35] text-white shadow-lg shadow-blue-900/10 font-bold"
                                        onClick={() => handleBuyLead(lead.id)}
                                        disabled={isBuying === lead.id || balance < (lead.base_price || 50)}
                                    >
                                        {isBuying === lead.id ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                        )}
                                        {balance < (lead.base_price || 50) ? "Low Balance" : "Buy Lead"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mt-8">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 leading-relaxed">
                    <strong>Note:</strong> At this stage (MVP), buying leads might be pending backend RPC approval. 
                    If the purchase fails with "RPC pendente de aprovação", it means the database function hasn't been applied yet.
                </p>
            </div>
        </div>
    );
}
