import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicServiceExtra, respondPublicServiceExtra, type ServiceExtra } from "@/lib/service-extras";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const PublicExtraView = () => {
    const { token } = useParams<{ token: string }>();
    const [extra, setExtra] = useState<ServiceExtra | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResponding, setIsResponding] = useState(false);

    useEffect(() => {
        if (token) loadExtra(token);
    }, [token]);

    const loadExtra = async (tk: string) => {
        setIsLoading(true);
        const data = await getPublicServiceExtra(tk);
        if (data) setExtra(data);
        setIsLoading(false);
    };

    const handleRespond = async (status: 'approved' | 'rejected') => {
        if (!extra || !token) return;
        setIsResponding(true);
        const success = await respondPublicServiceExtra(token, status);
        if (success) {
            setExtra({ ...extra, status });
            toast.success(`Extra ${status} successfully!`);
        } else {
            toast.error("Failed to respond to extra.");
        }
        setIsResponding(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!extra) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Service Extra Not Found</h1>
                    <p className="text-gray-500 mt-2">The link might be expired or incorrect.</p>
                </div>
            </div>
        );
    }

    const isPending = extra.status === 'pending';
    const isApproved = extra.status === 'approved' || extra.status === 'paid';
    const isRejected = extra.status === 'rejected';

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl shadow-purple-900/5 overflow-hidden border border-gray-100">
                    <div className="bg-[#0b2a4a] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">Service Extra</h1>
                                <Badge className={`bg-white/20 border-white/30 text-white capitalize`}>
                                    {extra.status}
                                </Badge>
                            </div>
                            <p className="text-blue-100 opacity-80">Please review this additional service request.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-blue-100 uppercase tracking-widest opacity-60 mb-1">Amount</p>
                            <p className="text-4xl font-black">${extra.amount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        <div className="mb-12">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Description</h2>
                            <p className="text-lg text-gray-900">{extra.description}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-purple-50 rounded-3xl border border-purple-100">
                            <div className="flex items-center gap-4">
                                {isApproved ? (
                                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                ) : isRejected ? (
                                    <div className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center text-white">
                                        <XCircle className="h-6 w-6" />
                                    </div>
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-gray-900 font-bold text-lg">
                                        {isApproved ? "Extra Approved" : isRejected ? "Extra Declined" : "Ready for your decision"}
                                    </p>
                                    <p className="text-purple-700/60 text-sm">
                                        {isApproved
                                            ? "You have approved this extra."
                                            : isRejected
                                            ? "You have declined this extra."
                                            : "Please approve or decline this additional service."}
                                    </p>
                                </div>
                            </div>

                            {isPending && (
                                <div className="flex gap-3">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => handleRespond('rejected')}
                                        disabled={isResponding}
                                        className="h-14 rounded-2xl text-lg font-bold border-red-200 text-red-600 hover:bg-red-50 min-w-[120px]"
                                    >
                                        Decline
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={() => handleRespond('approved')}
                                        disabled={isResponding}
                                        className="bg-purple-600 hover:bg-purple-700 text-white min-w-[160px] h-14 rounded-2xl text-lg font-bold shadow-lg shadow-purple-600/20"
                                    >
                                        {isResponding ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Approve"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-8 text-center text-gray-400 text-sm">
                    <p>© {new Date().getFullYear()} Secure Document Viewer. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default PublicExtraView;
