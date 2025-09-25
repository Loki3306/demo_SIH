import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Heart, Globe } from 'lucide-react';
import { QuickStatusIndicator } from '@/components/SystemStatusIndicator';
import { useAuth } from '@/hooks/useAuth';

export default function Footer() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <footer className="border-t border-border/20 bg-background/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto py-8 px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">YatraRakshak</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Empowering safe and secure tourism through blockchain-powered Digital Tourist IDs.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="w-3 h-3" />
              Made in India
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Quick Links</h4>
            <nav className="space-y-2">
              <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/verify" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Verify Digital ID
              </Link>
              <Link to="/explore" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Explore India
              </Link>
              {user?.role === 'tourist' && (
                <Link to="/support" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Support & Emergency
                </Link>
              )}
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold">Legal & Support</h4>
            <nav className="space-y-2">
              <Link to="/legal/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/legal/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <a href="mailto:support@yatrarakshak.gov.in" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact Support
              </a>
              <a href="tel:1363" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Tourist Helpline: 1363
              </a>
            </nav>
          </div>

          {/* System Status */}
          <div className="space-y-4">
            <h4 className="font-semibold">System Status</h4>
            <QuickStatusIndicator />
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                <span>Available in English & Hindi</span>
              </div>
              <div>
                <span>24/7 Emergency Support</span>
              </div>
              <div>
                <span>Blockchain-Verified Digital IDs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 YatraRakshak. A Ministry of Tourism, Government of India initiative.
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Powered by Blockchain Technology</span>
            <span>•</span>
            <span>Real-time Safety Monitoring</span>
            <span>•</span>
            <span>Version 2.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}