import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();
    const type = searchParams.get("type")?.trim(); // 'media' | 'receipt'
    const id = searchParams.get("id")?.trim();

    if (!token || !type || !id || token.startsWith("lead_") || token.includes("@")) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase server client not initialized" }, { status: 500 });
    }

    // 1. Validate estimate via public token (access_token or public_token)
    const { data: est, error: estErr } = await supabaseAdmin
      .from("estimates")
      .select("id, organization_id, access_token, public_token, access_token_revoked")
      .or(`access_token.eq.${token},public_token.eq.${token}`)
      .maybeSingle();

    if (estErr || !est || est.access_token_revoked === true) {
      return NextResponse.json({ error: "Unauthorized: Invalid or revoked estimate token" }, { status: 403 });
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
        return NextResponse.json({ error: "Media record not found" }, { status: 404 });
      }

      // STRICT RULE: Reject admin-only media
      if (media.visible_to_client !== true) {
        return NextResponse.json({ error: "Forbidden: Media is not visible to client" }, { status: 403 });
      }

      // Check project isolation
      const matchesEstimate = media.estimate_id === est.id;
      const matchesJob = jobId && media.service_job_id === jobId;
      if (!matchesEstimate && !matchesJob) {
        return NextResponse.json({ error: "Forbidden: Media does not belong to this project" }, { status: 403 });
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
        return NextResponse.json({ error: "Receipt record not found" }, { status: 404 });
      }

      // STRICT RULE: Exclude company expenses
      if (receipt.material_responsibility === "company") {
        return NextResponse.json({ error: "Forbidden: Company expense receipts cannot be accessed publicly" }, { status: 403 });
      }

      const isBillableToClient = receipt.bill_to_client === true || receipt.material_responsibility === "client" || receipt.expense_category === "client_reimbursable";
      if (!isBillableToClient) {
        return NextResponse.json({ error: "Forbidden: Receipt is not marked as client material" }, { status: 403 });
      }

      const matchesEstimate = receipt.estimate_id === est.id;
      const matchesJob = jobId && receipt.service_job_id === jobId;
      if (!matchesEstimate && !matchesJob) {
        return NextResponse.json({ error: "Forbidden: Receipt does not belong to this project" }, { status: 403 });
      }

      storagePath = receipt.receipt_url;
      defaultBucket = "receipts";

    } else {
      return NextResponse.json({ error: "Invalid type parameter. Expected 'media' or 'receipt'" }, { status: 400 });
    }

    if (!storagePath) {
      return NextResponse.json({ error: "Storage path not set for this record" }, { status: 404 });
    }

    // Direct return if path is already an external URL or data URI
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://") || storagePath.startsWith("data:")) {
      return NextResponse.json({ signedUrl: storagePath }, { status: 200 });
    }

    // Determine bucket and clean path
    let targetBucket = defaultBucket;
    let cleanPath = storagePath;

    if (storagePath.startsWith("documents/")) {
      targetBucket = "documents";
      cleanPath = storagePath.replace("documents/", "");
    } else if (storagePath.startsWith("images/")) {
      targetBucket = "images";
      cleanPath = storagePath.replace("images/", "");
    } else if (storagePath.startsWith("receipts/")) {
      targetBucket = "receipts";
      cleanPath = storagePath.replace("receipts/", "");
    }

    // 4. Generate official Supabase Storage Signed URL (5 minutes / 300 seconds expiration)
    const { data: signedData, error: signErr } = await supabaseAdmin
      .storage
      .from(targetBucket)
      .createSignedUrl(cleanPath, 300);

    if (signErr || !signedData?.signedUrl) {
      // Fallback check on alternative buckets
      const fallbackBuckets = ["images", "documents", "receipts"].filter(b => b !== targetBucket);
      for (const fb of fallbackBuckets) {
        const { data: fbData } = await supabaseAdmin.storage.from(fb).createSignedUrl(cleanPath, 300);
        if (fbData?.signedUrl) {
          return NextResponse.json({ signedUrl: fbData.signedUrl }, { status: 200 });
        }
      }
      return NextResponse.json({ error: "Failed to generate signed URL from storage" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl }, { status: 200 });

  } catch (error: any) {
    console.error("API /api/public/signed-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
