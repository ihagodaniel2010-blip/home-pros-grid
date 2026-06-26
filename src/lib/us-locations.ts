export interface USLocation {
  city: string;
  state: string;
  zip: string;
  county?: string;
  latitude: number;
  longitude: number;
}

// Fallback MVP static list of service areas
export const US_LOCATIONS_MVP: USLocation[] = [
  { city: "Old Orchard Beach", state: "ME", zip: "04064", county: "York", latitude: 43.5186, longitude: -70.3807 },
  { city: "Biddeford", state: "ME", zip: "04005", county: "York", latitude: 43.4925, longitude: -70.4534 },
  { city: "Saco", state: "ME", zip: "04072", county: "York", latitude: 43.5175, longitude: -70.4566 },
  { city: "Portland", state: "ME", zip: "04101", county: "Cumberland", latitude: 43.6614, longitude: -70.2553 },
  { city: "South Portland", state: "ME", zip: "04106", county: "Cumberland", latitude: 43.6331, longitude: -70.2647 },
  { city: "Scarborough", state: "ME", zip: "04074", county: "Cumberland", latitude: 43.5781, longitude: -70.3223 },
  { city: "Ogunquit", state: "ME", zip: "03907", county: "York", latitude: 43.2464, longitude: -70.5966 },
  { city: "Wells", state: "ME", zip: "04090", county: "York", latitude: 43.3220, longitude: -70.5814 },
  { city: "Sanford", state: "ME", zip: "04073", county: "York", latitude: 43.4392, longitude: -70.7742 },
  { city: "Kennebunk", state: "ME", zip: "04043", county: "York", latitude: 43.3838, longitude: -70.5452 },
  { city: "Kennebunkport", state: "ME", zip: "04046", county: "York", latitude: 43.3614, longitude: -70.4770 },
  { city: "Westbrook", state: "ME", zip: "04092", county: "Cumberland", latitude: 43.6766, longitude: -70.3705 },
  { city: "Windham", state: "ME", zip: "04062", county: "Cumberland", latitude: 43.8341, longitude: -70.4131 },
  { city: "Gorham", state: "ME", zip: "04038", county: "Cumberland", latitude: 43.6795, longitude: -70.4442 },
  { city: "Salem", state: "NH", zip: "03079", county: "Rockingham", latitude: 42.7884, longitude: -71.2008 },
  { city: "Lowell", state: "MA", zip: "01852", county: "Middlesex", latitude: 42.6334, longitude: -71.3161 },
  { city: "Orlando", state: "FL", zip: "32801", county: "Orange", latitude: 28.5383, longitude: -81.3792 },
  { city: "Orlando", state: "FL", zip: "32803", county: "Orange", latitude: 28.5529, longitude: -81.3503 },
  { city: "Winter Park", state: "FL", zip: "32789", county: "Orange", latitude: 28.5992, longitude: -81.3534 },
  { city: "Miami", state: "FL", zip: "33101", county: "Miami-Dade", latitude: 25.7761, longitude: -80.1983 }
];
