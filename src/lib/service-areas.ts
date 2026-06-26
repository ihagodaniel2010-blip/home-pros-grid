import { supabase } from "./supabase";

export interface ServiceArea {
  id?: string;
  organization_id?: string;
  mode: 'zip_list' | 'radius' | 'city_state';
  zip?: string;
  city?: string;
  state?: string;
  radius_miles?: number;
  latitude?: number;
  longitude?: number;
  active: boolean;
  created_at?: string;
}

export const getServiceAreas = async (organizationId: string): Promise<ServiceArea[]> => {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('company_service_areas')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching service areas:", error);
    return [];
  }

  return data as ServiceArea[];
};

export const saveServiceAreas = async (organizationId: string, areas: Partial<ServiceArea>[]): Promise<boolean> => {
  if (!supabase) return false;

  // Real world implementation usually sets active = false or does smart diff.
  // For MVP, deleting and recreating is cleaner for pure list.
  const { error: deleteError } = await supabase
    .from('company_service_areas')
    .delete()
    .eq('organization_id', organizationId);

  if (deleteError) {
    console.error("Error clearing old areas:", deleteError);
    return false;
  }

  if (areas.length === 0) return true;

  // Then insert new ones
  const newAreas = areas.map(a => ({
    organization_id: organizationId,
    mode: a.mode || 'zip_list',
    zip: a.zip,
    city: a.city,
    state: a.state,
    latitude: a.latitude,
    longitude: a.longitude,
    radius_miles: 10,
    active: true
  }));

  const { error: insertError } = await supabase
    .from('company_service_areas')
    .insert(newAreas);

  if (insertError) {
    console.error("Error inserting areas:", insertError);
    return false;
  }

  return true;
};
