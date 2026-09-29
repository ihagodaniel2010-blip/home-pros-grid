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
      return NextResponse.json(
        { 
          error: "SUPABASE_SERVICE_ROLE_KEY is missing in production environment variables. Please add SUPABASE_SERVICE_ROLE_KEY in Vercel Project Settings.", 
          serviceRoleMissing: true 
        }, 
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 0. Handle Institutional Public Portfolio Showcase query (No estimate token required)
    if (type === "portfolio") {
      const clientToUse = supabaseAdmin || null;
      if (!clientToUse) {
        return NextResponse.json({ error: "Supabase service role unavailable" }, { status: 500, headers: NO_CACHE_HEADERS });
      }

      let mediaList: any[] = [];
      const { data: dbList, error: mErr } = await clientToUse
        .from("service_job_media")
        .select("id, organization_id, service_job_id, media_type, storage_path, file_name, mime_type, caption, visible_on_public_site, portfolio_approved, created_at")
        .or("visible_on_public_site.eq.true,portfolio_approved.eq.true")
        .order("created_at", { ascending: false });

      if (!mErr && dbList && dbList.length > 0) {
        mediaList = dbList;
      } else {
        const { data: rpcMedia, error: rpcErr } = await clientToUse.rpc("get_public_portfolio_media");
        if (!rpcErr && Array.isArray(rpcMedia) && rpcMedia.length > 0) {
          mediaList = rpcMedia;
        }
      }

      // Collect job titles without complex PostgREST joins
      const jobIds = Array.from(new Set(mediaList.map((m: any) => m.service_job_id).filter(Boolean)));
      const jobTitleMap: Record<string, string> = {};

      if (jobIds.length > 0) {
        try {
          const { data: jobs } = await clientToUse
            .from("service_jobs")
            .select("id, title, project_type")
            .in("id", jobIds);

          if (jobs) {
            jobs.forEach((j: any) => {
              jobTitleMap[j.id] = j.title || j.project_type || "";
            });
          }
        } catch (e) {}
      }

      const itemsWithUrls = await Promise.all(
        mediaList.map(async (m: any) => {
          let signedUrl: string | null = null;
          let storagePath = m.storage_path;
          const jobTitle = jobTitleMap[m.service_job_id] || m.job_title || "";

          if (storagePath) {
            if (storagePath.startsWith("data:")) {
              signedUrl = storagePath;
            } else {
              let targetBucket = "images";
              let cleanPath = storagePath.split('?')[0];
              cleanPath = decodeURIComponent(cleanPath);

              if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
                if (cleanPath.includes("/storage/v1/object/")) {
                  const urlParts = cleanPath.split("/storage/v1/object/")[1]?.split("/");
                  if (urlParts && urlParts.length >= 3) {
                    targetBucket = urlParts[1];
                    cleanPath = urlParts.slice(2).join("/");
                  } else if (urlParts && urlParts.length >= 2) {
                    targetBucket = urlParts[0];
                    cleanPath = urlParts.slice(1).join("/");
                  }
                } else {
                  signedUrl = storagePath;
                }
              } else {
                if (cleanPath.startsWith("documents/")) {
                  targetBucket = "documents";
                  cleanPath = cleanPath.slice(10);
                } else if (cleanPath.startsWith("images/")) {
                  targetBucket = "images";
                  cleanPath = cleanPath.slice(7);
                } else if (cleanPath.startsWith("job-media/")) {
                  targetBucket = "job-media";
                  cleanPath = cleanPath.slice(10);
                } else if (cleanPath.startsWith("receipts/")) {
                  targetBucket = "receipts";
                  cleanPath = cleanPath.slice(9);
                }
              }

              if (!signedUrl) {
                const { data: signedData } = await clientToUse.storage
                  .from(targetBucket)
                  .createSignedUrl(cleanPath, 3600);

                if (signedData?.signedUrl) {
                  signedUrl = signedData.signedUrl;
                } else {
                  const bucketsToTry = ["images", "documents", "job-media", "receipts"].filter(b => b !== targetBucket);
                  for (const b of bucketsToTry) {
                    const { data: fbData } = await clientToUse.storage.from(b).createSignedUrl(cleanPath, 3600);
                    if (fbData?.signedUrl) {
                      signedUrl = fbData.signedUrl;
                      break;
                    }
                  }
                }

                if (!signedUrl) {
                  try {
                    const { data: pubData } = clientToUse.storage.from(targetBucket).getPublicUrl(cleanPath);
                    if (pubData?.publicUrl) signedUrl = pubData.publicUrl;
                  } catch {}
                  if (!signedUrl && storagePath.startsWith("http")) {
                    signedUrl = storagePath;
                  }
                }
              }
            }
          }

          // Category classification: check database media_category_relations first
          let category = "";
          let dbCategories: string[] = [];
          try {
            const { data: catRels } = await clientToUse
              .from("media_category_relations")
              .select("category_id, website_categories(name)")
              .eq("media_id", m.id);

            if (catRels && catRels.length > 0) {
              dbCategories = catRels
                .map((r: any) => r.website_categories?.name)
                .filter(Boolean);
              if (dbCategories.length > 0) {
                category = dbCategories[0];
              }
            }
          } catch (e) {}

          if (dbCategories.length === 0 || !category) {
            const text = `${m.caption || ''} ${m.file_name || ''} ${jobTitle || ''}`.toLowerCase();
            if (/bath|banheiro|shower|tub|vanity|toilet|duche/i.test(text)) category = "Bathrooms";
            else if (/kitchen|cozinha|cabinet|countertop|armario|bancada/i.test(text)) category = "Kitchens";
            else if (/framing|estrutura|madeira|joist|beam|stud|barrote/i.test(text)) category = "Framing";
            else if (/roof|telhado|calha|gutter|shingle|fascia|soffit/i.test(text)) category = "Roofing";
            else if (/drywall|gesso|sheetrock|wall|parede|teto/i.test(text)) category = "Drywall";
            else if (/siding|revestimento|facade|exterior|cladding/i.test(text)) category = "Siding";
            else if (/deck|porch|patio|varanda|decking|rail/i.test(text)) category = "Decks";
            else if (/tile|flooring|piso|chao|vinyl|hardwood|parquet/i.test(text)) category = "Flooring";
            else category = "Remodeling";
          }

          return {
            id: m.id,
            media_type: m.media_type || "image",
            file_name: m.file_name,
            caption: m.caption,
            signedUrl: signedUrl || "",
            category,
            categories: dbCategories,
            created_at: m.created_at
          };
        })
      );

      const validPortfolio = itemsWithUrls.filter(item => item.signedUrl && item.signedUrl.length > 0);
      return NextResponse.json({ portfolio: validPortfolio }, { status: 200, headers: NO_CACHE_HEADERS });
    }

    // 1. Validate estimate via public_token exclusively
    let estId: string | null = null;
    let orgId: string | null = null;
    let jobId: string | null = null;

    // 1. Validate estimate via public_token exclusively
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

    if (type === "list_media") {
      if (!jobId) {
        return NextResponse.json({ media: [] }, { status: 200, headers: NO_CACHE_HEADERS });
      }
      const { data: mediaList, error: mErr } = await supabaseAdmin
        .from("service_job_media")
        .select("id, organization_id, service_job_id, media_type, storage_path, file_name, mime_type, file_size_bytes, caption, visible_to_client, created_at")
        .eq("organization_id", orgId)
        .eq("service_job_id", jobId)
        .eq("visible_to_client", true)
        .order("created_at", { ascending: false });

      if (mErr) {
        console.error("[SignedURL API Error] list_media query error:", mErr.message);
        return NextResponse.json({ media: [] }, { status: 200, headers: NO_CACHE_HEADERS });
      }

      return NextResponse.json({ media: mediaList || [] }, { status: 200, headers: NO_CACHE_HEADERS });
    }

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
        .select("id, bill_to_client, material_responsibility, expense_category, status, organization_id, estimate_id, service_job_id, receipt_files(storage_path, storage_bucket)")
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

    // Explicit Legacy / Fallback Data URI File Handling:
    if (storagePath.startsWith("data:")) {
      return NextResponse.json({ signedUrl: storagePath }, { status: 200, headers: NO_CACHE_HEADERS });
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
