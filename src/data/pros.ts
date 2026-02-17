export interface Pro {
  id: string;
  name: string;
  company: string;
  city: string;
  state: string;
  zip: string;
  rating: number;
  badges: string[];
}

export const mockPros: Pro[] = [
  { id: "p1", name: "James Mitchell", company: "Mitchell Home Services", city: "Austin", state: "TX", zip: "78701", rating: 4.9, badges: ["Verified", "Reliable"] },
  { id: "p2", name: "Sarah Chen", company: "Chen Contracting", city: "Dallas", state: "TX", zip: "75201", rating: 4.8, badges: ["Verified", "Local"] },
  { id: "p3", name: "Robert Garcia", company: "Garcia & Sons", city: "Houston", state: "TX", zip: "77001", rating: 4.7, badges: ["Reliable", "Local"] },
  { id: "p4", name: "Emily Thompson", company: "Thompson Renovations", city: "Phoenix", state: "AZ", zip: "85001", rating: 5.0, badges: ["Verified", "Reliable", "Local"] },
  { id: "p5", name: "Michael Brown", company: "Brown Building Co", city: "Denver", state: "CO", zip: "80201", rating: 4.6, badges: ["Verified"] },
  { id: "p6", name: "Lisa Wang", company: "Wang Pro Services", city: "Seattle", state: "WA", zip: "98101", rating: 4.8, badges: ["Verified", "Reliable"] },
  { id: "p7", name: "David Martinez", company: "Martinez Electric", city: "Miami", state: "FL", zip: "33101", rating: 4.5, badges: ["Local"] },
  { id: "p8", name: "Jennifer Lee", company: "Lee Plumbing", city: "Chicago", state: "IL", zip: "60601", rating: 4.9, badges: ["Verified", "Reliable", "Local"] },
  { id: "p9", name: "Chris Johnson", company: "Johnson Roofing", city: "Atlanta", state: "GA", zip: "30301", rating: 4.4, badges: ["Reliable"] },
  { id: "p10", name: "Amanda Davis", company: "Davis Landscaping", city: "Portland", state: "OR", zip: "97201", rating: 4.7, badges: ["Verified", "Local"] },
  { id: "p11", name: "Kevin Wilson", company: "Wilson HVAC", city: "Nashville", state: "TN", zip: "37201", rating: 4.8, badges: ["Verified", "Reliable"] },
  { id: "p12", name: "Rachel Kim", company: "Kim Remodeling", city: "San Diego", state: "CA", zip: "92101", rating: 4.6, badges: ["Local"] },
  { id: "p13", name: "Thomas Anderson", company: "Anderson Painting", city: "Minneapolis", state: "MN", zip: "55401", rating: 4.9, badges: ["Verified"] },
  { id: "p14", name: "Maria Gonzalez", company: "Gonzalez Tile", city: "San Antonio", state: "TX", zip: "78201", rating: 4.5, badges: ["Reliable", "Local"] },
  { id: "p15", name: "Daniel Park", company: "Park Construction", city: "Boston", state: "MA", zip: "02101", rating: 4.7, badges: ["Verified", "Reliable"] },
  { id: "p16", name: "Stephanie Clark", company: "Clark Cleaning", city: "Charlotte", state: "NC", zip: "28201", rating: 4.8, badges: ["Verified", "Local"] },
  { id: "p17", name: "Brian Taylor", company: "Taylor Fencing", city: "Columbus", state: "OH", zip: "43201", rating: 4.3, badges: ["Local"] },
  { id: "p18", name: "Nicole Harris", company: "Harris Handyman", city: "Indianapolis", state: "IN", zip: "46201", rating: 4.6, badges: ["Reliable"] },
  { id: "p19", name: "Jason Wright", company: "Wright Electric", city: "Jacksonville", state: "FL", zip: "32099", rating: 4.9, badges: ["Verified", "Reliable", "Local"] },
  { id: "p20", name: "Laura Robinson", company: "Robinson Flooring", city: "Las Vegas", state: "NV", zip: "89101", rating: 4.2, badges: ["Local"] },
];
