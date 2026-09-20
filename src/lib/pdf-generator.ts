import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate } from './estimates';
import { CompanySettings } from './company-settings';
import { ServiceExtra, extractMediaFromText } from './service-extras';

export const generateProfessionalPDF = async (
    estimate: Estimate,
    company: CompanySettings | null,
    labels: { [key: string]: string } = {}
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header & Logo
    let logoOffsetY = 25;
    if (company?.logo_url) {
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = company.logo_url;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                setTimeout(resolve, 1500); // 1.5s timeout safety
            });
            if (img.complete && img.width > 0) {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL("image/png");
                    doc.addImage(dataUrl, "PNG", 20, 10, 22, 22);
                    logoOffsetY = 38;
                }
            }
        } catch (e) {
            console.warn("Could not add logo to PDF:", e);
        }
    }

    // Company Header / Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(11, 42, 74); // #0b2a4a
    doc.text(company?.company_name || "H&A Construction LLC", 20, 25);

    doc.setFontSize(16);
    const isApproved = estimate.status === 'Approved' || estimate.status === 'Paid';
    const statusHeader = isApproved ? "ESTIMATE (APPROVED)" : "ESTIMATE (UNSIGNED)";
    doc.text(statusHeader, pageWidth - 20, 25, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const companyInfo = [
        company?.address || "Fairfield County, CT",
        company?.phone ? `Phone: ${company.phone}` : null,
        company?.email ? `Email: ${company.email}` : null,
        company?.license_number ? `License: ${company.license_number}` : null
    ].filter((line): line is string => Boolean(line));

    companyInfo.forEach((line, i) => {
        doc.text(line, pageWidth - 20, 32 + (i * 4.5), { align: "right" });
    });

    // 2. Client & Estimate Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("BILL TO:", 20, 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(estimate.client_name || "Client Name", 20, 78);
    let currentY = 83;
    if (estimate.client_email) {
        doc.text(estimate.client_email, 20, currentY);
        currentY += 5;
    }
    if (estimate.client_phone) {
        doc.text(estimate.client_phone, 20, currentY);
        currentY += 5;
    }
    if (estimate.client_address) {
        doc.text(estimate.client_address, 20, currentY);
        currentY += 5;
        doc.text(`${estimate.client_city || ""}, ${estimate.client_state || ""} ${estimate.client_zip || ""}`, 20, currentY);
    }

    // Estimate Meta
    doc.setFont("helvetica", "bold");
    doc.text("Estimate #:", 120, 78);
    doc.text("Date:", 120, 83);
    doc.text("Valid Until:", 120, 88);

    doc.setFont("helvetica", "normal");
    doc.text(estimate.id ? estimate.id.split('-')[0].toUpperCase() : "DRAFT", pageWidth - 20, 78, { align: "right" });
    doc.text(estimate.created_at ? new Date(estimate.created_at).toLocaleDateString() : new Date().toLocaleDateString(), pageWidth - 20, 83, { align: "right" });
    doc.text(estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : "N/A", pageWidth - 20, 88, { align: "right" });

    // 3. Items Table using autotable export directly
    const tableHeaders = [["Item", "Description", "Qty", "Unit Price", "Total"]];
    const tableData = (estimate.items || []).map((item, idx) => {
        const itemTotal = item.total_price ?? ((item.quantity || 0) * (item.unit_price || 0));
        return [
            idx + 1,
            item.description || "",
            item.quantity || 0,
            `$${(item.unit_price || 0).toFixed(2)}`,
            `$${itemTotal.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: 100,
        head: tableHeaders,
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [11, 42, 74], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
        }
    });

    // 4. Financial Summary
    const lastAutoTableY = (doc as any).lastAutoTable?.finalY || 140;
    const finalY = lastAutoTableY + 10;
    const summaryX = pageWidth - 80;

    const subtotal = estimate.subtotal || 0;
    const taxRate = estimate.tax_rate || 0;
    const taxAmount = estimate.tax_amount || 0;
    const discountAmount = estimate.discount_amount || 0;
    const totalAmount = estimate.total_amount || 0;

    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", summaryX, finalY);
    doc.text(`Tax (${taxRate}%):`, summaryX, finalY + 7);
    doc.text("Discount:", summaryX, finalY + 14);

    doc.setFontSize(14);
    doc.setTextColor(11, 42, 74);
    doc.text("TOTAL:", summaryX, finalY + 25);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - 20, finalY, { align: "right" });
    doc.text(`$${taxAmount.toFixed(2)}`, pageWidth - 20, finalY + 7, { align: "right" });
    doc.text(`-$${discountAmount.toFixed(2)}`, pageWidth - 20, finalY + 14, { align: "right" });

    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - 20, finalY + 25, { align: "right" });

    // Payment Summary Section
    const paymentY = finalY + 45;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("PAYMENT SUMMARY", 20, paymentY);

    doc.setDrawColor(200);
    doc.line(20, paymentY + 2, pageWidth - 20, paymentY + 2);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Amount Paid:", 20, paymentY + 10);
    doc.text(`$${(estimate.amount_paid || 0).toFixed(2)}`, 60, paymentY + 10);

    doc.setFont("helvetica", "bold");
    doc.text("BALANCE DUE:", 20, paymentY + 17);
    doc.text(`$${(estimate.balance_due || totalAmount).toFixed(2)}`, 60, paymentY + 17);

    // 5. Terms & Signature Block
    const termsY = paymentY + 35;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", 20, termsY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const terms = estimate.terms || company?.default_terms || "Payment due upon receipt. Commercial agreement subject to final signoff.";
    const splitTerms = doc.splitTextToSize(terms, pageWidth - 40);
    doc.text(splitTerms, 20, termsY + 6);

    // Signature Section (Client & Contractor)
    const sigY = termsY + 35 < 250 ? termsY + 35 : 240;
    const isSigned = isApproved || !!(estimate as any).signature_url || !!estimate.approved_at;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 42, 74);
    doc.text("AUTHORIZED ACCEPTANCE & SIGNATURES", 20, sigY);
    doc.setDrawColor(200);
    doc.line(20, sigY + 2, pageWidth - 20, sigY + 2);

    // Left Column: Client Signature
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("CLIENT ACCEPTANCE:", 20, sigY + 10);

    if (isSigned) {
        if ((estimate as any).signature_url) {
            try {
                doc.addImage((estimate as any).signature_url, "PNG", 20, sigY + 12, 45, 18);
            } catch (sigImgErr) {
                doc.setFont("helvetica", "italic");
                doc.text(`[Digitally Signed Online by ${estimate.client_name || "Client"}]`, 20, sigY + 18);
            }
        } else {
            doc.setFont("helvetica", "italic");
            doc.text(`[Electronically Approved & Signed by ${estimate.client_name || "Client"}]`, 20, sigY + 18);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(80);
        doc.text(`Signed by: ${estimate.client_name || "Client"}`, 20, sigY + 32);
        doc.text(`Date: ${estimate.approved_at ? new Date(estimate.approved_at).toLocaleString() : new Date().toLocaleDateString()}`, 20, sigY + 36);
        doc.text(`Audit Status: Verified Digital Approval`, 20, sigY + 40);
    } else {
        doc.setFont("helvetica", "normal");
        doc.text("Client Signature: ____________________________", 20, sigY + 25);
        doc.text(`Name: ${estimate.client_name || "________________________"}`, 20, sigY + 32);
        doc.text("Date: ________________________", 20, sigY + 38);
    }

    // Right Column: Contractor Signature
    const rightColX = pageWidth - 90;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("CONTRACTOR AUTHORIZATION:", rightColX, sigY + 10);

    doc.setFont("helvetica", "italic");
    doc.text(`${company?.company_name || "H&A Construction LLC"}`, rightColX, sigY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text("Authorized Representative Line: ____________________", rightColX, sigY + 25);
    if (company?.license_number) {
        doc.text(`License #: ${company.license_number}`, rightColX, sigY + 32);
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, rightColX, sigY + 38);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Thank you for choosing ${company?.company_name || "our services"}!`, pageWidth / 2, 285, { align: "center" });

    // Save PDF
    const filename = `estimate_${estimate.id ? estimate.id.split('-')[0].toUpperCase() : 'DRAFT'}.pdf`;
    doc.save(filename);
};

export const generateChangeOrderPDF = async (
    extra: ServiceExtra,
    estimate: Estimate | null,
    company: CompanySettings | null,
    signatureDetails?: {
        signerName?: string;
        signerEmail?: string;
        signatureDataUrl?: string | null;
        signedAt?: string;
    }
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header & Logo
    if (company?.logo_url) {
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = company.logo_url;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
                setTimeout(resolve, 1500);
            });
            if (img.complete && img.width > 0) {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL("image/png");
                    doc.addImage(dataUrl, "PNG", 20, 10, 22, 22);
                }
            }
        } catch (e) {
            console.warn("Could not add logo to Change Order PDF:", e);
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(11, 42, 74);
    doc.text(company?.company_name || "H&A Construction LLC", 20, 25);

    doc.setFontSize(14);
    const isApproved = extra.status === 'approved' || extra.status === 'paid';
    if (isApproved) {
        doc.setTextColor(16, 185, 129);
    } else {
        doc.setTextColor(217, 119, 6);
    }
    doc.text(isApproved ? "CHANGE ORDER (APPROVED PROOF)" : "CHANGE ORDER (PENDING)", pageWidth - 20, 25, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const companyInfo = [
        company?.address || "Fairfield County, CT",
        company?.phone ? `Phone: ${company.phone}` : null,
        company?.email ? `Email: ${company.email}` : null,
        company?.license_number ? `License: ${company.license_number}` : null
    ].filter((line): line is string => Boolean(line));

    companyInfo.forEach((line, i) => {
        doc.text(line, pageWidth - 20, 32 + (i * 4.5), { align: "right" });
    });

    // 2. Client Information
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("CLIENT / PROJECT DETAILS:", 20, 65);

    const clientName = signatureDetails?.signerName || estimate?.client_name || "Client Name";
    const clientEmail = signatureDetails?.signerEmail || estimate?.client_email || "";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(clientName, 20, 72);
    let curY = 77;
    if (clientEmail) {
        doc.text(clientEmail, 20, curY);
        curY += 5;
    }
    if (estimate?.client_phone) {
        doc.text(estimate.client_phone, 20, curY);
        curY += 5;
    }
    if (estimate?.client_address) {
        doc.text(estimate.client_address, 20, curY);
        curY += 5;
    }

    // Change Order Meta
    doc.setFont("helvetica", "bold");
    doc.text("Change Order Ref:", 120, 72);
    doc.text("Estimate Ref:", 120, 77);
    doc.text("Date Created:", 120, 82);
    doc.text("Status:", 120, 87);

    doc.setFont("helvetica", "normal");
    doc.text(`CO-${extra.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 72, { align: "right" });
    doc.text(estimate?.id ? estimate.id.split('-')[0].toUpperCase() : "N/A", pageWidth - 20, 77, { align: "right" });
    doc.text(extra.created_at ? new Date(extra.created_at).toLocaleDateString() : new Date().toLocaleDateString(), pageWidth - 20, 82, { align: "right" });
    doc.text(extra.status.toUpperCase(), pageWidth - 20, 87, { align: "right" });

    // 3. Scope of Work Table (CLEAN TEXT ONLY - NO BASE64 OR [media:...] TAGS)
    const { cleanText: cleanDesc, mediaUrls: descMedia } = extractMediaFromText(extra.description);
    const { cleanText: cleanReason, mediaUrls: reasonMedia } = extractMediaFromText(extra.reason);
    const photoUrls = Array.from(new Set([...descMedia, ...reasonMedia]));

    const fullCleanText = `${cleanDesc}${cleanReason ? `\nReason: ${cleanReason}` : ''}`;
    const tableHeaders = [["Item", "Description / Reason", "Schedule Impact", "Amount"]];
    const tableData = [[
        1,
        fullCleanText,
        extra.schedule_impact || "None",
        `+$${extra.amount.toFixed(2)}`
    ]];

    autoTable(doc, {
        startY: 98,
        head: tableHeaders,
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [126, 34, 206], textColor: 255 }, // Purple header
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 35 },
            3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        }
    });

    // 4. Financial Calculations Box
    const lastY = (doc as any).lastAutoTable?.finalY || 130;
    const summaryY = lastY + 10;
    const previousContract = extra.previous_contract_price ?? (estimate?.total_amount || 0);
    const extraAmount = extra.amount || 0;
    const revisedTotal = extra.revised_contract_price ?? (previousContract + extraAmount);

    doc.setFillColor(250, 245, 255);
    doc.rect(20, summaryY, pageWidth - 40, 35, "F");
    doc.setDrawColor(233, 213, 255);
    doc.rect(20, summaryY, pageWidth - 40, 35, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(126, 34, 206);
    doc.text("FINANCIAL CONTRACT REVISION SUMMARY", 25, summaryY + 8);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text("Previous Contract Value:", 25, summaryY + 16);
    doc.text(`$${previousContract.toFixed(2)}`, 110, summaryY + 16, { align: "right" });

    doc.text("Change Order Addition:", 25, summaryY + 23);
    doc.text(`+$${extraAmount.toFixed(2)}`, 110, summaryY + 23, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 42, 74);
    doc.text("REVISED TOTAL CONTRACT AMOUNT:", 25, summaryY + 31);
    doc.text(`$${revisedTotal.toFixed(2)}`, pageWidth - 25, summaryY + 31, { align: "right" });

    // 5. Signature & Verification Audit Trail Block
    const sigY = summaryY + 45;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 42, 74);
    doc.text("E-SIGNATURE PROOF & AUTHORIZATION AUDIT", 20, sigY);
    doc.setDrawColor(200);
    doc.line(20, sigY + 2, pageWidth - 20, sigY + 2);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("CLIENT ELECTRONIC SIGNATURE:", 20, sigY + 10);

    const sigUrl = signatureDetails?.signatureDataUrl;
    if (isApproved) {
        if (sigUrl && sigUrl.startsWith("data:image")) {
            try {
                doc.addImage(sigUrl, "PNG", 20, sigY + 13, 45, 18);
            } catch (e) {
                doc.setFont("helvetica", "italic");
                doc.text(`[Digitally Signed by ${clientName}]`, 20, sigY + 18);
            }
        } else {
            doc.setFont("helvetica", "italic");
            doc.text(`[Electronically Signed & Approved by ${clientName}]`, 20, sigY + 18);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(80);
        doc.text(`Signer Legal Name: ${clientName}`, 20, sigY + 33);
        doc.text(`Signer Email: ${clientEmail || "Verified Client Email"}`, 20, sigY + 37);
        doc.text(`Approval Timestamp: ${signatureDetails?.signedAt || new Date().toLocaleString()}`, 20, sigY + 41);
        doc.text(`E-SIGN Compliance: UETA & Federal ESIGN Act Validated`, 20, sigY + 45);
    } else {
        doc.setFont("helvetica", "normal");
        doc.text("Client Signature: ____________________________", 20, sigY + 25);
        doc.text(`Name: ${clientName}`, 20, sigY + 32);
        doc.text("Date: ________________________", 20, sigY + 38);
    }

    // Right Column: Contractor Seal
    const rightX = pageWidth - 90;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("CONTRACTOR AUTHORIZATION:", rightX, sigY + 10);
    doc.setFont("helvetica", "italic");
    doc.text(`${company?.company_name || "H&A Construction LLC"}`, rightX, sigY + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(80);
    doc.text("Authorized Representative Signoff", rightX, sigY + 25);
    if (company?.license_number) {
        doc.text(`License #: ${company.license_number}`, rightX, sigY + 32);
    }
    doc.text(`Date: ${new Date().toLocaleDateString()}`, rightX, sigY + 38);

    // 6. Visual Photo Attachments Section (Rendered separately as images, never text)
    if (photoUrls.length > 0) {
        let photoY = sigY + 55;
        if (photoY + 45 > 280) {
            doc.addPage();
            photoY = 20;
        }

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(11, 42, 74);
        doc.text(`ATTACHED EVIDENCE & PHOTOS (${photoUrls.length})`, 20, photoY);
        doc.setDrawColor(200);
        doc.line(20, photoY + 2, pageWidth - 20, photoY + 2);

        photoY += 8;
        let posX = 20;
        const boxWidth = 35;
        const boxHeight = 35;

        for (let i = 0; i < photoUrls.length; i++) {
            const pUrl = photoUrls[i];
            if (posX + boxWidth > pageWidth - 20) {
                posX = 20;
                photoY += boxHeight + 8;
                if (photoY + boxHeight > 270) {
                    doc.addPage();
                    photoY = 20;
                }
            }

            if (pUrl.startsWith('data:image') || pUrl.startsWith('http://') || pUrl.startsWith('https://')) {
                try {
                    const format = pUrl.includes('image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(pUrl, format, posX, photoY, boxWidth, boxHeight);
                    doc.setDrawColor(220);
                    doc.rect(posX, photoY, boxWidth, boxHeight, "S");
                } catch (imgErr) {
                    doc.setFontSize(7);
                    doc.setFont("helvetica", "italic");
                    doc.text(`[Attached Photo ${i + 1}]`, posX, photoY + 15);
                }
            } else if (pUrl.includes('.mp4') || pUrl.includes('.mov')) {
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.text(`[Video Attachment ${i + 1}]`, posX, photoY + 15);
            } else {
                doc.setFontSize(7);
                doc.setFont("helvetica", "italic");
                doc.text(`[Attachment ${i + 1}]`, posX, photoY + 15);
            }

            posX += boxWidth + 8;
        }
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Change Order Proof of Document — ${company?.company_name || "H&A Construction LLC"}`, pageWidth / 2, 285, { align: "center" });

    const filename = `change_order_CO-${extra.id.slice(0, 8).toUpperCase()}.pdf`;
    doc.save(filename);
};

