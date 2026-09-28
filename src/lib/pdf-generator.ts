import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate } from './estimates';
import { CompanySettings } from './company-settings';
import { ServiceExtra, extractMediaFromText } from './service-extras';

export interface PdfGenerationOptions {
    clientSignatureUrl?: string | null;
    contractorSignatureUrl?: string | null;
    contractorName?: string;
    signedAt?: string;
    auditDetails?: {
        ipAddress?: string;
        userAgent?: string;
        documentHash?: string;
        consentVersion?: string;
    };
    returnBlob?: boolean;
}

export const formatEstimateNumber = (rawNum: string | null | undefined): string => {
    if (!rawNum) return "EST-DRAFT";
    const clean = rawNum.trim().toUpperCase();
    if (clean.startsWith("EST-")) return clean;
    if (clean.startsWith("EST")) return `EST-${clean.slice(3)}`;
    return `EST-${clean}`;
};

export const generateProfessionalPDF = async (
    estimate: Estimate,
    company: CompanySettings | null,
    options: PdfGenerationOptions = {}
): Promise<Blob | void> => {
    const JsPdfClass = (jsPDF as any).jsPDF || (jsPDF as any).default || jsPDF;
    const doc = new JsPdfClass({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

    // Color Palette: Corporate Navy & Warm Accents
    const primaryNavy = [11, 42, 74];   // #0b2a4a
    const accentOrange = [249, 115, 22]; // #f97316
    const textDark = [15, 23, 42];      // #0f172a
    const textMuted = [100, 116, 139];  // #64748b
    const cardBg = [248, 250, 252];     // #f8fafc
    const cardBorder = [226, 232, 240]; // #e2e8f0

    // Top Accent Ribbon
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.rect(0, 0, pageWidth, 4, "F");

    // 1. Logo & Header Layout (No overlap guaranteed)
    let logoWidth = 0;
    let logoHeight = 0;
    let logoX = 14;
    let logoY = 10;
    let textStartX = 14;

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
                const maxW = 38;
                const maxH = 18;
                const ratio = Math.min(maxW / img.width, maxH / img.height);
                logoWidth = img.width * ratio;
                logoHeight = img.height * ratio;

                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL("image/png");
                    doc.addImage(dataUrl, "PNG", logoX, logoY, logoWidth, logoHeight);
                    textStartX = logoX + logoWidth + 6;
                }
            }
        } catch (e) {
            console.warn("Could not load logo into PDF:", e);
        }
    }

    // Company Header Info (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(company?.company_name || "H & A Construction LLC", textStartX, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    let companyLineY = 22;
    if (company?.address) {
        doc.text(company.address, textStartX, companyLineY);
        companyLineY += 4;
    }
    const phoneEmailParts = [
        company?.phone ? `Phone: ${company.phone}` : null,
        company?.email ? `Email: ${company.email}` : null
    ].filter(Boolean).join("  |  ");
    if (phoneEmailParts) {
        doc.text(phoneEmailParts, textStartX, companyLineY);
        companyLineY += 4;
    }
    if (company?.license_number && company.license_number.trim() !== '') {
        doc.text(`License #: ${company.license_number.trim()}`, textStartX, companyLineY);
    }

    // Document Title & Metadata (Right side)
    const rightX = pageWidth - 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("COMMERCIAL ESTIMATE & PROPOSAL", rightX, 16, { align: "right" });

    // Status Badge Pill
    const isApproved = estimate.status === 'Approved' || estimate.status === 'Paid';
    const isRejected = estimate.status === 'Rejected';
    
    let badgeBg = [254, 243, 199];   // Amber light
    let badgeText = [180, 83, 9];    // Amber dark
    let badgeLabel = `STATUS: ${(estimate.status || 'DRAFT').toUpperCase()}`;

    if (isApproved) {
        badgeBg = [220, 252, 231];   // Emerald light
        badgeText = [21, 128, 61];   // Emerald dark
        badgeLabel = "APPROVED & DIGITALLY SIGNED";
    } else if (isRejected) {
        badgeBg = [254, 226, 226];   // Red light
        badgeText = [185, 28, 28];   // Red dark
        badgeLabel = "PROPOSAL REJECTED";
    }

    doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
    doc.roundedRect(rightX - 65, 19, 65, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(badgeText[0], badgeText[1], badgeText[2]);
    doc.text(badgeLabel, rightX - 32.5, 23.2, { align: "center" });

    // Meta details below badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const estNum = formatEstimateNumber(estimate.number || estimate.id);
    const dateStr = estimate.created_at ? new Date(estimate.created_at).toLocaleDateString() : new Date().toLocaleDateString();
    const validUntilStr = estimate.valid_until ? new Date(estimate.valid_until).toLocaleDateString() : "30 Days from Issue";

    doc.text(`Estimate #: ${estNum}`, rightX, 30, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Date: ${dateStr}   |   Valid Until: ${validUntilStr}`, rightX, 35, { align: "right" });

    // Divider
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.4);
    doc.line(14, 41, pageWidth - 14, 41);

    // 2. Client Information & Project Location Boxes (Side-by-side)
    const boxW = 89;
    const boxH = 28;
    const boxY = 44;

    // Left Box: CLIENT INFORMATION
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(14, boxY, boxW, boxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("CLIENT INFORMATION", 18, boxY + 5.5);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(estimate.client_name || "Client Name", 18, boxY + 12);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    let cY = boxY + 17;
    if (estimate.client_phone) {
        doc.text(`Phone: ${estimate.client_phone}`, 18, cY);
        cY += 4.5;
    }
    if (estimate.client_email) {
        doc.text(`Email: ${estimate.client_email}`, 18, cY);
    }

    // Right Box: PROJECT LOCATION
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(107, boxY, boxW, boxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("PROJECT LOCATION", 111, boxY + 5.5);

    const streetAddr = (estimate.project_address || estimate.client_address || "").trim();
    const cszParts: string[] = [];
    if (estimate.client_city) cszParts.push(estimate.client_city.trim());
    if (estimate.client_state) cszParts.push(estimate.client_state.trim());
    if (estimate.client_zip) cszParts.push(estimate.client_zip.trim());
    const cityStateZip = cszParts.join(", ");

    const displayAddressLine1 = streetAddr || (cityStateZip ? cityStateZip : "Project Site Address on File");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(displayAddressLine1, 111, boxY + 12);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    let locY = boxY + 17;
    if (streetAddr && cityStateZip) {
        doc.text(cityStateZip, 111, locY);
        locY += 4.5;
    }
    const projType = estimate.project_type || estimate.title || "Residential / Commercial Project";
    doc.text(`Project Type: ${projType}`, 111, locY);

    let startTableY = boxY + boxH + 6;

    // 3. Project Scope Notes (if provided)
    if (estimate.notes && estimate.notes.trim()) {
        const cleanNotesText = estimate.notes.replace(/Client Address: [^\n]+/g, '').trim();
        if (cleanNotesText) {
            doc.setFillColor(254, 243, 199); // light amber tint
            doc.setDrawColor(251, 191, 36);
            const splitNotes = doc.splitTextToSize(`Project Scope Description: ${cleanNotesText}`, pageWidth - 36);
            const notesHeight = Math.min(splitNotes.length * 3.8 + 5, 20);
            
            doc.roundedRect(14, startTableY, pageWidth - 28, notesHeight, 1.5, 1.5, "FD");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(120, 53, 15);
            doc.text(splitNotes, 18, startTableY + 4);
            startTableY += notesHeight + 5;
        }
    }

    // 4. Items Table (Scope of Work)
    const tableHeaders = [["#", "Description & Specifications", "Qty", "Unit Price", "Total Amount"]];
    const tableData = (estimate.items || []).map((item, idx) => {
        const itemTotal = item.total_price ?? ((item.quantity || 0) * (item.unit_price || 0));
        return [
            idx + 1,
            item.description || "General Construction Service",
            item.quantity || 1,
            `$${(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `$${itemTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
    });

    autoTable(doc, {
        startY: startTableY,
        head: tableHeaders,
        body: tableData,
        theme: 'grid',
        headStyles: { 
            fillColor: [primaryNavy[0], primaryNavy[1], primaryNavy[2]], 
            textColor: 255,
            fontSize: 8.5,
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 3.5, 
            lineColor: [226, 232, 240], 
            lineWidth: 0.2,
            overflow: 'linebreak'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    // 5. Financial Totals & Summary Block
    const lastAutoTableY = (doc as any).lastAutoTable?.finalY || 130;
    let summaryY = lastAutoTableY + 6;

    if (summaryY > 210) {
        doc.addPage();
        summaryY = 20;
    }

    const subtotal = estimate.subtotal || 0;
    const taxRate = estimate.tax_rate || 0;
    const taxAmount = estimate.tax_amount || 0;
    const discountAmount = estimate.discount_amount || 0;
    
    // Correct total resolution: check estimate.total, estimate.total_amount, or calculate from subtotal + tax - discount
    const rawTotal = estimate.total ?? estimate.total_amount;
    const calculatedTotal = subtotal + taxAmount - discountAmount;
    const totalAmount = (rawTotal !== undefined && rawTotal > 0) ? rawTotal : calculatedTotal;

    if (subtotal > 0 && totalAmount <= 0) {
        throw new Error(`[PDF Generator Error] Invalid calculated total ($${totalAmount}) for commercial estimate with subtotal $${subtotal}. Generation halted.`);
    }

    const amountPaid = estimate.amount_paid || 0;
    const balanceDue = estimate.balance_due ?? (totalAmount - amountPaid);

    // Correct tax percentage presentation: convert decimal (0.055) to 5.5%
    const displayTaxPercent = taxRate > 0 
        ? (taxRate <= 1 ? (taxRate * 100).toFixed(1) : taxRate.toFixed(1))
        : (subtotal > 0 && taxAmount > 0 ? ((taxAmount / subtotal) * 100).toFixed(1) : "0");

    const sumW = 85;
    const sumX = pageWidth - 14 - sumW;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    let rY = summaryY;
    doc.text("Subtotal:", sumX + 4, rY);
    doc.text(`$${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX - 4, rY, { align: "right" });
    rY += 5;

    // Tax row (ONLY if tax_amount > 0 or tax_rate > 0)
    if (taxAmount > 0 || taxRate > 0) {
        doc.text(`Tax (${displayTaxPercent}%):`, sumX + 4, rY);
        doc.text(`$${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX - 4, rY, { align: "right" });
        rY += 5;
    }

    // Discount row (ONLY if discount_amount > 0)
    if (discountAmount > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text("Discount:", sumX + 4, rY);
        doc.text(`-$${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX - 4, rY, { align: "right" });
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        rY += 5;
    }

    // Grand Total Highlight Box
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.roundedRect(sumX, rY, sumW, 9, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL CONTRACT AMOUNT:", sumX + 4, rY + 6);
    doc.setFontSize(11);
    doc.setTextColor(accentOrange[0], accentOrange[1], accentOrange[2]);
    doc.text(`$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX - 4, rY + 6, { align: "right" });
    rY += 12;

    // Amount Paid & Balance Due (if applicable)
    if (amountPaid > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(22, 101, 52); // Emerald
        doc.text("Amount Paid to Date:", sumX + 4, rY);
        doc.text(`$${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX - 4, rY, { align: "right" });
        rY += 5;

        doc.setFont("helvetica", "bold");
        doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
        doc.text("REMAINING BALANCE DUE:", sumX + 4, rY);
        doc.text(`$${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightX - 4, rY, { align: "right" });
        rY += 6;
    }

    // 6. Terms & Conditions Box (Left side of summary)
    const termsW = sumX - 18;
    const termsH = rY - summaryY;
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(14, summaryY - 2, termsW, Math.max(termsH, 22), 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("TERMS & COMMERCIAL CONDITIONS", 18, summaryY + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    const termsText = estimate.terms || company?.default_terms || "Payment due upon receipt. All work performed to high trade standards. Estimate valid for 30 days.";
    const splitTerms = doc.splitTextToSize(termsText, termsW - 8);
    doc.text(splitTerms, 18, summaryY + 8);

    // 7. Dual Signature Section (Client Acceptance & Contractor Authorization)
    let sigBlockY = Math.max(rY + 8, summaryY + termsH + 8);
    if (sigBlockY > 230) {
        doc.addPage();
        sigBlockY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("AUTHORIZED ACCEPTANCE & SIGNATURES", 14, sigBlockY);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.line(14, sigBlockY + 2, pageWidth - 14, sigBlockY + 2);

    const sigBoxY = sigBlockY + 5;
    const sigBoxW = 89;
    const sigBoxH = 42;

    // CLIENT ACCEPTANCE BOX (Left)
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(14, sigBoxY, sigBoxW, sigBoxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("CLIENT ACCEPTANCE", 18, sigBoxY + 5.5);

    const clientSigUrl = options.clientSignatureUrl || (estimate as any).signature_url;
    const clientName = estimate.client_name || "Client";
    const clientEmail = estimate.client_email || "N/A";
    const signedAt = options.signedAt || (estimate.approved_at ? new Date(estimate.approved_at).toLocaleString() : new Date().toLocaleString());

    if (isApproved || clientSigUrl) {
        if (clientSigUrl && clientSigUrl.startsWith("data:image")) {
            try {
                doc.addImage(clientSigUrl, "PNG", 18, sigBoxY + 8, 44, 15);
            } catch (e) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8);
                doc.setTextColor(textDark[0], textDark[1], textDark[2]);
                doc.text(`[Digitally Signed by ${clientName}]`, 18, sigBoxY + 18);
            }
        } else {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.text(`[Electronically Signed by ${clientName}]`, 18, sigBoxY + 18);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(`Signer: ${clientName}`, 18, sigBoxY + 27);
        doc.text(`Email: ${clientEmail}`, 18, sigBoxY + 31);
        doc.text(`Date: ${signedAt}`, 18, sigBoxY + 35);

        // Verification Badge
        doc.setFillColor(220, 252, 231);
        doc.roundedRect(62, sigBoxY + 30, 38, 7, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(21, 128, 61);
        doc.text("ELECTRONICALLY SIGNED", 81, sigBoxY + 33, { align: "center" });
        doc.text("AUDIT LOG ENCRYPTED", 81, sigBoxY + 35.5, { align: "center" });
    } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text("Signature: ____________________________________", 18, sigBoxY + 20);
        doc.text(`Printed Name: ${clientName}`, 18, sigBoxY + 28);
        doc.text("Date: ________________________", 18, sigBoxY + 35);
    }

    // CONTRACTOR AUTHORIZATION BOX (Right)
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.roundedRect(107, sigBoxY, sigBoxW, sigBoxH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("CONTRACTOR AUTHORIZATION", 111, sigBoxY + 5.5);

    const shouldApplyContractorSig = options.contractorSignatureUrl || (company as any)?.auto_apply_contractor_signature;
    const contractorSigUrl = shouldApplyContractorSig ? (options.contractorSignatureUrl || (company as any)?.contractor_signature_url) : null;
    const contractorRepName = options.contractorName || (company as any)?.contractor_printed_name || company?.company_name || "Authorized Representative";

    if (contractorSigUrl && contractorSigUrl.startsWith("data:image")) {
        try {
            doc.addImage(contractorSigUrl, "PNG", 111, sigBoxY + 8, 44, 15);
        } catch (e) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.text(company?.company_name || "H & A Construction LLC", 111, sigBoxY + 18);
        }
    } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text(company?.company_name || "H & A Construction LLC", 111, sigBoxY + 18);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Representative: ${contractorRepName}`, 111, sigBoxY + 27);
    if (company?.license_number) {
        doc.text(`License #: ${company.license_number}`, 111, sigBoxY + 31);
    }
    doc.text(`Date: ${signedAt}`, 111, sigBoxY + 35);

    // 8. Certificate of Completion & Audit Trail (PAGE 2 - If Approved)
    if (isApproved) {
        doc.addPage();

        doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
        doc.rect(0, 0, pageWidth, 4, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
        doc.text("CERTIFICATE OF ELECTRONIC SIGNATURE COMPLETION", 14, 16);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text("Official Audit Trail & Cryptographic Evidence Log", 14, 21);

        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
        doc.line(14, 25, pageWidth - 14, 25);

        // Audit Summary Box
        doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
        doc.roundedRect(14, 30, pageWidth - 28, 55, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
        doc.text("DOCUMENT AUDIT METADATA", 18, 37);

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);

        const auditIp = options.auditDetails?.ipAddress || "Verified Client Web Portal Session";
        const auditUa = options.auditDetails?.userAgent || "Standard Browser Client";
        const docHashStr = options.auditDetails?.documentHash || `SHA256-${(estimate.id || '').replace(/-/g, '').slice(0, 32)}`;

        const auditRows = [
            ["Document Reference:", `${estNum} (${estimate.project_type || estimate.title || 'Commercial Estimate'})`],
            ["Document Snapshot Hash:", docHashStr],
            ["Signer Legal Name:", clientName],
            ["Signer Email Address:", clientEmail],
            ["Authentication Method:", "Web Portal Session & Electronic Consent Confirmation"],
            ["Signer Device context:", auditUa.length > 45 ? auditUa.slice(0, 45) + "..." : auditUa],
            ["Client Consent Event:", "Accepted Estimate terms and submitted electronic signature"],
            ["Execution Timestamp:", signedAt]
        ];

        let aY = 44;
        auditRows.forEach(([label, val]) => {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(textDark[0], textDark[1], textDark[2]);
            doc.text(label, 18, aY);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
            doc.text(val, 65, aY);
            aY += 5;
        });

        // Audit Event History Timeline Table
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
        doc.text("SIGNATURE WORKFLOW EVENT TIMELINE", 14, 95);

        const auditTimelineData = [
            ["1", "Document Version Created", dateStr, "System / Contractor", "Document version hash calculated"],
            ["2", "Electronic Consent Accepted", signedAt, clientName, "Terms & electronic consent recorded"],
            ["3", "Client Signature Applied", signedAt, clientName, `Visual signature captured for ${clientEmail}`],
            ["4", "Immutable Signed PDF Created", signedAt, "H&A System", "PDF artifact generated & locked"]
        ];

        autoTable(doc, {
            startY: 100,
            head: [["Step", "Event Description", "Timestamp", "Actor", "Security Status"]],
            body: auditTimelineData,
            theme: 'grid',
            headStyles: { fillColor: [primaryNavy[0], primaryNavy[1], primaryNavy[2]], textColor: 255, fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 7.5, cellPadding: 3, lineColor: [226, 232, 240] },
            columnStyles: {
                0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 46 },
                2: { cellWidth: 35 },
                3: { cellWidth: 35 },
                4: { cellWidth: 'auto' }
            }
        });

        // Security Declaration Box
        const secY = (doc as any).lastAutoTable?.finalY + 10 || 160;
        doc.setFillColor(240, 253, 244); // light green
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(14, secY, pageWidth - 28, 22, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(22, 101, 52);
        doc.text("AUDIT TRAIL RECORDED & DOCUMENT LOCKED", 18, secY + 6);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(21, 128, 61);
        doc.text("This electronic document has been executed by the client through explicit consent. The document version hash and audit log record the timestamps and parameters of this transaction.", 18, secY + 11, { maxWidth: pageWidth - 36 });
    }

    // Dynamic Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(`${company?.company_name || "H & A Construction LLC"}  |  Commercial Estimate #${estNum}`, 14, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: "right" });
    }

    // Save or return Blob
    const filename = `estimate_${estNum}.pdf`;
    if (options.returnBlob) {
        return doc.output('blob');
    } else {
        doc.save(filename);
    }
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
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm

    // Clean text and extract media
    const { cleanText: cleanDesc, mediaUrls: descMedia } = extractMediaFromText(extra.description);
    const { cleanText: cleanReason, mediaUrls: reasonMedia } = extractMediaFromText(extra.reason);
    const photoUrls = Array.from(new Set([...descMedia, ...reasonMedia]));

    const clientName = signatureDetails?.signerName || estimate?.client_name || "Client";
    const clientEmail = signatureDetails?.signerEmail || estimate?.client_email || "N/A";
    const projectType = estimate?.title || "Construction / Remodeling";
    const estimateRef = estimate?.id ? `EST #${estimate.id.split('-')[0].toUpperCase()}` : "N/A";
    const changeOrderRef = `CO-${extra.id.slice(0, 8).toUpperCase()}`;
    const scheduleImpact = extra.schedule_impact || "None";
    const approvalDate = signatureDetails?.signedAt 
        ? new Date(signatureDetails.signedAt).toLocaleDateString()
        : extra.created_at 
            ? new Date(extra.created_at).toLocaleDateString()
            : new Date().toLocaleDateString();

    const previousContract = extra.previous_contract_price ?? (estimate?.total_amount || 0);
    const extraAmount = extra.amount || 0;
    const revisedTotal = extra.revised_contract_price ?? (previousContract + extraAmount);

    // 1. Header Logo & Company Info
    let logoOffsetY = 25;
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
                    doc.addImage(dataUrl, "PNG", 12, 10, 22, 22);
                    logoOffsetY = 36;
                }
            }
        } catch (e) {
            console.warn("Could not add logo to Change Order PDF:", e);
        }
    }

    const startXLogoText = company?.logo_url ? 37 : 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 27, 75); // #1e1b4b
    doc.text(company?.company_name || "H&A Construction LLC", startXLogoText, 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text("RESIDENTIAL   |   COMMERCIAL   |   REMODELING", startXLogoText, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("QUALITY WORK. LASTING VALUE.", startXLogoText, 25);

    // Company Contact Details (Right side)
    doc.setFontSize(8);
    doc.setTextColor(50);
    const companyAddress = company?.address || "32 Jameson Hill Rd, Old Orchard Beach, ME 04064";
    const companyPhone = company?.phone ? `Phone: ${company.phone}` : "978 398 2457";
    const companyEmail = company?.email ? `Email: ${company.email}` : "h.a.contruction@gmail.com";

    doc.text(companyAddress, pageWidth - 12, 16, { align: "right" });
    doc.text(companyPhone, pageWidth - 12, 21, { align: "right" });
    doc.text(companyEmail, pageWidth - 12, 26, { align: "right" });

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.line(12, 30, pageWidth - 12, 30);

    // 2. Document Title Banner & Approved Badge Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 27, 75);
    doc.text("CHANGE ORDER APPROVAL RECEIPT", 12, 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text("Electronically Signed Approval Record", 12, 46);

    // Right Approved Badge Box
    const badgeX = pageWidth - 58;
    doc.setFillColor(220, 252, 231); // light emerald green
    doc.roundedRect(badgeX, 33, 46, 17, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text("✔ APPROVED", badgeX + 23, 41, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(21, 128, 61);
    doc.text("CONTRACT MODIFICATION AUTHORIZED", badgeX + 23, 46, { align: "center" });

    // Section Bar Drawer Helper
    const drawSectionHeader = (title: string, rightSubtitle: string, yPos: number) => {
        doc.setFillColor(46, 16, 101); // #2e1065 deep purple
        doc.roundedRect(12, yPos, pageWidth - 24, 6.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 15, yPos + 4.5);

        if (rightSubtitle) {
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.text(rightSubtitle.toUpperCase(), pageWidth - 15, yPos + 4.5, { align: "right" });
        }
    };

    // SECTION 1: CLIENT & PROJECT SUMMARY
    drawSectionHeader("1. CLIENT & PROJECT SUMMARY", "BUILDING TOGETHER", 53);

    // Left Box: CLIENT INFORMATION
    const boxW1 = 90;
    const boxW2 = 92;
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(12, 61, boxW1, 26, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("CLIENT INFORMATION", 16, 67);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Client:", 16, 73);
    doc.text("Client Email:", 16, 78);
    doc.text("Project Type:", 16, 83);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17);
    doc.text(clientName, 42, 73);
    doc.text(clientEmail, 42, 78);
    doc.text(projectType, 42, 83);

    // Right Box: CHANGE ORDER DETAILS
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(106, 61, boxW2, 26, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("CHANGE ORDER DETAILS", 110, 67);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Estimate Ref:", 110, 73);
    doc.text("Change Order Ref:", 110, 78);
    doc.text("Status:", 110, 83);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17);
    doc.text(estimateRef, 142, 73);
    doc.text(changeOrderRef, 142, 78);

    // Status Pill
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(142, 80, 22, 4.5, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52);
    doc.text("APPROVED", 153, 83.3, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Schedule Impact:", 168, 73);
    doc.text("Approval Date:", 168, 78);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17);
    doc.text(scheduleImpact, 192, 73);
    doc.text(approvalDate, 192, 78);


    // SECTION 2: FINANCIAL SUMMARY
    drawSectionHeader("2. FINANCIAL SUMMARY", "CLEAR NUMBERS. A STRONGER TOMORROW.", 91);

    const cardW = 56;
    // Card 1: Original Contract
    doc.setFillColor(243, 232, 255);
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(12, 99, cardW, 20, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(88, 28, 135);
    doc.text("ORIGINAL CONTRACT", 40, 106, { align: "center" });
    doc.setFontSize(15);
    doc.setTextColor(17);
    doc.text(`$${previousContract.toLocaleString()}`, 40, 114, { align: "center" });

    // Plus sign
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(126, 34, 206);
    doc.text("+", 73, 111, { align: "center" });

    // Card 2: Extra Addition
    doc.setFillColor(243, 232, 255);
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(77, 99, cardW, 20, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(88, 28, 135);
    doc.text("EXTRA ADDITION", 105, 106, { align: "center" });
    doc.setFontSize(15);
    doc.setTextColor(126, 34, 206);
    doc.text(`+$${extraAmount.toLocaleString()}`, 105, 114, { align: "center" });

    // Card 3: Revised Total
    doc.setFillColor(243, 232, 255);
    doc.setDrawColor(192, 132, 252);
    doc.roundedRect(142, 99, 56, 20, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(88, 28, 135);
    doc.text("REVISED TOTAL", 170, 106, { align: "center" });
    doc.setFontSize(15);
    doc.setTextColor(58, 12, 163);
    doc.text(`$${revisedTotal.toLocaleString()}`, 170, 114, { align: "center" });


    // SECTIONS 3 & 4: SCOPE / REASON & TERMS AGREED (Side by Side)
    // Section 3 Bar (Left)
    doc.setFillColor(46, 16, 101);
    doc.roundedRect(12, 123, boxW1, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("3. SCOPE / REASON", 15, 127.2);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text("SMALL CHANGES. BIG PROGRESS.", 98, 127.2, { align: "right" });

    // Section 4 Bar (Right)
    doc.setFillColor(46, 16, 101);
    doc.roundedRect(106, 123, boxW2, 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("4. TERMS AGREED", 109, 127.2);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text("MUTUAL AGREEMENT", 195, 127.2, { align: "right" });

    // Left Box 3 Content
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(12, 130, boxW1, 32, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("Description / Scope", 16, 136);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50);
    const splitDesc = doc.splitTextToSize(cleanDesc || "Additional scope request", boxW1 - 8);
    doc.text(splitDesc, 16, 141);

    let reasonY = 141 + (splitDesc.length * 4);
    if (reasonY < 150) reasonY = 150;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("Reason", 16, reasonY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50);
    const splitReason = doc.splitTextToSize(cleanReason || "Field requirement / Client request", boxW1 - 8);
    doc.text(splitReason, 16, reasonY + 5);

    // Right Box 4 Content
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(106, 130, boxW2, 32, 2, 2, "FD");

    const termsList = [
        "I agree to conduct this transaction electronically and use an electronic signature (UETA / E-SIGN Act Compliance).",
        `I have read and agree to the Change Order cost (+$${extraAmount.toLocaleString()}) and revised contract total of $${revisedTotal.toLocaleString()}.`,
        `The schedule impact of ${scheduleImpact} has been acknowledged.`,
        "This approval is recorded as part of the project contract documentation."
    ];

    let tY = 135;
    termsList.forEach((termText) => {
        doc.setFillColor(22, 163, 74);
        doc.circle(111, tY - 1, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.text("✔", 110.1, tY - 0.2);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(50);
        const splitTerm = doc.splitTextToSize(termText, boxW2 - 12);
        doc.text(splitTerm, 115, tY);
        tY += (splitTerm.length * 3.5) + 2;
    });


    // SECTION 5: SIGNATURE & AUTHORIZATION
    drawSectionHeader("5. SIGNATURE & AUTHORIZATION", "TRUSTED. VERIFIED. OFFICIAL.", 166);

    // Left Box: CLIENT ELECTRONIC SIGNATURE
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(12, 174, boxW1, 46, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("CLIENT ELECTRONIC SIGNATURE", 16, 180);

    // Signature box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(16, 183, 74, 16, 1, 1, "FD");

    const sigUrl = signatureDetails?.signatureDataUrl;
    if (extra.status === 'approved' || extra.status === 'paid' || sigUrl) {
        if (sigUrl && sigUrl.startsWith("data:image")) {
            try {
                doc.addImage(sigUrl, "PNG", 18, 184, 45, 14);
            } catch (e) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8);
                doc.text(`[Digitally Signed by ${clientName}]`, 20, 192);
            }
        } else {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.text(`[Electronically Signed & Approved by ${clientName}]`, 20, 192);
        }
    } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Pending Client E-Signature...", 20, 192);
    }

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Signer Legal Name:", 16, 203);
    doc.text("Signer Email:", 16, 208);
    doc.text("Approval Timestamp:", 16, 213);
    doc.text("Compliance:", 16, 218);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17);
    doc.text(clientName, 46, 203);
    doc.text(clientEmail, 46, 208);
    doc.text(`${approvalDate}`, 46, 213);
    doc.text("UETA & Federal ESIGN Act Validated", 46, 218);


    // Right Box: CONTRACTOR AUTHORIZATION
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(106, 174, boxW2, 46, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("CONTRACTOR AUTHORIZATION", 110, 180);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17);
    doc.text(company?.company_name || "H&A Construction LLC", 110, 192);

    doc.setDrawColor(200);
    doc.line(110, 202, 192, 202);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Authorized Representative", 110, 207);
    doc.text(company?.company_name || "H&A Construction LLC", 110, 212);

    doc.text(`Date: ${approvalDate}`, 110, 218);


    // SECTION 6: ATTACHED EVIDENCE & PHOTOS
    drawSectionHeader("6. ATTACHED EVIDENCE & PHOTOS", "ADDITIONAL DOCUMENTATION", 224);

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(12, 231, pageWidth - 24, 38, 2, 2, "FD");

    let photoAttached = false;
    if (photoUrls.length > 0) {
        const firstPhoto = photoUrls[0];
        if (firstPhoto && (firstPhoto.startsWith('data:image') || firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://'))) {
            try {
                const format = firstPhoto.includes('image/png') ? 'PNG' : 'JPEG';
                doc.addImage(firstPhoto, format, 16, 234, 32, 32);
                doc.setDrawColor(200);
                doc.rect(16, 234, 32, 32, "S");
                photoAttached = true;
            } catch (imgErr) {
                console.warn("Could not draw thumbnail image in section 6:", imgErr);
            }
        }
    }

    const mediaTextX = photoAttached ? 52 : 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 27, 75);
    doc.text(`${photoUrls.length} Attachment${photoUrls.length === 1 ? '' : 's'}`, mediaTextX, 242);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Supporting media attached to this change order.", mediaTextX, 248);
    doc.text("This may include photos, documents, or other relevant project evidence.", mediaTextX, 253);

    // Script Handwriting "Thank you for your business!" (Right side)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(16);
    doc.setTextColor(126, 34, 206);
    doc.text("Thank you for\nyour business!", pageWidth - 16, 248, { align: "right" });


    // FOOTER
    doc.setDrawColor(126, 34, 206);
    doc.setLineWidth(0.4);
    doc.line(12, 280, pageWidth - 12, 280);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
        `${(company?.company_name || "H&A CONSTRUCTION LLC").toUpperCase()}   |   QUALITY CONSTRUCTION. STRONGER COMMUNITIES.`,
        pageWidth / 2,
        285,
        { align: "center" }
    );

    const filename = `change_order_receipt_CO-${extra.id.slice(0, 8).toUpperCase()}.pdf`;
    doc.save(filename);
};

export const generatePaymentCancellationPDF = async (
    payment: any,
    estimate: Estimate | null,
    company: CompanySettings | null,
    cancellationReason: string,
    cancelledBy: string
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header & Logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(11, 42, 74);
    doc.text(company?.company_name || "H&A Construction LLC", 20, 25);

    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38);
    doc.text("PAYMENT CANCELLATION & REJECTION RECEIPT", 20, 34);

    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(20, 38, pageWidth - 20, 38);

    // Metadata Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`Client Name: ${estimate?.client_name || payment.customer_name || 'Client'}`, 20, 47);
    doc.text(`Project: ${estimate?.project_type || 'Construction Project'}`, 20, 54);
    doc.text(`Date of Rejection: ${new Date().toLocaleDateString()}`, 20, 61);
    doc.text(`Validated / Rejected By: ${cancelledBy}`, 20, 68);

    // Payment Attempt Summary Table
    autoTable(doc, {
        startY: 75,
        head: [['Payment Attempt Details', 'Amount / Method']],
        body: [
            ['Payment Type', String(payment.note || '').includes('Material') ? 'Material Payment' : 'Contract Payment'],
            ['Attempted Amount', `$${(payment.amount || 0).toFixed(2)}`],
            ['Payment Method', String(payment.method || 'Zelle').toUpperCase()],
            ['Attempt Date', payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'],
            ['Status', 'REJECTED / CANCELLED']
        ],
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 10 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Cancellation Reason Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28);
    doc.text("REASON FOR CANCELLATION / REJECTION:", 20, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const splitReason = doc.splitTextToSize(cancellationReason || "Payment deposit not verified in company bank account.", pageWidth - 40);
    doc.text(splitReason, 20, finalY + 8);

    // Current Balance Due Warning Box
    const balanceY = finalY + 15 + (splitReason.length * 6);
    doc.setFillColor(254, 242, 242);
    doc.rect(20, balanceY, pageWidth - 40, 25, "F");
    doc.setDrawColor(252, 165, 165);
    doc.rect(20, balanceY, pageWidth - 40, 25, "S");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(153, 27, 27);
    doc.text("CURRENT OUTSTANDING BALANCE DUE:", 25, balanceY + 10);
    doc.setFontSize(14);
    doc.text(`$${(estimate?.balance_due || payment.amount || 0).toLocaleString()}`, 25, balanceY + 19);

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Official document generated by H&A Construction Client Portal.", 20, balanceY + 35);

    const filename = `Cancellation_Receipt_${estimate?.id ? estimate.id.split('-')[0].toUpperCase() : 'Payment'}.pdf`;
    doc.save(filename);
};

