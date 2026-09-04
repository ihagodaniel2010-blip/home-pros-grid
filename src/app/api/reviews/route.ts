import { NextResponse } from "next/server";
import { fetchGooglePlacesReviews } from "@/lib/server/googlePlacesService";

export const revalidate = 86400; // 24 hours revalidation

export async function GET() {
  try {
    const data = await fetchGooglePlacesReviews();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200"
      }
    });
  } catch (error) {
    // Safe error handling without revealing keys or internal trace
    return NextResponse.json(
      {
        configured: false,
        rating: null,
        userRatingCount: null,
        reviews: []
      },
      { status: 200 }
    );
  }
}
