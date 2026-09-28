import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateProfessionalPDF } from '../src/lib/pdf-generator';
import { Estimate } from '../src/lib/estimates';
import { CompanySettings } from '../src/lib/company-settings';

// Mock browser Image / window objects if running in Node environment
if (typeof window === 'undefined') {
    (global as any).window = global;
}
if (typeof Image === 'undefined') {
    (global as any).Image = class {
        onload: () => void = () => {};
        onerror: () => void = () => {};
        complete = false;
        width = 0;
        height = 0;
        set src(_v: string) {
            setTimeout(() => {
                this.complete = false;
                if (this.onerror) this.onerror();
            }, 10);
        }
    };
}

// Independent 100% Valid PNG Signature Data URLs (Distinct for Client vs Contractor)
const mockClientSignaturePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const mockContractorSignaturePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function runProductionPdfGeneration() {
    const dummyCompany: CompanySettings = {
        id: 'org-ha-construction-001',
        company_name: 'H & A CONSTRUCTION LLC',
        address: '32 Jameson Hill Rd, Old Orchard Beach, ME 04064',
        phone: '(978) 398-2457',
        email: 'h.a.construction@gmail.com',
        license_number: '', // Omit license number to test conditional rendering (no invented data)
        contractor_printed_name: '', // No representative configured in profile to test fallback
        contractor_title: 'Managing Member & General Contractor',
        auto_apply_contractor_signature: true
    };

    const dummyEstimate: Estimate = {
        id: 'est-2026-088',
        organization_id: 'org-ha-construction-001',
        number: 'EST-2026-088',
        title: 'Commercial Restaurant Kitchen & Dining Renovation',
        client_name: 'Robert & Emily Vance',
        client_email: 'robert.vance@vancerestaurants.com',
        client_phone: '(207) 555-0199',
        project_address: '142 Commercial St',
        client_address: '142 Commercial St',
        client_city: 'Portland',
        client_state: 'ME',
        client_zip: '04101',
        status: 'Approved',
        created_at: new Date('2026-09-25T14:30:00Z').toISOString(),
        valid_until: new Date('2026-10-25T14:30:00Z').toISOString(),
        items: [
            {
                id: 'item-1',
                description: 'Demolition & Commercial Debris Disposal (Includes wall removal, tile stripping, and heavy dumpster rental)',
                quantity: 1,
                unit_price: 3450.00,
                amount: 3450.00
            },
            {
                id: 'item-2',
                description: 'Custom Quartz Kitchen Countertops & Prep Island Fabrication (Engineered Calacatta Gold 3mm edge)',
                quantity: 120,
                unit_price: 45.00,
                amount: 5400.00
            },
            {
                id: 'item-3',
                description: 'Commercial Subway Tile Backsplash Installation (Includes waterproof membrane, grout & silicone sealant)',
                quantity: 85,
                unit_price: 24.00,
                amount: 2040.00
            },
            {
                id: 'item-4',
                description: 'Electrical Panel Upgrade & Recessed Dimmable LED Commercial Strip Wiring (100A Dedicated Lines)',
                quantity: 1,
                unit_price: 2850.00,
                amount: 2850.00
            },
            {
                id: 'item-5',
                description: 'Plumbing Hookup, Stainless Commercial Undermount Sink Assembly & Grease Trap Connection',
                quantity: 1,
                unit_price: 1950.00,
                amount: 1950.00
            }
        ],
        subtotal: 15690.00,
        tax_rate: 0.055,
        tax_amount: 862.95,
        discount_amount: 0,
        total: 16552.95,
        total_amount: 16552.95,
        notes: 'DEMONSTRATION DOCUMENT FOR SYSTEM MIGRATION REVIEW 028. All scope items, terms, and signatures are fictitious samples created for visual evaluation.',
        terms: '1. 30% Down Payment required upon agreement execution.\n2. Work guaranteed for 1 (one) full year against craftsmanship defects.\n3. Change orders must be approved in writing prior to execution.',
        signature_url: mockClientSignaturePng,
        contractor_signature_url: mockContractorSignaturePng,
        contractor_signed_at: new Date('2026-09-26T09:15:00Z').toISOString()
    };

    // Calculate real document payload SHA-256 hash
    const docPayloadStr = JSON.stringify({
        id: dummyEstimate.id,
        number: dummyEstimate.number,
        subtotal: dummyEstimate.subtotal,
        tax_amount: dummyEstimate.tax_amount,
        total: dummyEstimate.total,
        client: dummyEstimate.client_email
    });
    const realDocHash = crypto.createHash('sha256').update(docPayloadStr).digest('hex');

    console.log("Generating PDF using production src/lib/pdf-generator.ts...");

    const blob = await generateProfessionalPDF(dummyEstimate, dummyCompany, {
        clientSignatureUrl: mockClientSignaturePng,
        contractorSignatureUrl: mockContractorSignaturePng,
        signedAt: new Date('2026-09-26T10:20:00Z').toISOString(),
        auditDetails: {
            ipAddress: '198.51.100.42 (Client Verification IP)',
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0',
            documentHash: realDocHash,
            consentVersion: 'v1.0_UETA_ESIGN_DEMO',
            authMethod: 'Email OTP Verification & Electronic Signature Consent'
        },
        returnBlob: true
    });

    if (blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        
        // Save to workspace
        const localPath = path.join(process.cwd(), 'sample_production_estimate_ha_construction.pdf');
        fs.writeFileSync(localPath, buffer);
        console.log(`Saved PDF to workspace: ${localPath}`);

        // Save to brain artifacts directory
        const artifactDir = "C:\\Users\\Aline\\.gemini\\antigravity-ide\\brain\\49ad5b7b-e5b5-471f-9dce-1e1b1ac4aa14";
        const artifactPath = path.join(artifactDir, 'sample_estimate_ha_construction.pdf');
        fs.writeFileSync(artifactPath, buffer);
        console.log(`Saved PDF to brain artifacts: ${artifactPath}`);
    }
}

runProductionPdfGeneration().catch(console.error);
