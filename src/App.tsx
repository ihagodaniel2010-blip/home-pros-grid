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
import AdminPortfolio from "./pages-spa/admin/Portfolio";
import AdminReviews from "./pages-spa/admin/Reviews";
import EstimatesList from "./pages-spa/admin/EstimatesList";
import EstimateEditor from "./pages-spa/admin/EstimateEditor";
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
        <Route path="/quote/:serviceSlug" element={<Quote />} />
        <Route path="/success" element={<Success />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join" element={<Join />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/cost-guide" element={<CostGuide />} />
        <Route path="/experiences" element={<Experiences />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ErrorBoundary><AdminLayout /></ErrorBoundary>}>
          <Route index element={<Dashboard />} />
          <Route path="portfolio" element={<AdminPortfolio />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="inbox" element={<AdminInbox />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="estimates" element={<EstimatesList />} />
          <Route path="estimates/new" element={<EstimateEditor />} />
          <Route path="estimates/:id" element={<EstimateEditor />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <SonnerToaster position="top-right" />
    <ShadcnToaster />
  </LanguageProvider>
);

export default App;
