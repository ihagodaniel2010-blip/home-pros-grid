import React, { useState } from "react";
import { Camera, Plus, Eye, EyeOff, Globe, Shield, CheckCircle, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface JobPhoto {
    id: string;
    url: string;
    caption: string;
    uploaded_at: string;
    uploaded_by: string;
    visible_to_client: boolean;
    visible_on_public_site: boolean;
    portfolio_approved: boolean;
}

interface JobProjectPhotosProps {
    jobId: string;
}

const JobProjectPhotos: React.FC<JobProjectPhotosProps> = ({ jobId }) => {
    const [photos, setPhotos] = useState<JobPhoto[]>([
        {
            id: "photo-1",
            url: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=600&q=80",
            caption: "Initial framing installation & inspection",
            uploaded_at: new Date().toISOString(),
            uploaded_by: "Hugo Manager",
            visible_to_client: true,
            visible_on_public_site: false,
            portfolio_approved: false
        }
    ]);

    const [isUploading, setIsUploading] = useState(false);
    const [newCaption, setNewCaption] = useState("");
    const [newVisibility, setNewVisibility] = useState<'admin' | 'client' | 'public'>('client');
    const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (selectedFileUrl && selectedFileUrl.startsWith('blob:')) {
                URL.revokeObjectURL(selectedFileUrl);
            }
            const url = URL.createObjectURL(file);
            setSelectedFileUrl(url);
        }
    };


    const handleAddPhoto = async () => {
        if (!selectedFileUrl) return;
        const orgId = "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";
        const storagePath = `${orgId}/jobs/${jobId}/photos/${Date.now()}.jpg`;

        try {
            const { uploadJobMediaRecord } = await import("@/lib/job-media");
            await uploadJobMediaRecord({
                organization_id: orgId,
                service_job_id: jobId,
                media_type: 'image',
                storage_path: storagePath,
                file_name: `job_photo_${Date.now()}.jpg`,
                mime_type: 'image/jpeg',
                file_size_bytes: 1048576,
                caption: newCaption || "Job progress photo"
            });
        } catch (err) {
            console.warn("Job media record DB upload handled:", err);
        }

        const newPhoto: JobPhoto = {
            id: `photo-${Date.now()}`,
            url: selectedFileUrl,
            caption: newCaption || "Job progress photo",
            uploaded_at: new Date().toISOString(),
            uploaded_by: "Authorized User",
            visible_to_client: newVisibility === 'client' || newVisibility === 'public',
            visible_on_public_site: newVisibility === 'public',
            portfolio_approved: false
        };
        setPhotos([newPhoto, ...photos]);
        setSelectedFileUrl(null);
        setNewCaption("");
        setIsUploading(false);
    };

    const toggleVisibility = (id: string, mode: 'client' | 'public' | 'portfolio') => {
        setPhotos(prev => prev.map(p => {
            if (p.id === id) {
                if (mode === 'client') return { ...p, visible_to_client: !p.visible_to_client };
                if (mode === 'public') return { ...p, visible_on_public_site: !p.visible_on_public_site };
                if (mode === 'portfolio') return { ...p, portfolio_approved: !p.portfolio_approved };
            }
            return p;
        }));
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-[#0b2a4a] text-base flex items-center gap-2">
                        <Camera className="h-5 w-5 text-blue-600" />
                        Project Photos
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Manage job site documentation and client visibility controls.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploading(!isUploading)}
                    className="h-9 font-bold text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                    <Plus className="h-4 w-4 mr-1" /> Add Photos
                </Button>
            </div>

            {isUploading && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4 animate-in fade-in">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700">Select Image File</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="w-full text-xs text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                    </div>

                    {selectedFileUrl && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                            <img src={selectedFileUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700">Caption / Notes</label>
                        <input
                            type="text"
                            placeholder="e.g. Completed deck joists framing"
                            value={newCaption}
                            onChange={(e) => setNewCaption(e.target.value)}
                            className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700">Initial Visibility Level</label>
                        <select
                            value={newVisibility}
                            onChange={(e) => setNewVisibility(e.target.value as any)}
                            className="w-full h-9 px-3 bg-white border border-gray-200 rounded-xl text-xs"
                        >
                            <option value="admin">Admin Only (Internal)</option>
                            <option value="client">Client &amp; Admin (Visible to Customer)</option>
                            <option value="public">Public Website Candidate (Requires Review)</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsUploading(false)} className="h-8 text-xs">
                            Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddPhoto} disabled={!selectedFileUrl} className="h-8 text-xs bg-[#0b2a4a] text-white">
                            Upload Photo
                        </Button>
                    </div>
                </div>
            )}

            {/* Photos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                    <div key={photo.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col group">
                        <div className="aspect-video relative overflow-hidden bg-slate-900">
                            <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                {photo.visible_to_client ? (
                                    <Badge className="bg-emerald-500/90 text-white text-[9px] px-1.5 py-0.5">
                                        <Eye className="h-3 w-3 mr-1" /> Client Visible
                                    </Badge>
                                ) : (
                                    <Badge className="bg-slate-700/90 text-white text-[9px] px-1.5 py-0.5">
                                        <EyeOff className="h-3 w-3 mr-1" /> Admin Only
                                    </Badge>
                                )}
                                {photo.visible_on_public_site && (
                                    <Badge className="bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5">
                                        <Globe className="h-3 w-3 mr-1" /> Public Candidate
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                                <p className="text-xs font-bold text-gray-900 leading-snug">{photo.caption}</p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Uploaded {new Date(photo.uploaded_at).toLocaleDateString()} by {photo.uploaded_by}
                                </p>
                            </div>

                            {/* Visibility Toggles */}
                            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1.5 text-[10px]">
                                <button
                                    onClick={() => toggleVisibility(photo.id, 'client')}
                                    className={`px-2 py-1 rounded-lg border font-semibold transition-all ${
                                        photo.visible_to_client ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}
                                >
                                    Client: {photo.visible_to_client ? 'ON' : 'OFF'}
                                </button>
                                <button
                                    onClick={() => toggleVisibility(photo.id, 'public')}
                                    className={`px-2 py-1 rounded-lg border font-semibold transition-all ${
                                        photo.visible_on_public_site ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}
                                >
                                    Public: {photo.visible_on_public_site ? 'ON' : 'OFF'}
                                </button>
                                <button
                                    onClick={() => toggleVisibility(photo.id, 'portfolio')}
                                    className={`px-2 py-1 rounded-lg border font-semibold transition-all ${
                                        photo.portfolio_approved ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}
                                >
                                    Portfolio Review: {photo.portfolio_approved ? 'Approved' : 'Pending'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-gray-400 italic">
                ℹ️ Job Photos UI in Client Preview Mode (Database table `service_job_media` &amp; Storage bucket deferred to Phase 10.7B).
            </p>
        </div>
    );
};

export default JobProjectPhotos;
