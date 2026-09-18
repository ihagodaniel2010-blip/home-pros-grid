import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate } from './estimates';
import { CompanySettings } from './company-settings';

export const generateProfessionalPDF = async (
    estimate: Estimate,
    company: CompanySettings | null,
    labels: { [key: string]: string } = {}
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header & Logo
    if (company?.logo_url) {
        try {
            // Logo image loading handled gracefully if valid base64/url
        } catch (e) {
            console.warn("Could not add logo to PDF", e);
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
        company?.phone ? `Phone: ${company.phone}` : "Phone: (203) 555-0199",
        company?.email ? `Email: ${company.email}` : "Email: info@h-a-construction.com",
        company?.license_number ? `License: ${company.license_number}` : "CT HIC License # Registered"
    ].filter(Boolean);

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

    // 5. Terms & Signature
    const termsY = paymentY + 35;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS", 20, termsY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const terms = estimate.terms || company?.default_terms || "Payment due upon receipt.";
    const splitTerms = doc.splitTextToSize(terms, pageWidth - 40);
    doc.text(splitTerms, 20, termsY + 6);

    // Signature Line
    const sigY = termsY + 30 < 270 ? termsY + 30 : 270;
    doc.setFontSize(10);
    doc.text("Client Signature: ________________________________", 20, sigY);
    doc.text("Date: __________________", pageWidth - 20, sigY, { align: "right" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Thank you for choosing ${company?.company_name || "our services"}!`, pageWidth / 2, 285, { align: "center" });

    // Save PDF
    const filename = `estimate_${estimate.id ? estimate.id.split('-')[0].toUpperCase() : 'DRAFT'}.pdf`;
    doc.save(filename);
};
