import { useEffect, useMemo, useState } from "react";
import { Save, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import type { PortfolioData, PortfolioItem } from "@/lib/portfolio-types";
import { fetchPortfolioAdmin, savePortfolioAdmin } from "@/lib/portfolio-api";

const createEmptyItem = (categories: string[]): PortfolioItem => {
  const baseCategory = categories[0] || "Remodeling";
  const fallbackId = `project-${Date.now()}`;
  return {
    id: fallbackId,
    title: "New Project",
    category: baseCategory,
    coverImage: "",
    images: [],
    tags: [],
    description: "",
    highlights: [],
    materials: [],
    timeline: [],
    scope: "",
    featured: false,
  };
};

const toList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toText = (list: string[]) => list.join(", ");

const AdminPortfolio = () => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPortfolioAdmin()
      .then((payload) => {
        if (!active) return;
        setData(payload);
        setCategoryInput(payload.categories.join(", "));
        setActiveId(payload.items[0]?.id || null);
      })
      .catch(() => {
        if (!active) return;
        setStatus("Unable to load portfolio data.");
      });
    return () => {
      active = false;
    };
  }, []);

  const items = data?.items || [];
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) || null,
    [items, activeId]
  );

  const updateItem = (patch: Partial<PortfolioItem>) => {
    if (!data || !activeItem) return;
    setData({
      ...data,
      items: data.items.map((item) =>
        item.id === activeItem.id ? { ...item, ...patch } : item
      ),
    });
  };

  const handleAdd = () => {
    if (!data) return;
    const next = createEmptyItem(data.categories);
    setData({ ...data, items: [next, ...data.items] });
    setActiveId(next.id);
  };

  const handleDelete = () => {
    if (!data || !activeItem) return;
    const nextItems = data.items.filter((item) => item.id !== activeItem.id);
    setData({ ...data, items: nextItems });
    setActiveId(nextItems[0]?.id || null);
  };

  const handleSave = async () => {
    if (!data) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const normalized = {
        ...data,
        categories: toList(categoryInput),
      };
      const saved = await savePortfolioAdmin(normalized);
      setData(saved);
      setCategoryInput(saved.categories.join(", "));
      setStatus("Saved successfully.");
    } catch (error) {
      setStatus("Save failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-sm text-gray-600 mt-1">Manage projects, categories, and featured content.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
          <button
            onClick={handleSave}
            disabled={!data || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {isSaving ? "Saving" : "Save Changes"}
          </button>
        </div>
      </div>

      {status && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          {status}
        </div>
      )}

      {!data ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">Loading portfolio data...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Projects</div>
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                    activeId === item.id
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-gray-900">{item.title || "Untitled"}</div>
                  <div className="text-xs text-gray-500">{item.category || "Uncategorized"}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            {!activeItem ? (
              <div className="text-sm text-gray-600">Select a project to edit.</div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-gray-700">
                    Title
                    <input
                      value={activeItem.title}
                      onChange={(event) => updateItem({ title: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Category
                    <input
                      value={activeItem.category}
                      onChange={(event) => updateItem({ category: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="text-sm text-gray-700">
                  Cover Image URL
                  <input
                    value={activeItem.coverImage}
                    onChange={(event) => updateItem({ coverImage: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="/images/cover.jpg"
                  />
                </label>

                <label className="text-sm text-gray-700">
                  Image Gallery URLs (comma separated)
                  <textarea
                    rows={3}
                    value={toText(activeItem.images)}
                    onChange={(event) => updateItem({ images: toList(event.target.value) })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-gray-700">
                    Tags (comma separated)
                    <input
                      value={toText(activeItem.tags)}
                      onChange={(event) => updateItem({ tags: toList(event.target.value) })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Scope
                    <input
                      value={activeItem.scope}
                      onChange={(event) => updateItem({ scope: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="text-sm text-gray-700">
                  Description
                  <textarea
                    rows={3}
                    value={activeItem.description}
                    onChange={(event) => updateItem({ description: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="text-sm text-gray-700">
                    Highlights
                    <textarea
                      rows={3}
                      value={toText(activeItem.highlights)}
                      onChange={(event) => updateItem({ highlights: toList(event.target.value) })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Materials
                    <textarea
                      rows={3}
                      value={toText(activeItem.materials)}
                      onChange={(event) => updateItem({ materials: toList(event.target.value) })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    Timeline
                    <textarea
                      rows={3}
                      value={toText(activeItem.timeline)}
                      onChange={(event) => updateItem({ timeline: toList(event.target.value) })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-gray-700">
                    Before Image URL
                    <input
                      value={activeItem.beforeAfter?.before || ""}
                      onChange={(event) =>
                        updateItem({
                          beforeAfter: {
                            before: event.target.value,
                            after: activeItem.beforeAfter?.after || "",
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-gray-700">
                    After Image URL
                    <input
                      value={activeItem.beforeAfter?.after || ""}
                      onChange={(event) =>
                        updateItem({
                          beforeAfter: {
                            before: activeItem.beforeAfter?.before || "",
                            after: event.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(activeItem.featured)}
                      onChange={(event) => updateItem({ featured: event.target.checked })}
                    />
                    Featured project
                  </label>
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" /> Delete project
                  </button>
                </div>

                <div className="rounded-xl border border-dashed border-gray-200 p-4 text-xs text-gray-500">
                  <div className="flex items-center gap-2 font-semibold text-gray-600">
                    <ImageIcon className="h-4 w-4" /> Image tips
                  </div>
                  <p className="mt-2">
                    Use absolute paths from /public or full URLs. Keep image sizes consistent for the best layout.
                  </p>
                </div>

                <label className="text-sm text-gray-700">
                  Categories (comma separated)
                  <input
                    value={categoryInput}
                    onChange={(event) => {
                      setCategoryInput(event.target.value);
                      if (!data) return;
                      setData({ ...data, categories: toList(event.target.value) });
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPortfolio;
