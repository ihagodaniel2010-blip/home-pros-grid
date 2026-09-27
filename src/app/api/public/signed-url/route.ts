import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, private, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const type = typeof body.type === "string" ? body.type.trim() : "";
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!token || !type || !id || token.startsWith("lead_") || token.includes("@")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase server client not initialized" }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    // 1. Validate estimate via public_token exclusively
    const { data: est, error: estErr } = await supabaseAdmin
      .from("estimates")
      .select("id, organization_id, public_token")
      .eq("public_token", token)
      .maybeSingle();

    if (estErr || !est) {
      return NextResponse.json({ error: "Unauthorized: Invalid estimate token" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    // 2. Resolve job associated with this estimate within the same organization
    const { data: job } = await supabaseAdmin
      .from("service_jobs")
      .select("id")
      .eq("estimate_id", est.id)
      .eq("organization_id", est.organization_id)
      .maybeSingle();

    const jobId = job?.id || null;

    let storagePath: string | null = null;
    let defaultBucket = "images";

    if (type === "media") {
      // 3a. Validate media record ownership and client visibility
      const { data: media } = await supabaseAdmin
        .from("service_job_media")
        .select("id, storage_path, visible_to_client, organization_id, estimate_id, service_job_id")
        .eq("id", id)
        .eq("organization_id", est.organization_id)
        .maybeSingle();

      if (!media) {
        return NextResponse.json({ error: "Media record not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // STRICT RULE: Reject admin-only media
      if (media.visible_to_client !== true) {
        return NextResponse.json({ error: "Forbidden: Media is not visible to client" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      // Check project isolation
      const matchesEstimate = media.estimate_id === est.id;
      const matchesJob = jobId && media.service_job_id === jobId;
      if (!matchesEstimate && !matchesJob) {
        return NextResponse.json({ error: "Forbidden: Media does not belong to this project" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      storagePath = media.storage_path;
      defaultBucket = "images";

    } else if (type === "receipt") {
      // 3b. Validate receipt ownership and client material responsibility
      const { data: receipt } = await supabaseAdmin
        .from("receipts")
        .select("id, receipt_url, bill_to_client, material_responsibility, expense_category, status, organization_id, estimate_id, service_job_id")
        .eq("id", id)
        .eq("organization_id", est.organization_id)
        .eq("status", "active")
        .maybeSingle();

      if (!receipt) {
        return NextResponse.json({ error: "Receipt record not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // STRICT RULE: Exclude company expenses
      if (receipt.material_responsibility === "company") {
        return NextResponse.json({ error: "Forbidden: Company expense receipts cannot be accessed publicly" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      const isBillableToClient = receipt.bill_to_client === true || receipt.material_responsibility === "client" || receipt.expense_category === "client_reimbursable";
      if (!isBillableToClient) {
        return NextResponse.json({ error: "Forbidden: Receipt is not marked as client material" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      const matchesEstimate = receipt.estimate_id === est.id;
      const matchesJob = jobId && receipt.service_job_id === jobId;
      if (!matchesEstimate && !matchesJob) {
        return NextResponse.json({ error: "Forbidden: Receipt does not belong to this project" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      storagePath = receipt.receipt_url;
      defaultBucket = "receipts";

    } else {
      return NextResponse.json({ error: "Invalid type parameter. Expected 'media' or 'receipt'" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (!storagePath) {
      return NextResponse.json({ error: "Storage path not set for this record" }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Explicit Legacy File Handling:
    // If storagePath is Base64 data URI, reject direct return and mark as unavailable for admin migration.
    if (storagePath.startsWith("data:")) {
      return NextResponse.json(
        { error: "File unavailable: Legacy inline file requires admin migration to Storage", unavailable: true },
        { status: 422, headers: NO_CACHE_HEADERS }
      );
    }

    let targetBucket = defaultBucket;
    let cleanPath = storagePath;

    // If storagePath is a full Supabase URL, extract bucket and relative path
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      if (storagePath.includes("/storage/v1/object/")) {
        const urlParts = storagePath.split("/storage/v1/object/")[1]?.split("/");
        // urlParts: ['public'|'authenticated'|'sign', bucketName, ...path]
        if (urlParts && urlParts.length >= 3) {
          targetBucket = urlParts[1];
          cleanPath = urlParts.slice(2).join("/");
        } else {
          return NextResponse.json(
            { error: "File unavailable: Legacy URL path does not map to a valid Storage object", unavailable: true },
            { status: 422, headers: NO_CACHE_HEADERS }
          );
        }
      } else {
        return NextResponse.json(
          { error: "File unavailable: Legacy external URL requires admin migration to Storage", unavailable: true },
          { status: 422, headers: NO_CACHE_HEADERS }
        );
      }
    } else {
      // Relative path bucket resolution
      if (storagePath.startsWith("documents/")) {
        targetBucket = "documents";
        cleanPath = storagePath.slice(10);
      } else if (storagePath.startsWith("images/")) {
        targetBucket = "images";
        cleanPath = storagePath.slice(7);
      } else if (storagePath.startsWith("receipts/")) {
        targetBucket = "receipts";
        cleanPath = storagePath.slice(9);
      }
    }

    // 4. Generate official Supabase Storage Signed URL via SDK (5 minutes / 300 seconds expiration)
    const { data: signedData, error: signErr } = await supabaseAdmin
      .storage
      .from(targetBucket)
      .createSignedUrl(cleanPath, 300);

    if (signErr || !signedData?.signedUrl) {
      console.error("[SignedURL API Error] Failed to generate signed URL for ID:", id);
      return NextResponse.json(
        { error: "File unavailable: Object not found in storage bucket", unavailable: true },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl }, { status: 200, headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error("[SignedURL API Exception] Server processing error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST with JSON body containing token, type, and id." },
    { status: 405, headers: NO_CACHE_HEADERS }
  );
}
