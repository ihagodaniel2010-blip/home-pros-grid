import "server-only";

export interface GoogleReviewItem {
  authorName: string;
  authorPhotoUri?: string;
  authorUri?: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
  publishTime?: string;
}

export interface GooglePlacesReviewsResult {
  configured: boolean;
  businessName?: string;
  rating: number | null;
  userRatingCount: number | null;
  reviews: GoogleReviewItem[];
  googleMapsUri?: string;
}

export async function fetchGooglePlacesReviews(): Promise<GooglePlacesReviewsResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();

  // Safe fallback if environment variables are missing
  if (!apiKey || !placeId) {
    return {
      configured: false,
      rating: null,
      userRatingCount: null,
      reviews: []
    };
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,googleMapsUri",
        "Accept": "application/json"
      },
      next: { revalidate: 86400 } // 24-hour Vercel-compatible Next.js cache
    });

    if (!response.ok) {
      console.error(`Google Places API returned status ${response.status}`);
      return {
        configured: false,
        rating: null,
        userRatingCount: null,
        reviews: []
      };
    }

    const data = await response.json();

    const mappedReviews: GoogleReviewItem[] = Array.isArray(data.reviews)
      ? data.reviews.slice(0, 5).map((rev: any) => ({
          authorName: rev.authorAttribution?.displayName || "Google Customer",
          authorPhotoUri: rev.authorAttribution?.photoUri || undefined,
          authorUri: rev.authorAttribution?.uri || undefined,
          rating: typeof rev.rating === "number" ? rev.rating : 5,
          text: rev.text?.text || "",
          relativePublishTimeDescription: rev.relativePublishTimeDescription || "",
          publishTime: rev.publishTime || undefined
        }))
      : [];

    return {
      configured: true,
      businessName: data.displayName?.text || "H & A Construction LLC",
      rating: typeof data.rating === "number" ? Math.round(data.rating * 10) / 10 : null,
      userRatingCount: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      reviews: mappedReviews,
      googleMapsUri: data.googleMapsUri || undefined
    };
  } catch (err) {
    console.error("Failed to fetch Google Places reviews safely:", err instanceof Error ? err.message : "Unknown error");
    return {
      configured: false,
      rating: null,
      userRatingCount: null,
      reviews: []
    };
  }
}
