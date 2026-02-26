import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import DevLoginSimulator from "@/components/DevLoginSimulator";
import Index from "./pages/Index";
import Services from "./pages/Services";
import Quote from "./pages/Quote";
import Success from "./pages/Success";
import Login from "./pages/Login";
import Join from "./pages/Join";
import About from "./pages/About";
import Blog from "./pages/Blog";
import CostGuide from "./pages/CostGuide";
import Experiences from "./pages/Experiences";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import ErrorBoundary from "./components/admin/ErrorBoundary";
import Dashboard from "./pages/admin/Dashboard";
import AdminInbox from "./pages/admin/Inbox";
import Analytics from "./pages/admin/Analytics";
import LeadDetail from "./pages/admin/LeadDetail";
import AdminSettings from "./pages/admin/Settings";
import AdminPortfolio from "./pages/admin/Portfolio";
import AdminReviews from "./pages/admin/Reviews";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
