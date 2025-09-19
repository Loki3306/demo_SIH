import "./global.css";
import i18n from "./i18n";
import { I18nextProvider } from "react-i18next";
import React, { Suspense } from "react";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import NavBar, { NavBarSlideHandle } from "@/components/NavBar";
import TouristDashboard from "@/pages/TouristDashboard";
import PoliceDashboard from "@/pages/PoliceDashboard";
import Admin from "@/pages/Admin";
import AdminLogs from "@/pages/AdminLogs";
import AuthLogin from "@/pages/AuthLogin";
import AuthRegister from "@/pages/AuthRegister";
import LegalPrivacy from "@/pages/LegalPrivacy";
import LegalTerms from "@/pages/LegalTerms";

const queryClient = new QueryClient();

const App = () => (
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={<div />}> 
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NavBar />
            <NavBarSlideHandle />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tourist/dashboard" element={<TouristDashboard />} />
              <Route path="/police/dashboard" element={<PoliceDashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
              <Route path="/auth/login" element={<AuthLogin />} />
              <Route path="/auth/register" element={<AuthRegister />} />
              <Route path="/legal/privacy" element={<LegalPrivacy />} />
              <Route path="/legal/terms" element={<LegalTerms />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </Suspense>
  </I18nextProvider>
);

createRoot(document.getElementById("root")!).render(<App />);