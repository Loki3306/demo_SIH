import React, { useEffect, useState } from "react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type UserSettings = {
  language?: string;
  theme?: "light" | "dark" | "system";
  sidebarCollapsed?: boolean;
  compactMode?: boolean;
  notifications?: { email?: boolean; sms?: boolean };
  privacy?: { profileVisibility?: "public" | "private" };
};

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    language: "en",
    theme: "system",
    sidebarCollapsed: false,
    compactMode: false,
    notifications: { email: true, sms: false },
    privacy: { profileVisibility: "public" },
  });
  const [loading, setLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>({ maintenanceMode: false, blockchainMock: true });
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const { isDark, setIsDark } = useDarkMode();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Detect admin flag by header-less check -- in demo we can ask server
    async function load() {
      setLoading(true);
      try {
        const r = await fetch("/api/user/settings");
        if (r.ok) {
          const j = await r.json();
          setSettings((s) => ({ ...s, ...j }));
        }

        const ar = await fetch("/api/admin/settings");
        if (ar.ok) {
          const aj = await ar.json();
          setAdminSettings(aj);
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveUser = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (r.ok) {
        // Persist locally for settings that affect UI immediately (e.g. sidebar collapse, theme, language)
        try {
          if (typeof window !== "undefined") {
            if (settings.sidebarCollapsed !== undefined) {
              localStorage.setItem("navbar:collapsed", settings.sidebarCollapsed ? "1" : "0");
              // also set cookie for other parts that read it
              document.cookie = `sidebar:state=${settings.sidebarCollapsed ? "true" : "false"}; path=/; max-age=${60 * 60 * 24 * 7}`;
              // notify other parts of the app to apply settings immediately
              try {
                window.dispatchEvent(new CustomEvent("settings:updated", { detail: { settings } }));
              } catch (e) {}
            }
            // Apply theme immediately
            if (settings.theme) {
              try {
                if (settings.theme === "dark") {
                  setIsDark(true);
                  localStorage.setItem("theme", "dark");
                } else if (settings.theme === "light") {
                  setIsDark(false);
                  localStorage.setItem("theme", "light");
                } else if (settings.theme === "system") {
                  // remove explicit preference, use system preference
                  localStorage.removeItem("theme");
                  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                  setIsDark(prefersDark);
                }
              } catch (e) {}
            }

            // Apply language immediately
            if (settings.language) {
              try {
                i18n.changeLanguage(settings.language as any);
              } catch (e) {}
            }
          }
        } catch (e) {}

        toast({ title: "Saved", description: "Settings saved" });
      } else {
        toast({ title: "Error", description: "Failed to save settings" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save settings" });
    } finally {
      setLoading(false);
    }
  };

  const saveAdmin = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin": "admin-dev" },
        body: JSON.stringify(adminSettings),
      });
      if (r.ok) {
        toast({ title: "Saved", description: "Admin settings saved" });
      } else {
        toast({ title: "Error", description: "Failed to save admin settings" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save admin settings" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-8 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground">Language</label>
                <div className="mt-2">
                  <Select value={settings.language} onValueChange={(v) => setSettings(s => ({ ...s, language: v }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिंदी</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground">Theme</label>
                <div className="mt-2">
                  <Select value={settings.theme} onValueChange={(v) => setSettings(s => ({ ...s, theme: v as any }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!settings.sidebarCollapsed} onCheckedChange={(v) => setSettings(s => ({ ...s, sidebarCollapsed: v }))} />
                <div>
                  <div className="text-sm font-medium">Collapse sidebar by default</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!settings.compactMode} onCheckedChange={(v) => setSettings(s => ({ ...s, compactMode: v }))} />
                <div>
                  <div className="text-sm font-medium">Compact mode</div>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={saveUser} disabled={loading}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={!!settings.notifications?.email} onCheckedChange={(v) => setSettings(s => ({ ...s, notifications: { ...(s.notifications ?? {}), email: v } }))} />
                <div>
                  <div className="text-sm font-medium">Email alerts</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={!!settings.notifications?.sms} onCheckedChange={(v) => setSettings(s => ({ ...s, notifications: { ...(s.notifications ?? {}), sms: v } }))} />
                <div>
                  <div className="text-sm font-medium">SMS alerts</div>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={saveUser} disabled={loading}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground">Profile visibility</label>
                <div className="mt-2">
                  <Select value={settings.privacy?.profileVisibility} onValueChange={(v) => setSettings(s => ({ ...s, privacy: { ...(s.privacy ?? {}), profileVisibility: v as any } }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={saveUser} disabled={loading}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={!!adminSettings.blockchainMock} onCheckedChange={(v) => setAdminSettings(a => ({ ...a, blockchainMock: v }))} />
                <div>
                  <div className="text-sm font-medium">Blockchain mock mode (admin)</div>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={saveAdmin} disabled={loading}>Save (Admin)</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={!!adminSettings.maintenanceMode} onCheckedChange={(v) => setAdminSettings(a => ({ ...a, maintenanceMode: v }))} />
                <div>
                  <div className="text-sm font-medium">Maintenance mode (admin)</div>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={saveAdmin} disabled={loading}>Save (Admin)</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
