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
    let estId: string | null = null;
    let orgId: string | null = null;
    let jobId: string | null = null;

    // First attempt: Direct query via supabaseAdmin
    const { data: est, error: estErr } = await supabaseAdmin
      .from("estimates")
      .select("id, organization_id, public_token")
      .eq("public_token", token)
      .maybeSingle();

    if (est && !estErr) {
      estId = est.id;
      orgId = est.organization_id;
    } else {
      // Fallback if RLS blocks direct SELECT (e.g. if SUPABASE_SERVICE_ROLE_KEY is not configured in environment)
      // SECURITY DEFINER RPCs can validate public_token securely
      const { data: rpcExtras } = await supabaseAdmin.rpc("get_public_estimate_extras", { p_token: token });
      if (Array.isArray(rpcExtras) && rpcExtras.length > 0) {
        estId = rpcExtras[0].estimate_id;
        orgId = rpcExtras[0].organization_id;
        jobId = rpcExtras[0].service_job_id || null;
      } else {
        const { data: rpcMats } = await supabaseAdmin.rpc("get_public_client_materials", { p_token: token });
        if (Array.isArray(rpcMats) && rpcMats.length > 0) {
          estId = rpcMats[0].estimate_id;
          orgId = rpcMats[0].organization_id;
          jobId = rpcMats[0].service_job_id || null;
        } else {
          const { data: rpcPay } = await supabaseAdmin.rpc("get_public_client_payments", { p_token: token });
          if (Array.isArray(rpcPay) && rpcPay.length > 0) {
            estId = rpcPay[0].estimate_id;
            orgId = rpcPay[0].organization_id;
            jobId = rpcPay[0].service_job_id || null;
          }
        }
      }
    }

    if (!estId || !orgId) {
      return NextResponse.json({ error: "Unauthorized: Invalid estimate token" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    // Resolve job associated with this estimate if not resolved yet
    if (!jobId) {
      const { data: job } = await supabaseAdmin
        .from("service_jobs")
        .select("id")
        .eq("estimate_id", estId)
        .eq("organization_id", orgId)
        .maybeSingle();
      jobId = job?.id || null;
    }

    let storagePath: string | null = null;
    let defaultBucket = "images";

    if (type === "media") {
      // 3a. Validate media record ownership and client visibility
      let media: any = null;
      const { data: directMedia } = await supabaseAdmin
        .from("service_job_media")
        .select("id, storage_path, visible_to_client, organization_id, service_job_id")
        .eq("id", id)
        .eq("organization_id", orgId)
        .maybeSingle();

      media = directMedia;

      // Fallback via RPC if RLS blocks direct query
      if (!media) {
        const { data: rpcMedia } = await supabaseAdmin.rpc("get_public_job_media", { p_token: token });
        if (Array.isArray(rpcMedia)) {
          media = rpcMedia.find((m: any) => m.id === id);
        }
      }

      if (!media) {
        return NextResponse.json({ error: "Media record not found" }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      // STRICT RULE: Reject admin-only media
      if (media.visible_to_client !== true) {
        return NextResponse.json({ error: "Forbidden: Media is not visible to client" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      // Check project isolation
      const matchesJob = jobId && media.service_job_id === jobId;
      const matchesOrg = media.organization_id === orgId;
      if (!matchesJob && !matchesOrg) {
        return NextResponse.json({ error: "Forbidden: Media does not belong to this project" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      storagePath = media.storage_path;
      defaultBucket = "images";

    } else if (type === "receipt") {
      // 3b. Validate receipt ownership and client material responsibility
      let receipt: any = null;
      const { data: directReceipt } = await supabaseAdmin
        .from("receipts")
        .select("id, receipt_url, receipt_storage_path, storage_path, bill_to_client, material_responsibility, expense_category, status, organization_id, estimate_id, service_job_id, receipt_files(storage_path, storage_bucket)")
        .eq("id", id)
        .eq("organization_id", orgId)
        .eq("status", "active")
        .maybeSingle();

      receipt = directReceipt;

      // Fallback via RPC if RLS blocks direct query
      if (!receipt) {
        const { data: rpcMats } = await supabaseAdmin.rpc("get_public_client_materials", { p_token: token });
        if (Array.isArray(rpcMats)) {
          const rItem = rpcMats.find((r: any) => r.id === id);
          if (rItem) {
            receipt = {
              ...rItem,
              bill_to_client: true,
              material_responsibility: 'client'
            };
          }
        }
      }

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

      const matchesEstimate = receipt.estimate_id === estId;
      const matchesJob = jobId && receipt.service_job_id === jobId;
      const matchesOrg = receipt.organization_id === orgId;
      if (!matchesEstimate && !matchesJob && !matchesOrg) {
        return NextResponse.json({ error: "Forbidden: Receipt does not belong to this project" }, { status: 403, headers: NO_CACHE_HEADERS });
      }

      let fileBucket = "receipts";
      let rawPath = receipt.receipt_url || receipt.receipt_storage_path || receipt.storage_path || null;

      if (!rawPath && receipt.receipt_files && receipt.receipt_files.length > 0) {
        const rf = receipt.receipt_files[0];
        rawPath = rf.storage_path;
        if (rf.storage_bucket) fileBucket = rf.storage_bucket;
      }

      // If still no rawPath, query receipt_files directly by receipt_id
      if (!rawPath) {
        const { data: rfList } = await supabaseAdmin
          .from("receipt_files")
          .select("storage_path, storage_bucket")
          .eq("receipt_id", id)
          .limit(1);
        if (rfList && rfList.length > 0) {
          rawPath = rfList[0].storage_path;
          if (rfList[0].storage_bucket) fileBucket = rfList[0].storage_bucket;
        }
      }

      if (!rawPath) {
        return NextResponse.json({ error: "No receipt file attached to this record", noFile: true }, { status: 404, headers: NO_CACHE_HEADERS });
      }

      storagePath = rawPath;
      defaultBucket = fileBucket;

    } else {
      return NextResponse.json({ error: "Invalid type parameter. Expected 'media' or 'receipt'" }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (!storagePath) {
      return NextResponse.json({ error: "Storage path not set for this record", noFile: true }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Explicit Legacy File Handling:
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
      // Try fallback bucket 'images' or 'documents' if default bucket failed
      if (targetBucket !== "images") {
        const { data: fbData } = await supabaseAdmin.storage.from("images").createSignedUrl(cleanPath, 300);
        if (fbData?.signedUrl) {
          return NextResponse.json({ signedUrl: fbData.signedUrl }, { status: 200, headers: NO_CACHE_HEADERS });
        }
      }
      if (targetBucket !== "documents") {
        const { data: fbData } = await supabaseAdmin.storage.from("documents").createSignedUrl(cleanPath, 300);
        if (fbData?.signedUrl) {
          return NextResponse.json({ signedUrl: fbData.signedUrl }, { status: 200, headers: NO_CACHE_HEADERS });
        }
      }

      console.error("[SignedURL API Error] Failed to generate signed URL for ID:", id, signErr?.message);
      return NextResponse.json(
        { error: "File unavailable: Object not found in storage bucket", unavailable: true },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ signedUrl: signedData.signedUrl }, { status: 200, headers: NO_CACHE_HEADERS });

  } catch (error: any) {
    console.error("[SignedURL API Exception] Server processing error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed. Use POST with JSON body containing token, type, and id." },
    { status: 405, headers: NO_CACHE_HEADERS }
  );
}
