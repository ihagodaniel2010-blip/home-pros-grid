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
    title: "HomeLeadPro — Local Construction Leads & Business Management",
    description: "HomeLeadPro helps contractors get local construction leads, send estimates, manage jobs, track payments, receipts, expenses and tax-ready reports.",
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
