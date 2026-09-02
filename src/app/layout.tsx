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
    title: "H-A Construction — Construction, Remodeling & Home Improvement Services",
    description: "H-A Construction provides construction, remodeling, roofing, flooring, drywall, painting and carpentry services with online estimates, project management and client receipts.",
    openGraph: {
        title: "H-A Construction — Construction, Remodeling & Home Improvement Services",
        description: "H-A Construction provides construction, remodeling, roofing, flooring, drywall, painting and carpentry services with online estimates, project management and client receipts.",
        url: "https://h-a-construction.com",
        siteName: "H-A Construction",
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "H-A Construction — Construction, Remodeling & Home Improvement Services",
        description: "H-A Construction provides construction, remodeling, roofing, flooring, drywall, painting and carpentry services with online estimates, project management and client receipts.",
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
