import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Wand2, Loader2, Copy, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { getLeads } from "@/lib/leads";
import { 
  EstimateAssistantInput, 
  EstimateAssistantOutput, 
  generateEstimateDraft, 
  saveAssistantDraft 
} from "@/lib/estimate-assistant";

export default function EstimateAssistant() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("leadId");
  const { user } = useUser();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [input, setInput] = useState<EstimateAssistantInput>({
    serviceType: "other",
    jobDescription: "",
    measurements: {
      squareFeet: 0,
      linearFeet: 0,
      quantity: 0
    },
    labor: {
      hourlyRate: 50,
      estimatedHours: 8,
      crewSize: 1,
      difficulty: "medium"
    },
    materials: [],
    pricing: {
      overheadPercent: 10,
      profitMarginPercent: 20,
      discount: 0
    }
  });

  const [output, setOutput] = useState<EstimateAssistantOutput | null>(null);
  const [leadContext, setLeadContext] = useState<any>(null);

  useEffect(() => {
    if (leadId) {
      getLeads().then(leads => {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          setLeadContext(lead);
          setInput(prev => ({
            ...prev,
            serviceType: lead.selectedServiceOption || "other",
            jobDescription: lead.details || ""
          }));
        }
      });
    }
  }, [leadId]);

  const handleGenerate = () => {
    try {
      const generated = generateEstimateDraft(input);
      setOutput(generated);
      toast.success("Draft generated locally!");
    } catch (e) {
      toast.error("Failed to generate draft.");
    }
  };

  const handleAddMaterial = () => {
    setInput(prev => ({
      ...prev,
      materials: [...prev.materials, { name: "", quantity: 1, unitCost: 0, markupPercent: 30 }]
    }));
  };

  const handleRemoveMaterial = (index: number) => {
    setInput(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const newMaterials = [...input.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setInput(prev => ({ ...prev, materials: newMaterials }));
  };

  const handleSaveDraft = async () => {
    if (!user?.organization?.id) return;
    if (!output) {
      toast.error("Generate a draft first!");
      return;
    }
    
    setIsSaving(true);
    try {
      await saveAssistantDraft({
        organization_id: user.organization.id,
        lead_id: leadId || undefined,
        service_type: input.serviceType,
        input: input,
        output: output,
        status: "draft"
      });
      toast.success("Draft saved successfully.");
    } catch (error) {
      toast.error("Failed to save draft. Supabase tables might need to be created.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToEstimate = async () => {
    if (!user?.organization?.id) return;
    if (!output) {
      toast.error("Generate a draft first!");
      return;
    }
    
    setIsSaving(true);
    try {
      // Save it first, then redirect to EstimateEditor with draftId
      const saved = await saveAssistantDraft({
        organization_id: user.organization.id,
        lead_id: leadId || undefined,
        service_type: input.serviceType,
        input: input,
        output: output,
        status: "draft"
      });
      
      if (saved && saved.id) {
        toast.success("Converting to estimate...");
        navigate(`/admin/estimates/new?draftId=${saved.id}`);
      } else {
        toast.error("Could not save draft before converting.");
      }
    } catch (error) {
      toast.error("Database connection issue. Check table 015_homeleadpro_estimate_assistant_drafts.sql");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output.customerFriendlyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Scope copied to clipboard");
  };

  const handleReset = () => {
    setOutput(null);
  };

  if (user?.organization?.role === 'worker') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-red-500 font-bold">Access Denied: Workers cannot view or create estimates.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Estimate Assistant</h1>
            <p className="text-gray-500 text-sm">Generate structured quotes quickly from basic inputs.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {output && (
            <>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={handleConvertToEstimate} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                Convert to Estimate
              </Button>
            </>
          )}
        </div>
      </div>

      {leadContext && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Context loaded from Lead:</strong> {leadContext.fullName} - {leadContext.selectedServiceOption}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INPUT SECTION */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Service Type</label>
                <Input 
                  value={input.serviceType} 
                  onChange={(e) => setInput({...input, serviceType: e.target.value})} 
                  placeholder="e.g. Drywall, Painting, Carpentry" 
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Job Description / Notes</label>
                <Textarea 
                  value={input.jobDescription} 
                  onChange={(e) => setInput({...input, jobDescription: e.target.value})} 
                  placeholder="Describe what needs to be done..." 
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Measurements (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Square Feet</label>
                <Input type="number" value={input.measurements.squareFeet || ''} onChange={(e) => setInput({...input, measurements: {...input.measurements, squareFeet: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Linear Feet</label>
                <Input type="number" value={input.measurements.linearFeet || ''} onChange={(e) => setInput({...input, measurements: {...input.measurements, linearFeet: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Quantity / Items</label>
                <Input type="number" value={input.measurements.quantity || ''} onChange={(e) => setInput({...input, measurements: {...input.measurements, quantity: Number(e.target.value)}})} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Labor</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Hourly Rate ($)</label>
                <Input type="number" value={input.labor.hourlyRate} onChange={(e) => setInput({...input, labor: {...input.labor, hourlyRate: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Est. Hours</label>
                <Input type="number" value={input.labor.estimatedHours} onChange={(e) => setInput({...input, labor: {...input.labor, estimatedHours: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Crew Size</label>
                <Input type="number" value={input.labor.crewSize} onChange={(e) => setInput({...input, labor: {...input.labor, crewSize: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <Select value={input.labor.difficulty} onValueChange={(val: any) => setInput({...input, labor: {...input.labor, difficulty: val}})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (1.0x)</SelectItem>
                    <SelectItem value="medium">Medium (1.1x)</SelectItem>
                    <SelectItem value="hard">Hard (1.2x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Materials</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddMaterial}><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {input.materials.map((mat, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Item Name</label>
                    <Input value={mat.name} onChange={(e) => handleMaterialChange(idx, 'name', e.target.value)} />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500">Qty</label>
                    <Input type="number" value={mat.quantity} onChange={(e) => handleMaterialChange(idx, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-500">Unit Cost $</label>
                    <Input type="number" value={mat.unitCost} onChange={(e) => handleMaterialChange(idx, 'unitCost', Number(e.target.value))} />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-gray-500">Markup %</label>
                    <Input type="number" value={mat.markupPercent} onChange={(e) => handleMaterialChange(idx, 'markupPercent', Number(e.target.value))} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveMaterial(idx)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {input.materials.length === 0 && (
                <p className="text-sm text-gray-500 italic">No materials added.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Strategy</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Overhead %</label>
                <Input type="number" value={input.pricing.overheadPercent} onChange={(e) => setInput({...input, pricing: {...input.pricing, overheadPercent: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Profit Margin %</label>
                <Input type="number" value={input.pricing.profitMarginPercent} onChange={(e) => setInput({...input, pricing: {...input.pricing, profitMarginPercent: Number(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Discount $</label>
                <Input type="number" value={input.pricing.discount} onChange={(e) => setInput({...input, pricing: {...input.pricing, discount: Number(e.target.value)}})} />
              </div>
            </CardContent>
          </Card>
          
          <Button onClick={handleGenerate} className="w-full h-12 text-lg bg-[#0b2a4a] hover:bg-[#081e35]">
            <Wand2 className="h-5 w-5 mr-2" />
            Generate / Calculate Draft
          </Button>

        </div>


        {/* OUTPUT SECTION */}
        <div className="space-y-6">
          {output ? (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-emerald-900">{output.title}</CardTitle>
                  <CardDescription>Generated locally. Ready for review.</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 uppercase font-semibold tracking-wider">Final Price</p>
                  <p className="text-3xl font-bold text-emerald-700">${output.totals.finalTotal.toLocaleString()}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-2">Scope of Work</h3>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{output.scopeOfWork}</pre>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-2">Customer Pitch (Ready to Copy)</h3>
                  <div className="relative">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 pr-12">{output.customerFriendlyText}</pre>
                    <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-8 w-8" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2 text-sm">Labor Cost Breakdown</h3>
                    {output.laborItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm mb-1">
                        <span className="truncate mr-2" title={item.description}>{item.description}</span>
                        <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm mt-3 pt-2 border-t font-semibold">
                      <span>Total Labor</span>
                      <span>${output.totals.laborTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2 text-sm">Materials Cost Breakdown (w/ Markup)</h3>
                    {output.materialItems.length > 0 ? output.materialItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm mb-1">
                        <span className="truncate mr-2" title={item.description}>{item.quantity}x {item.description}</span>
                        <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    )) : (
                       <p className="text-sm text-gray-500 italic">None</p>
                    )}
                    <div className="flex justify-between text-sm mt-3 pt-2 border-t font-semibold">
                      <span>Total Materials</span>
                      <span>${output.totals.materialsTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 text-white p-6 rounded-lg">
                  <h3 className="font-semibold text-gray-300 mb-4 uppercase text-xs tracking-widest border-b border-gray-700 pb-2">Internal Financials (Hidden from Customer)</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subtotal (Labor + Mats)</span>
                      <span>${output.totals.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overhead ({input.pricing.overheadPercent}%)</span>
                      <span className="text-orange-400">+ ${output.totals.overheadAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Margin ({input.pricing.profitMarginPercent}%)</span>
                      <span className="text-green-400">+ ${output.totals.profitAmount.toLocaleString()}</span>
                    </div>
                    {output.totals.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Discount</span>
                        <span className="text-red-400">- ${output.totals.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold mt-4 pt-4 border-t border-gray-700">
                      <span>Final Price</span>
                      <span>${output.totals.finalTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
              <Wand2 className="h-12 w-12 mb-4 text-gray-300" />
              <p>Fill out the details on the left and click Generate.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
