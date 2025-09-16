import { Link, NavLink } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NavBar() {
  const { isDark, setIsDark } = useDarkMode();
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? "text-primary-foreground bg-primary/70" : "text-foreground/80 hover:text-foreground hover:bg-foreground/10"
    }`;

  const mobileNavItem = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
      isActive ? "text-primary-foreground bg-primary/70" : "text-foreground/80 hover:text-foreground hover:bg-foreground/10"
    }`;

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b border-border/20 bg-background/30">
      <div className="container mx-auto flex items-center justify-between py-3 mobile-padding">
        <Link to="/" className="flex items-center gap-2" aria-label="YatraRakshak — Home">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-sm">Y</span>
          </div>
          <span className="font-extrabold tracking-tight text-lg hidden sm:block">YatraRakshak</span>
          <span className="font-extrabold tracking-tight text-base sm:hidden">YR</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" className={navItem}>{t("nav.home")}</NavLink>
          <NavLink to="/tourist/dashboard" className={navItem}>{t("nav.tourist")}</NavLink>
          <NavLink to="/police/dashboard" className={navItem}>{t("nav.police")}</NavLink>
          <NavLink to="/admin" className={navItem}>{t("nav.admin")}</NavLink>
        </nav>
        
        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-2">
          <button
            aria-label="Toggle language"
            onClick={() => i18n.changeLanguage(i18n.language === "en" ? "hi" : "en")}
            className="touch-target px-3 py-2 rounded-md bg-foreground/10 hover:bg-foreground/20 text-sm transition-colors"
          >
            {i18n.language === "en" ? "EN" : "हिं"}
          </button>
          <button
            aria-label="Toggle dark mode"
            onClick={() => setIsDark(!isDark)}
            className="touch-target p-2 rounded-md bg-foreground/10 hover:bg-foreground/20 transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link 
            to="/auth/login" 
            className="ml-2 px-4 py-2 rounded-md bg-primary text-primary-foreground shadow-[0_0_20px_rgba(99,102,241,.6)] hover:bg-primary/90 transition-colors"
          >
            {t("ctaLogin")}
          </Link>
        </div>
        
        {/* Mobile Controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            aria-label="Toggle language"
            onClick={() => i18n.changeLanguage(i18n.language === "en" ? "hi" : "en")}
            className="touch-target px-2 py-1 rounded text-xs bg-foreground/10 hover:bg-foreground/20 transition-colors"
          >
            {i18n.language === "en" ? "EN" : "हिं"}
          </button>
          <button
            aria-label="Toggle dark mode"
            onClick={() => setIsDark(!isDark)}
            className="touch-target p-2 rounded-md bg-foreground/10 hover:bg-foreground/20 transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            aria-label="Toggle mobile menu"
            onClick={toggleMobileMenu}
            className="touch-target p-2 rounded-md bg-foreground/10 hover:bg-foreground/20 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border/20 bg-background/40 backdrop-blur-md"
          >
            <nav className="container mx-auto mobile-padding py-4 space-y-2">
              <NavLink 
                to="/" 
                className={mobileNavItem}
                onClick={closeMobileMenu}
              >
                {t("nav.home")}
              </NavLink>
              <NavLink 
                to="/tourist/dashboard" 
                className={mobileNavItem}
                onClick={closeMobileMenu}
              >
                {t("nav.tourist")}
              </NavLink>
              <NavLink 
                to="/police/dashboard" 
                className={mobileNavItem}
                onClick={closeMobileMenu}
              >
                {t("nav.police")}
              </NavLink>
              <NavLink 
                to="/admin" 
                className={mobileNavItem}
                onClick={closeMobileMenu}
              >
                {t("nav.admin")}
              </NavLink>
              <div className="pt-2 border-t border-border/20">
                <Link 
                  to="/auth/login" 
                  className="block w-full text-center px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-colors"
                  onClick={closeMobileMenu}
                >
                  {t("ctaLogin")}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
