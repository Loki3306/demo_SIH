import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Shield } from "lucide-react";

export default function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      if (!res.ok) {
        throw new Error("Login failed");
      }
      
      const data = await res.json();
      
      // Store authentication data (in a real app, use proper auth context)
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_id", data.userId);
      localStorage.setItem("user_role", data.role);
      
      // Redirect based on role
      switch (data.role) {
        case "tourist":
          navigate("/profile");
          break;
        case "admin":
          navigate("/admin");
          break;
        case "police":
          navigate("/police/dashboard");
          break;
        default:
          navigate("/");
      }
      
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `demo@${role}.com`, role }),
      });
      
      const data = await res.json();
      
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_id", data.userId);
      localStorage.setItem("user_role", data.role);
      
      switch (role) {
        case "tourist":
          navigate("/profile");
          break;
        case "admin":
          navigate("/admin");
          break;
        case "police":
          navigate("/police/dashboard");
          break;
        default:
          navigate("/");
      }
      
    } catch (err: any) {
      setError("Quick login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-8 max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <p className="text-muted-foreground">Sign in to your YatraRakshak account</p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium"
                  onClick={() => navigate("/auth/register")}
                >
                  Create Digital ID
                </Button>
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground font-medium">Quick Access (Demo)</p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin("tourist")}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Tourist Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin("admin")}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleQuickLogin("police")}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Police Dashboard
                </Button>
              </div>
            </div>
            
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Demo Note:</strong> This is a development environment. 
                Use quick access buttons or any email/password combination for testing.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
