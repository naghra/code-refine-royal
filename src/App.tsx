import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ProductPage from "./pages/ProductPage";

// Lazy-load every non-critical route to shrink the initial bundle.
const AboutUs = lazy(() => import("./pages/AboutUs"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const GiftSelection = lazy(() => import("./pages/GiftSelection"));
const OrderLanding = lazy(() => import("./pages/OrderLanding"));
const ConfirmOrder = lazy(() => import("./pages/ConfirmOrder"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Prelander = lazy(() => import("./pages/Prelander"));
const Powerspry = lazy(() => import("./pages/Powerspry"));

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminConfirmedOrders = lazy(() => import("./pages/admin/AdminConfirmedOrders"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductEdit = lazy(() => import("./pages/admin/AdminProductEdit"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCodForm = lazy(() => import("./pages/admin/AdminCodForm"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));
const AdminGoogleSheets = lazy(() => import("./pages/admin/AdminGoogleSheets"));
const AdminCodNetwork = lazy(() => import("./pages/admin/AdminCodNetwork"));
const AdminCodNetworkSection = lazy(() => import("./pages/admin/AdminCodNetworkSection"));
const AdminWhatsApp = lazy(() => import("./pages/admin/AdminWhatsApp"));
const AdminImportOrders = lazy(() => import("./pages/admin/AdminImportOrders"));
const AdminAppStore = lazy(() => import("./pages/admin/AdminAppStore"));
const AdminAppSettings = lazy(() => import("./pages/admin/AdminAppSettings"));


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
        <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
