import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, Store, Save, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

interface Task {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  default_lead_price: number;
  active: boolean;
}

const AdminServices = () => {
  const { user } = useUser();
  const currentOrganization = user?.organization;
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!currentOrganization?.id) return;

    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        // Load categories
        const { data: cats, error: catsErr } = await supabase
          .from("service_categories")
          .select("id, slug, name, active")
          .eq("active", true)
          .order("name");
        if (catsErr) throw catsErr;

        // Load tasks
        const { data: tsks, error: tsksErr } = await supabase
          .from("service_tasks")
          .select("id, category_id, slug, name, default_lead_price, active")
          .eq("active", true)
          .order("name");
        if (tsksErr) throw tsksErr;

        // Load company selections
        const { data: selections, error: selErr } = await supabase
          .from("company_services")
          .select("service_task_id")
          .eq("organization_id", currentOrganization.id)
          .eq("active", true)
          .not("service_task_id", "is", null);
        if (selErr) throw selErr;

        if (!active) return;

        setCategories(cats || []);
        setTasks(tsks || []);
        
        const selSet = new Set<string>();
        selections?.forEach(s => {
          if (s.service_task_id) selSet.add(s.service_task_id);
        });
        setSelectedTaskIds(selSet);

        // Expand categories that have selected tasks
        const expSet = new Set<string>();
        cats?.forEach(cat => {
          const catTasks = (tsks || []).filter(t => t.category_id === cat.id);
          if (catTasks.some(t => selSet.has(t.id))) {
            expSet.add(cat.id);
          }
        });
        setExpandedCategories(expSet);

      } catch (err) {
        console.error("Failed to load services:", err);
        if (active) toast.error("Failed to load services data.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [currentOrganization?.id]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const turnOnCategory = (categoryId: string) => {
    const catTasks = tasks.filter(t => t.category_id === categoryId);
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      catTasks.forEach(t => next.add(t.id));
      return next;
    });
  };

  const turnOffCategory = (categoryId: string) => {
    const catTasks = tasks.filter(t => t.category_id === categoryId);
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      catTasks.forEach(t => next.delete(t.id));
      return next;
    });
  };

  const turnOnAll = () => {
    setSelectedTaskIds(new Set(tasks.map(t => t.id)));
  };

  const handleSave = async () => {
    if (!currentOrganization?.id) return;
    setIsSaving(true);
    try {
      // First, get existing selections to compare or just delete all and recreate (easier for MVP)
      // Since it's a many-to-many table, a soft delete or upsert strategy is best.
      // We will set active = false for everything, then insert/update active = true for selected.
      
      await supabase
        .from("company_services")
        .update({ active: false })
        .eq("organization_id", currentOrganization.id)
        .not("service_task_id", "is", null);

      if (selectedTaskIds.size > 0) {
        const inserts = Array.from(selectedTaskIds).map(taskId => ({
          organization_id: currentOrganization.id,
          service_task_id: taskId,
          active: true
        }));

        const { error } = await supabase
          .from("company_services")
          .upsert(inserts, { onConflict: "organization_id, service_task_id" });
        if (error) throw error;
      }

      toast.success("Services saved successfully.");
    } catch (err) {
      console.error("Failed to save services:", err);
      toast.error("Failed to save services.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse text-sm">Loading services...</p>
      </div>
    );
  }

  const filteredCategories = categories.filter(cat => {
    if (!searchQuery) return true;
    const catMatch = cat.name.toLowerCase().includes(searchQuery.toLowerCase());
    const hasTaskMatch = tasks.some(t => t.category_id === cat.id && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return catMatch || hasTaskMatch;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto pb-32">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Store className="h-8 w-8 text-primary/80" strokeWidth={1.5} />
            Services & Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Select the tasks your company performs to receive matching leads.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-slate-500">
            {selectedTaskIds.size} of {tasks.length} selected
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all duration-300 shadow-xl shadow-primary/20 disabled:opacity-60 active:scale-[0.98]"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm mb-6 flex items-center justify-between">
        <input
          type="text"
          placeholder="Search categories or tasks..."
          className="w-full max-w-md h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            if (e.target.value) {
              setExpandedCategories(new Set(categories.map(c => c.id)));
            }
          }}
        />
        <Button variant="outline" onClick={turnOnAll}>
          Turn on all tasks
        </Button>
      </div>

      <div className="space-y-4">
        {filteredCategories.map(cat => {
          const catTasks = tasks.filter(t => t.category_id === cat.id);
          if (catTasks.length === 0) return null;
          
          const isExpanded = expandedCategories.has(cat.id);
          const selectedInCat = catTasks.filter(t => selectedTaskIds.has(t.id)).length;
          
          return (
            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                  <h3 className="font-bold text-gray-900">{cat.name}</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                    {selectedInCat} / {catTasks.length}
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => turnOnCategory(cat.id)}>Turn on all</Button>
                    <Button variant="ghost" size="sm" onClick={() => turnOffCategory(cat.id)}>Turn off all</Button>
                  </div>
                )}
              </div>
              
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 grid gap-2">
                  {catTasks
                    .filter(t => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(task => {
                    const isSelected = selectedTaskIds.has(task.id);
                    return (
                      <div 
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                          <span className={isSelected ? 'font-semibold text-gray-900' : 'text-gray-700'}>{task.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">${task.default_lead_price}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filteredCategories.length === 0 && (
          <div className="text-center p-8 text-slate-500">No services found.</div>
        )}
      </div>
    </div>
  );
};

export default AdminServices;
