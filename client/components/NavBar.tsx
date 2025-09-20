import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useTranslation } from "react-i18next";
import {
  Moon,
  Sun,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  Home,
  Users,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function NavBar(): JSX.Element | null {
  const { isDark, setIsDark } = useDarkMode();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("navbar:collapsed") === "1";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("navbar:collapsed", isCollapsed ? "1" : "0");
    } catch (e) {}
  }, [isCollapsed]);

  // keyboard shortcut Ctrl/Cmd+B to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac && e.metaKey && e.key.toLowerCase() === "b") || (!isMac && e.ctrlKey && e.key.toLowerCase() === "b")) {
        e.preventDefault();
        setIsCollapsed((s) => {
          const next = !s;
          try {
            localStorage.setItem("navbar:collapsed", next ? "1" : "0");
            document.cookie = `sidebar:state=${next ? "true" : "false"}; path=/; max-age=${60 * 60 * 24 * 7}`;
          } catch (e) {}
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setSidebarCookie = (open: boolean) => {
    try {
      document.cookie = `sidebar:state=${open ? "true" : "false"}; path=/; max-age=${60 * 60 * 24 * 7}`;
    } catch (e) {}
  };

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "text-primary-foreground bg-primary/70" : "text-foreground/90 hover:text-foreground hover:bg-foreground/5"}`;

  const mobileNavItem = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive ? "text-primary-foreground bg-primary/70" : "text-foreground/80 hover:text-foreground hover:bg-foreground/10"}`;

  const toggleMobileMenu = () => setIsMobileMenuOpen((s) => !s);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const signOut = () => navigate("/auth/login");

  const location = useLocation();
  const isLanding = location.pathname === "/";

  // focus trap for mobile drawer
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const focusable = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const modal = document.querySelector('[data-mobile-sidebar]');
    if (!modal) return;
    const nodes = Array.from(modal.querySelectorAll(focusable)) as HTMLElement[];
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
      if (e.key === "Escape") closeMobileMenu();
    };
    document.addEventListener("keydown", onKey);
    try {
      first?.focus();
    } catch (e) {}
    return () => document.removeEventListener("keydown", onKey);
  }, [isMobileMenuOpen]);

  if (isLanding) return null; // hide sidebar on landing page

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        data-sidebar="sidebar"
        className={`hidden md:flex flex-col h-screen sticky top-0 z-[1200] transition-all duration-300 sidebar-glass ${isCollapsed ? "w-16" : "w-60"}`}
        aria-label="Primary sidebar"
      >
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-3" aria-label="YatraRakshak — Home">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">Y</span>
            </div>
            {!isCollapsed && <span className="font-extrabold tracking-tight">YatraRakshak</span>}
          </Link>

          {!isCollapsed ? (
            <button
              aria-label="Collapse sidebar"
              onClick={() => {
                setIsCollapsed(true);
                setSidebarCookie(false);
              }}
              className="p-2 rounded-md hover:bg-foreground/5"
            >
              <ChevronsLeft size={18} />
            </button>
          ) : (
            <button
              aria-label="Expand sidebar"
              onClick={() => {
                setIsCollapsed(false);
                setSidebarCookie(true);
              }}
              className="p-2 rounded-md hover:bg-foreground/5"
            >
              <ChevronsRight size={18} />
            </button>
          )}
        </div>

        <nav role="navigation" aria-label="Primary" data-sidebar="menu" className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          <Tooltip>
            <NavLink to="/" className={navItem} aria-label={t("nav.home") as string}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">
                  <Home size={18} />
                  {!isCollapsed && <span>{t("nav.home")}</span>}
                </div>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent>{t("nav.home")}</TooltipContent>}
            </NavLink>
          </Tooltip>

          <Tooltip>
            <NavLink to="/tourist/dashboard" className={navItem} aria-label={t("nav.tourist") as string}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">
                  <Users size={18} />
                  {!isCollapsed && <span>{t("nav.tourist")}</span>}
                </div>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent>{t("nav.tourist")}</TooltipContent>}
            </NavLink>
          </Tooltip>

          <Tooltip>
            <NavLink to="/police/dashboard" className={navItem} aria-label={t("nav.police") as string}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">
                  <Shield size={18} />
                  {!isCollapsed && <span>{t("nav.police")}</span>}
                </div>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent>{t("nav.police")}</TooltipContent>}
            </NavLink>
          </Tooltip>

          <Tooltip>
            <NavLink to="/admin" className={navItem} aria-label={t("nav.admin") as string}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">
                  <Users size={18} />
                  {!isCollapsed && <span>{t("nav.admin")}</span>}
                </div>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent>{t("nav.admin")}</TooltipContent>}
            </NavLink>
          </Tooltip>

          <div className="border-t border-sidebar-border my-2" />

          <Tooltip>
            <NavLink to="/settings" className={navItem} aria-label="Settings">
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3">
                  <Settings size={18} />
                  {!isCollapsed && <span>Settings</span>}
                </div>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent>Settings</TooltipContent>}
            </NavLink>
          </Tooltip>
        </nav>

        <div className="px-3 py-3 border-t border-sidebar-border">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    aria-label="Toggle language"
                    onClick={() => i18n.changeLanguage(i18n.language === "en" ? "hi" : "en")}
                    className="touch-target px-3 py-1 rounded-md bg-foreground/5 hover:bg-foreground/7 text-sm"
                  >
                    {i18n.language === "en" ? "EN" : "हिं"}
                  </button>
                </div>

                <div>
                  <button
                    aria-label="Toggle dark mode"
                    onClick={() => setIsDark(!isDark)}
                    className="touch-target p-2 rounded-md bg-foreground/5 hover:bg-foreground/7"
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <button onClick={signOut} className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-md text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <LogOut size={18} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Toggle language"
                    onClick={() => i18n.changeLanguage(i18n.language === "en" ? "hi" : "en")}
                    className="touch-target p-2 rounded-md bg-foreground/5 hover:bg-foreground/7"
                  >
                    {i18n.language === "en" ? "EN" : "हिं"}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Toggle language</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label="Sign out" onClick={signOut} className="touch-target p-2 rounded-md bg-foreground/5 text-destructive hover:bg-foreground/7">
                    <LogOut size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Toggle dark mode"
                    onClick={() => setIsDark(!isDark)}
                    className="touch-target p-2 rounded-md bg-foreground/5 hover:bg-foreground/7"
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Toggle dark mode</TooltipContent>
              </Tooltip>
            </div>
          )}

          <div className="md:hidden mt-2">
            <button
              aria-label="Toggle mobile menu"
              onClick={toggleMobileMenu}
              className="touch-target p-2 rounded-md bg-foreground/5 hover:bg-foreground/7"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile fixed hamburger */}
      <button
        aria-label="Open menu"
        onClick={toggleMobileMenu}
        className="md:hidden fixed top-4 left-4 z-[1250] p-2 rounded-md sidebar-glass-strong shadow-md text-foreground/90 ring-1 ring-border/40"
      >
        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile off-canvas drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[1240] md:hidden"
          >
            <div className="absolute inset-0 bg-black/50 z-[1240]" onClick={closeMobileMenu} />

            <motion.nav
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="fixed left-0 top-0 bottom-0 w-64 sidebar-glass z-[1250] flex flex-col"
              data-mobile-sidebar
            >
              <div className="p-4 flex items-center justify-between">
                <Link to="/" onClick={closeMobileMenu} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-white font-bold text-sm">Y</span>
                  </div>
                  <span className="font-extrabold tracking-tight">YatraRakshak</span>
                </Link>
                <button onClick={closeMobileMenu} className="p-2 rounded-md" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>

              <div className="px-4 py-3 space-y-1 overflow-y-auto flex-1">
                <NavLink to="/" className={mobileNavItem} onClick={closeMobileMenu}>
                  {t("nav.home")}
                </NavLink>
                <NavLink to="/tourist/dashboard" className={mobileNavItem} onClick={closeMobileMenu}>
                  {t("nav.tourist")}
                </NavLink>
                <NavLink to="/police/dashboard" className={mobileNavItem} onClick={closeMobileMenu}>
                  {t("nav.police")}
                </NavLink>
                <NavLink to="/admin" className={mobileNavItem} onClick={closeMobileMenu}>
                  {t("nav.admin")}
                </NavLink>
                <NavLink to="/settings" className={mobileNavItem} onClick={closeMobileMenu}>
                  Settings
                </NavLink>
              </div>

              <div className="p-4 border-t">
                <button
                  onClick={() => {
                    closeMobileMenu();
                    signOut();
                  }}
                  className="w-full px-4 py-3 rounded-md text-base font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sign out
                </button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function NavBarSlideHandle(): JSX.Element | null {
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem("navbar:collapsed") === "1";
    } catch (e) {
      return false;
    }
  });

  const location = useLocation();
  const isLanding = location.pathname === "/";

  useEffect(() => {
    const onStorage = () => {
      try {
        setVisible(localStorage.getItem("navbar:collapsed") === "1");
      } catch (e) {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!visible || isLanding) return null;

  const openSidebar = () => {
    try {
      localStorage.setItem("navbar:collapsed", "0");
      document.cookie = `sidebar:state=true; path=/; max-age=${60 * 60 * 24 * 7}`;
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  return (
      <button
        aria-label="Open sidebar"
        onClick={openSidebar}
        className="hidden md:flex fixed left-0 top-1/2 z-[1250] -translate-y-1/2 sidebar-slide-handle shadow-md hover:opacity-95"
      >
      <ChevronsLeft size={16} />
    </button>
  );
}
