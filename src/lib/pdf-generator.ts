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
    }
    const cszParts: string[] = [];
    if (estimate.client_city) cszParts.push(estimate.client_city);
    if (estimate.client_state) {
        if (cszParts.length > 0) {
            cszParts[0] = `${cszParts[0]}, ${estimate.client_state}`;
        } else {
            cszParts.push(estimate.client_state);
        }
    }
    if (estimate.client_zip) cszParts.push(estimate.client_zip);
    const cszText = cszParts.join(" ");
    if (cszText.trim()) {
        doc.text(cszText, 20, currentY);
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

