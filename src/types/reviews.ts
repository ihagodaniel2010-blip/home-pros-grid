export interface Review {
  id: string;
  userName: string;
  userAvatarUrl: string;
  rating: number; // 1-5
  body: string;
  createdAt: Date;
}

export interface ReviewsStats {
  avgRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number; // count per rating
  };
}

export interface AddReviewInput {
  userName: string;
  userAvatarUrl: string;
  rating: number;
  body: string;
}

export interface ReviewsFilter {
  rating?: number; // filter by exact rating (or undefined for all)
  sort?: "newest" | "highest"; // sort order
  limit?: number;
  offset?: number;
}

export interface ReviewsServiceInterface {
  getReviews(filter?: ReviewsFilter): Promise<Review[]>;
  addReview(review: AddReviewInput): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  getStats(): Promise<ReviewsStats>;
}
