export type PortfolioItem = {
  id: string;
  title: string;
  category: string;
  coverImage: string;
  images: string[];
  tags: string[];
  description: string;
  highlights: string[];
  materials: string[];
  timeline: string[];
  scope: string;
  featured?: boolean;
  beforeAfter?: { before: string; after: string };
};

export type PortfolioData = {
  categories: string[];
  items: PortfolioItem[];
  updatedAt?: string;
  version?: number;
};
