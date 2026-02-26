import type { PortfolioData, PortfolioItem } from "@/lib/portfolio-types";
import { supabase } from "@/lib/supabase";

const mapRowToItem = (row: any): PortfolioItem => ({
  id: row.id,
  title: row.title,
  category: row.category,
  coverImage: row.coverImage,
  images: row.images || [],
  tags: row.tags || [],
  description: row.description || "",
  highlights: row.highlights || [],
  materials: row.materials || [],
  timeline: row.timeline || [],
  scope: row.scope || "",
  featured: row.featured,
  beforeAfter: (row.beforeAfterBefore && row.beforeAfterAfter)
    ? { before: row.beforeAfterBefore, after: row.beforeAfterAfter }
    : undefined
});

export const fetchPortfolioPublic = async (): Promise<PortfolioData | null> => {
  if (!supabase) return null;

  try {
    const [catsRes, itemsRes] = await Promise.all([
      supabase.from("portfolio_categories").select("name").order("sortOrder"),
      supabase.from("portfolio_items").select("*").order("sortOrder")
    ]);

    if (catsRes.error) throw catsRes.error;
    if (itemsRes.error) throw itemsRes.error;

    return {
      categories: catsRes.data.map(c => c.name),
      items: itemsRes.data.map(mapRowToItem),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.warn("Failed to load portfolio data from Supabase", error);
    return null;
  }
};

export const fetchPortfolioAdmin = async (): Promise<PortfolioData> => {
  const data = await fetchPortfolioPublic();
  if (!data) throw new Error("Could not fetch portfolio data");
  return data;
};

export const savePortfolioAdmin = async (payload: PortfolioData): Promise<PortfolioData> => {
  if (!supabase) throw new Error("Supabase not configured");

  // This is a simplified bulk sync. For production, consider incremental updates.
  // 1. Update categories
  const categories = payload.categories.map((name, index) => ({ name, "sortOrder": index }));
  await supabase.from("portfolio_categories").delete().neq("name", "___FORCE_DELETE_ALL___");
  await supabase.from("portfolio_categories").insert(categories);

  // 2. Update items
  const items = payload.items.map((item, index) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    "coverImage": item.coverImage,
    images: item.images,
    tags: item.tags,
    description: item.description,
    highlights: item.highlights,
    materials: item.materials,
    timeline: item.timeline,
    scope: item.scope,
    featured: item.featured,
    "sortOrder": index,
    "beforeAfterBefore": item.beforeAfter?.before,
    "beforeAfterAfter": item.beforeAfter?.after
  }));

  await supabase.from("portfolio_items").delete().neq("id", "___FORCE_DELETE_ALL___");
  await supabase.from("portfolio_items").insert(items);

  return payload;
};
