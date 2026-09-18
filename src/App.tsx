import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DevLoginSimulator from "@/components/DevLoginSimulator";
import Index from "./pages-spa/Index";
import Services from "./pages-spa/Services";
import Quote from "./pages-spa/Quote";
import Success from "./pages-spa/Success";
import Login from "./pages-spa/Login";
import Join from "./pages-spa/Join";
import About from "./pages-spa/About";
import Blog from "./pages-spa/Blog";
import CostGuide from "./pages-spa/CostGuide";
import ReviewsPage from "./pages-spa/ReviewsPage";
import Pricing from "./pages-spa/Pricing";
import Terms from "./pages-spa/Terms";
import Privacy from "./pages-spa/Privacy";
import Disclaimer from "./pages-spa/Disclaimer";
import RefundPolicy from "./pages-spa/RefundPolicy";
import Contact from "./pages-spa/Contact";
import NotFound from "./pages-spa/NotFound";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

// Lazy-loaded heavy Admin & Portal Components for Optimal Public Page Load & Performance
const AdminLogin = lazy(() => import("./pages-spa/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const ErrorBoundary = lazy(() => import("./components/admin/ErrorBoundary"));
const Dashboard = lazy(() => import("./pages-spa/admin/Dashboard"));
const AdminInbox = lazy(() => import("./pages-spa/admin/Inbox"));
const Analytics = lazy(() => import("./pages-spa/admin/Analytics"));
const LeadDetail = lazy(() => import("./pages-spa/admin/LeadDetail"));
const AdminSettings = lazy(() => import("./pages-spa/admin/Settings"));
const Locations = lazy(() => import("./pages-spa/admin/Locations"));
const AdminPortfolio = lazy(() => import("./pages-spa/admin/Portfolio"));
const AdminReviews = lazy(() => import("./pages-spa/admin/Reviews"));
const Expenses = lazy(() => import("./pages-spa/admin/Expenses"));
const Reimbursements = lazy(() => import("./pages-spa/admin/Reimbursements"));
const ClientReceipts = lazy(() => import("./pages-spa/admin/ClientReceipts"));
const PublicReceipt = lazy(() => import("./pages-spa/public/PublicReceipt"));
const EstimateAssistant = lazy(() => import("./pages-spa/admin/EstimateAssistant"));
const TaxCenter = lazy(() => import("./pages-spa/admin/TaxCenter"));
const NotificationsCenter = lazy(() => import("./pages-spa/admin/NotificationsCenter"));
const Reports = lazy(() => import("./pages-spa/admin/Reports"));
const EstimatesList = lazy(() => import("./pages-spa/admin/EstimatesList"));
const EstimateEditor = lazy(() => import("./pages-spa/admin/EstimateEditor"));
const AdminServices = lazy(() => import("./pages-spa/admin/Services"));
const LeadSettings = lazy(() => import("./pages-spa/admin/LeadSettings"));
const CompanySettings = lazy(() => import("./pages-spa/admin/CompanySettings"));
const LeadMarket = lazy(() => import("./pages-spa/admin/LeadMarket"));
const AdminBilling = lazy(() => import("./pages-spa/admin/Billing"));
const AdminCommunications = lazy(() => import("./pages-spa/admin/Communications"));
const PublicView = lazy(() => import("./pages-spa/PublicView"));
const PublicExtraView = lazy(() => import("./pages-spa/PublicExtraView"));

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <LanguageProvider>
    <DevLoginSimulator />
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Fast-Paint Marketing Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/quote/:serviceSlug" element={<Quote />} />
          <Route path="/success" element={<Success />} />
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<Join />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/cost-guide" element={<CostGuide />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/experiences" element={<Navigate to="/reviews" replace />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />

          {/* Lazy-Loaded Admin & Portal Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ErrorBoundary><AdminLayout /></ErrorBoundary>}>
            <Route index element={<Dashboard />} />
            <Route path="portfolio" element={<AdminPortfolio />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reimbursements" element={<Reimbursements />} />
            <Route path="client-receipts" element={<ClientReceipts />} />
            <Route path="tax-center" element={<TaxCenter />} />
            <Route path="notifications" element={<NotificationsCenter />} />
            <Route path="reports" element={<Reports />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="estimate-assistant" element={<EstimateAssistant />} />
            <Route path="estimates" element={<EstimatesList />} />
            <Route path="estimates/new" element={<EstimateEditor />} />
            <Route path="estimates/:id" element={<EstimateEditor />} />
            <Route path="jobs" element={<EstimatesList />} />
            <Route path="jobs/:id" element={<LeadDetail />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="locations" element={<Locations />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="lead-settings" element={<LeadSettings />} />
            <Route path="company" element={<CompanySettings />} />
            <Route path="lead-market" element={<LeadMarket />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="communications" element={<AdminCommunications />} />
          </Route>
          <Route path="/estimate/:token" element={<PublicView />} />
          <Route path="/extra/:token" element={<PublicExtraView />} />
          <Route path="/public/receipt/:token" element={<PublicReceipt />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    <SonnerToaster position="top-right" />
    <ShadcnToaster />
  </LanguageProvider>
);

export default App;
