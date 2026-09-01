import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/UserContext";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "HomeLeadPro — Construction Leads & Contractor Business Management",
    description: "Get local construction leads, send estimates, manage jobs, track payments, receipts, expenses, reimbursements and tax-ready reports with HomeLeadPro.",
    openGraph: {
        title: "HomeLeadPro — Construction Leads & Contractor Business Management",
        description: "Get local construction leads, send estimates, manage jobs, track payments, receipts, expenses, reimbursements and tax-ready reports with HomeLeadPro.",
        url: "https://homeleadpro.com",
        siteName: "HomeLeadPro",
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "HomeLeadPro — Construction Leads & Contractor Business Management",
        description: "Get local construction leads, send estimates, manage jobs, track payments, receipts, expenses, reimbursements and tax-ready reports with HomeLeadPro.",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    <TooltipProvider>
                        {children}
                        <Sonner />
                    </TooltipProvider>
                </Providers>
            </body>
        </html>
    );
}
