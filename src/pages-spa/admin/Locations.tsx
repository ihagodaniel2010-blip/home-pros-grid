import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Search, X, Save, Trash2, Loader2, Plus, Info, CheckCircle2, Crosshair } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { USLocation } from "@/lib/us-locations";
import { searchLocations, findNearestLocation } from "@/lib/location-search";
import { getServiceAreas, saveServiceAreas, ServiceArea } from "@/lib/service-areas";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default marker icons in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map clicks
function MapEvents({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to fit bounds
function FitBounds({ locations }: { locations: USLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    const bounds = L.latLngBounds(locations.map(loc => [loc.latitude, loc.longitude]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
  }, [locations, map]);
  return null;
}

export default function Locations() {
  const { t } = useLanguage();
  const { user } = useUser();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<USLocation[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<USLocation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [suggestedLocation, setSuggestedLocation] = useState<USLocation | null>(null);

  const orgId = user?.organization?.id;
  const userRole = user?.organization?.role;

  useEffect(() => {
    if (orgId) {
      loadAreas();
    }
  }, [orgId]);

  const loadAreas = async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const areas = await getServiceAreas(orgId);
      const mapped: USLocation[] = areas.map(a => ({
        city: a.city || "Unknown City",
        state: a.state || "Unknown State",
        zip: a.zip || "",
        latitude: a.latitude || 43.6614, // default to Portland ME if missing
        longitude: a.longitude || -70.2553
      }));
      setSelectedLocations(mapped);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load service areas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = await searchLocations(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const nearest = await findNearestLocation(lat, lng);
    if (nearest) {
      setSuggestedLocation(nearest);
    } else {
      toast.error("No supported ZIP found near this point in MVP data.");
      setSuggestedLocation(null);
    }
  };

  const addLocation = (loc: USLocation) => {
    if (loc.city === "Unknown City" || !loc.zip || loc.zip === "00000" || loc.zip === "12345") {
      toast.error("Location not found in MVP ZIP database.");
      return;
    }

    if (selectedLocations.find(s => s.zip === loc.zip)) {
      toast.info("Already selected.");
    } else {
      setSelectedLocations([...selectedLocations, loc]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setSuggestedLocation(null);
  };

  const removeLocation = (index: number) => {
    setSelectedLocations(selectedLocations.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!orgId) return;
    if (userRole === 'worker') {
      toast.error("Workers cannot edit service locations.");
      return;
    }

    // Double check valid
    const validLocations = selectedLocations.filter(loc => loc.city !== "Unknown City" && loc.zip && loc.zip !== "12345");

    setIsSaving(true);
    try {
      const areasToSave: Partial<ServiceArea>[] = validLocations.map(loc => ({
        mode: 'zip_list',
        zip: loc.zip,
        city: loc.city,
        state: loc.state,
        latitude: loc.latitude,
        longitude: loc.longitude
      }));
      
      const success = await saveServiceAreas(orgId, areasToSave);
      if (success) {
        toast.success("Service locations saved successfully!");
      } else {
        toast.error("Failed to save service locations.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedLocations = useMemo(() => {
    const groups: Record<string, USLocation[]> = {};
    selectedLocations.forEach(loc => {
      const key = `${loc.city}, ${loc.state}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(loc);
    });
    return groups;
  }, [selectedLocations]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const defaultCenter: [number, number] = selectedLocations.length > 0 
    ? [selectedLocations[0].latitude, selectedLocations[0].longitude]
    : [43.6614, -70.2553]; // Maine default

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen bg-slate-50">
      
      {/* LEFT PANEL - Search & List */}
      <div className="w-full lg:w-[450px] lg:border-r border-slate-200 bg-white flex flex-col h-full shadow-xl z-10">
        
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Service Locations
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Choose the ZIP codes and cities where your company wants to receive leads.
          </p>
        </div>

        <div className="p-6 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search by city, town or ZIP code..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-6 right-6 lg:w-[402px] mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={`${result.zip}-${idx}`}
                  onClick={() => addLocation(result)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <div className="font-medium text-slate-900 group-hover:text-primary transition-colors">
                      {result.city}, {result.state}
                    </div>
                    <div className="text-xs text-slate-500">ZIP: {result.zip}</div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700 text-sm">
              {selectedLocations.length} ZIP codes selected across {Object.keys(groupedLocations).length} cities
            </h3>
            {selectedLocations.length > 0 && (
              <button 
                onClick={() => setSelectedLocations([])}
                className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded-md transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {selectedLocations.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Search above or click the map to add areas you service.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedLocations).map(([cityState, locs]) => (
                <div key={cityState} className="bg-slate-50 rounded-xl border border-slate-200/60 overflow-hidden">
                  <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-200/60 font-medium text-sm text-slate-700 flex justify-between items-center">
                    {cityState}
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm text-slate-500">
                      {locs.length} ZIPs
                    </span>
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {locs.map((loc) => {
                      const originalIndex = selectedLocations.findIndex(l => l.zip === loc.zip && l.city === loc.city);
                      const isUnknown = loc.city === "Unknown City" || loc.zip === "12345";
                      return (
                        <div key={loc.zip} className={`flex items-center justify-between bg-white px-3 py-2 rounded-lg border shadow-sm group ${isUnknown ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                          <span className={`text-sm font-medium ${isUnknown ? 'text-red-600' : 'text-slate-700'}`}>
                            {loc.zip}
                            {isUnknown && <span className="block text-[10px] text-red-500">Invalid / needs review</span>}
                          </span>
                          <button
                            onClick={() => removeLocation(originalIndex)}
                            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-70 disabled:pointer-events-none"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Service Areas
          </button>
        </div>
        
      </div>

      {/* RIGHT PANEL - Interactive Map */}
      <div className="flex-1 relative order-first lg:order-last h-[40vh] lg:h-auto border-b lg:border-l lg:border-b-0 border-slate-200">
        
        {/* Map Suggestion Modal / Popup */}
        {suggestedLocation && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-80 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Add Location?</h4>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Add ZIP {suggestedLocation.zip} — {suggestedLocation.city}, {suggestedLocation.state}?
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => addLocation(suggestedLocation)}
                    className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => setSuggestedLocation(null)}
                    className="flex-1 bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <MapContainer 
          center={defaultCenter} 
          zoom={10} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onMapClick={handleMapClick} />
          {selectedLocations.length > 0 && <FitBounds locations={selectedLocations} />}
          
          {selectedLocations.map((loc, idx) => {
            if (!loc.latitude || !loc.longitude) return null;
            return (
              <React.Fragment key={`${loc.zip}-${idx}`}>
                <Marker position={[loc.latitude, loc.longitude]} />
                <Circle 
                  center={[loc.latitude, loc.longitude]} 
                  radius={8000} // ~5 miles radius visual indication
                  pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>

      </div>
      
    </div>
  );
}
