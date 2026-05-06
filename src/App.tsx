import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ProductPage from "./pages/ProductPage";
import AboutUs from "./pages/AboutUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ReturnPolicy from "./pages/ReturnPolicy";
import Terms from "./pages/Terms";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ThankYou from "./pages/ThankYou";
import GiftSelection from "./pages/GiftSelection";
import OrderLanding from "./pages/OrderLanding";
import ConfirmOrder from "./pages/ConfirmOrder";
import ResetPassword from "./pages/ResetPassword";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminConfirmedOrders from "./pages/admin/AdminConfirmedOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductEdit from "./pages/admin/AdminProductEdit";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCodForm from "./pages/admin/AdminCodForm";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminPages from "./pages/admin/AdminPages";
import AdminGoogleSheets from "./pages/admin/AdminGoogleSheets";
import AdminCodNetwork from "./pages/admin/AdminCodNetwork";
import AdminCodNetworkSection from "./pages/admin/AdminCodNetworkSection";
import AdminWhatsApp from "./pages/admin/AdminWhatsApp";
import AdminImportOrders from "./pages/admin/AdminImportOrders";
import AdminAppStore from "./pages/admin/AdminAppStore";
import AdminAppSettings from "./pages/admin/AdminAppSettings";
import Prelander from "./pages/Prelander";
import Powerspry from "./pages/Powerspry";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour - keep cache for persistence
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.sessionStorage,
  key: "admin-query-cache",
});

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 1000 * 60 * 60 }}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/gift" element={<GiftSelection />} />
          <Route path="/order" element={<OrderLanding />} />
          <Route path="/confirm" element={<ConfirmOrder />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/news" element={<Prelander />} />
          <Route path="/prelander" element={<Prelander />} />
          <Route path="/powerspry" element={<Powerspry />} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/analytics" replace />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="confirmed-orders" element={<AdminConfirmedOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/:id" element={<AdminProductEdit />} />
            <Route path="cod-form" element={<AdminCodForm />} />
            <Route path="google-sheets" element={<AdminGoogleSheets />} />
            <Route path="cod-network" element={<AdminCodNetwork />} />
            <Route path="cod-network/:section" element={<AdminCodNetworkSection />} />
            <Route path="whatsapp" element={<AdminWhatsApp />} />
            <Route path="import-orders" element={<AdminImportOrders />} />
            <Route path="app-store" element={<AdminAppStore />} />
            <Route path="app-store/:appId" element={<AdminAppSettings />} />
            
            <Route path="pages" element={<AdminPages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
