import {
  Review,
  ReviewsStats,
  AddReviewInput,
  ReviewsFilter,
  ReviewsServiceInterface,
} from "@/types/reviews";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "barrigudo_reviews";

export class LocalReviewsService implements ReviewsServiceInterface {
  private getAll(): Review[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const reviews = JSON.parse(data) as Array<any>;
      return reviews.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt),
      }));
    } catch {
      return [];
    }
  }

  private saveAll(reviews: Review[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }

  async getReviews(filter?: ReviewsFilter): Promise<Review[]> {
    let reviews = this.getAll();

    // Filter by rating
    if (filter?.rating) {
      reviews = reviews.filter((r) => r.rating === filter.rating);
    }

    // Sort
    if (filter?.sort === "highest") {
      reviews.sort((a, b) => b.rating - a.rating || b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      // default: newest first
      reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Pagination
    const limit = filter?.limit ?? 6;
    const offset = filter?.offset ?? 0;
    return reviews.slice(offset, offset + limit);
  }

  async addReview(input: AddReviewInput): Promise<Review> {
    const reviews = this.getAll();
    const newReview: Review = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userName: input.userName,
      userAvatarUrl: input.userAvatarUrl,
      rating: Math.max(1, Math.min(5, input.rating)),
      body: input.body,
      createdAt: new Date(),
    };
    reviews.push(newReview);
    this.saveAll(reviews);
    return newReview;
  }

  async deleteReview(id: string): Promise<void> {
    const reviews = this.getAll().filter((r) => r.id !== id);
    this.saveAll(reviews);
  }

  async getStats(): Promise<ReviewsStats> {
    const reviews = this.getAll();
    const totalReviews = reviews.length;

    const ratingDistribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    reviews.forEach((r) => {
      ratingDistribution[r.rating]++;
    });

    const avgRating = totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }
}

type SupabaseReviewRow = {
  id: string;
  user_name: string;
  user_avatar_url: string | null;
  rating: number;
  body: string;
  created_at: string;
};

export class SupabaseReviewsService implements ReviewsServiceInterface {
  private mapRowToReview(row: SupabaseReviewRow): Review {
    return {
      id: row.id,
      userName: row.user_name,
      userAvatarUrl: row.user_avatar_url ?? "",
      rating: row.rating,
      body: row.body,
      createdAt: new Date(row.created_at),
    };
  }

  async getReviews(filter?: ReviewsFilter): Promise<Review[]> {
    if (!supabase) {
      return [];
    }

    let query = supabase
      .from("reviews")
      .select("id, user_name, user_avatar_url, rating, body, created_at");

    if (filter?.rating) {
      query = query.eq("rating", filter.rating);
    }

    if (filter?.sort === "highest") {
      query = query.order("rating", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const limit = filter?.limit ?? 6;
    const offset = filter?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => this.mapRowToReview(row as SupabaseReviewRow));
  }

  async addReview(input: AddReviewInput): Promise<Review> {
    if (!supabase) {
      throw new Error("Supabase client not initialized.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to post a review.");
    }

    const payload = {
      user_id: user.id,
      user_name: input.userName,
      user_avatar_url: input.userAvatarUrl || null,
      rating: Math.max(1, Math.min(5, input.rating)),
      body: input.body,
    };

    const { data, error } = await supabase
      .from("reviews")
      .insert(payload)
      .select("id, user_name, user_avatar_url, rating, body, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return this.mapRowToReview(data as SupabaseReviewRow);
  }

  async deleteReview(id: string): Promise<void> {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      throw new Error(error.message);
    }
  }

  async getStats(): Promise<ReviewsStats> {
    if (!supabase) {
      return {
        avgRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const { data, error } = await supabase.from("reviews").select("rating");
    if (error) {
      throw new Error(error.message);
    }

    const ratings = (data || []).map((r) => r.rating as number);
    const totalReviews = ratings.length;

    const ratingDistribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    ratings.forEach((rating) => {
      if (ratingDistribution[rating] !== undefined) {
        ratingDistribution[rating] += 1;
      }
    });

    const avgRating = totalReviews > 0
      ? ratings.reduce((sum, value) => sum + value, 0) / totalReviews
      : 0;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      ratingDistribution,
    };
  }
}

export const reviewsService: ReviewsServiceInterface = isSupabaseConfigured && supabase
  ? new SupabaseReviewsService()
  : new LocalReviewsService();
