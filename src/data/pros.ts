export interface Pro {
  id: string;
  name: string;
  initials: string;
  location: string;
  state: string;
  rating: number;
  reviews: number;
  badges: string[];
}

export const mockPros: Pro[] = [
  { 
    id: "p1", 
    name: "Adelmo Santos", 
    initials: "AS",
    location: "Lowell", 
    state: "MA", 
    rating: 4.9, 
    reviews: 127,
    badges: ["Verified", "Professional"]
  },
  { 
    id: "p2", 
    name: "Hugo Luis", 
    initials: "HL",
    location: "Maine", 
    state: "ME", 
    rating: 4.9, 
    reviews: 132,
    badges: ["Verified", "Professional"]
  },
];
