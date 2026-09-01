import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Experiences from "./pages-spa/Experiences";
import AdminLogin from "./pages-spa/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import ErrorBoundary from "./components/admin/ErrorBoundary";
import Dashboard from "./pages-spa/admin/Dashboard";
import AdminInbox from "./pages-spa/admin/Inbox";
import Analytics from "./pages-spa/admin/Analytics";
import LeadDetail from "./pages-spa/admin/LeadDetail";
import AdminSettings from "./pages-spa/admin/Settings";
import Locations from "./pages-spa/admin/Locations";
import AdminPortfolio from "./pages-spa/admin/Portfolio";
import AdminReviews from "./pages-spa/admin/Reviews";
import Expenses from "./pages-spa/admin/Expenses";
import Reimbursements from "./pages-spa/admin/Reimbursements";
import ClientReceipts from "./pages-spa/admin/ClientReceipts";
import PublicReceipt from "./pages-spa/public/PublicReceipt";
import EstimateAssistant from "./pages-spa/admin/EstimateAssistant";
import TaxCenter from "./pages-spa/admin/TaxCenter";
import NotificationsCenter from "./pages-spa/admin/NotificationsCenter";
import Reports from "./pages-spa/admin/Reports";
import EstimatesList from "./pages-spa/admin/EstimatesList";
import EstimateEditor from "./pages-spa/admin/EstimateEditor";
import AdminServices from "./pages-spa/admin/Services";
import LeadSettings from "./pages-spa/admin/LeadSettings";
import CompanySettings from "./pages-spa/admin/CompanySettings";
import LeadMarket from "./pages-spa/admin/LeadMarket";
import PublicView from "./pages-spa/PublicView";
import PublicExtraView from "./pages-spa/PublicExtraView";
import Pricing from "./pages-spa/Pricing";
import Terms from "./pages-spa/Terms";
import Privacy from "./pages-spa/Privacy";
import Disclaimer from "./pages-spa/Disclaimer";
import NotFound from "./pages-spa/NotFound";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";

const App = () => (
  <LanguageProvider>
    <DevLoginSimulator />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/quote/:serviceSlug" element={<Quote />} />
        <Route path="/success" element={<Success />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/cost-guide" element={<CostGuide />} />
        <Route path="/experiences" element={<Experiences />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
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
          <Route path="settings" element={<AdminSettings />} />
          <Route path="locations" element={<Locations />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="lead-settings" element={<LeadSettings />} />
          <Route path="company" element={<CompanySettings />} />
          <Route path="lead-market" element={<LeadMarket />} />
        </Route>
        <Route path="/estimate/:token" element={<PublicView />} />
        <Route path="/extra/:token" element={<PublicExtraView />} />
        <Route path="/public/receipt/:token" element={<PublicReceipt />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <SonnerToaster position="top-right" />
    <ShadcnToaster />
  </LanguageProvider>
);

export default App;
