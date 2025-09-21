import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Shield, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function EnhancedAuthLogin() {
  // Tourist login state
  const [touristForm, setTouristForm] = useState({
    specialId: "",
    password: "",
    showPassword: false
  });
  
  // Admin login state
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
    showPassword: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatingSpecialId, setValidatingSpecialId] = useState(false);
  const [specialIdStatus, setSpecialIdStatus] = useState<{
    exists: boolean;
    canLogin: boolean;
    accountStatus?: string;
  } | null>(null);
  
  const navigate = useNavigate();

  const handleTouristLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/tourist-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          specialId: touristForm.specialId,
          password: touristForm.password
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      
      // Store authentication data
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_id", data.userId);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("special_login_id", data.specialLoginId);
      
      // Redirect to tourist dashboard
      navigate("/tourist/dashboard");
      
    } catch (err: any) {
      if (err.message.includes('account_locked')) {
        setError("Account temporarily locked due to too many failed attempts. Please try again later.");
      } else if (err.message.includes('account_not_verified')) {
        setError("Your account is still under review. Please contact admin for status update.");
      } else {
        setError(err.message || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: adminForm.email,
          password: adminForm.password
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }
      
      // Store authentication data
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_id", data.userId);
      localStorage.setItem("user_role", data.role);
      
      // Redirect to admin panel
      navigate("/admin");
      
    } catch (err: any) {
      if (err.message.includes('account_locked')) {
        setError("Account temporarily locked due to too many failed attempts. Please try again later.");
      } else {
        setError(err.message || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const validateSpecialId = async (specialId: string) => {
    if (!specialId || specialId.length < 10) {
      setSpecialIdStatus(null);
      return;
    }
    
    setValidatingSpecialId(true);
    
    try {
      const res = await fetch("/api/auth/validate-special-id", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ specialId }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSpecialIdStatus({
          exists: data.exists,
          canLogin: data.canLogin,
          accountStatus: data.accountStatus
        });
      } else {
        setSpecialIdStatus(null);
      }
    } catch (error) {
      setSpecialIdStatus(null);
    } finally {
      setValidatingSpecialId(false);
    }
  };

  const handleSpecialIdChange = (value: string) => {
    setTouristForm(prev => ({ ...prev, specialId: value }));
    
    // Debounce validation
    setTimeout(() => {
      validateSpecialId(value);
    }, 500);
  };

  const getSpecialIdStatusMessage = () => {
    if (!specialIdStatus || !touristForm.specialId) return null;
    
    if (!specialIdStatus.exists) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Special ID not found. Please contact admin to get your login credentials.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (!specialIdStatus.canLogin) {
      let message = "Account is not ready for login.";
      
      switch (specialIdStatus.accountStatus) {
        case "pending":
          message = "Your application is still under review. You'll be notified when approved.";
          break;
        case "rejected":
          message = "Your application has been rejected. Please contact admin for more information.";
          break;
        case "archived":
          message = "Your application has been archived. Please contact admin to reactivate.";
          break;
      }
      
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert>
        <AlertDescription className="text-green-600">
          ✓ Special ID verified. You can proceed with login.
        </AlertDescription>
      </Alert>
    );
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
            <CardTitle className="text-2xl">Welcome to YatraRakshak</CardTitle>
            <p className="text-muted-foreground">Secure authentication for tourists and administrators</p>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="tourist" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tourist">Tourist Login</TabsTrigger>
                <TabsTrigger value="admin">Admin Login</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tourist" className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleTouristLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="specialId">Special Login ID</Label>
                    <Input
                      id="specialId"
                      type="text"
                      placeholder="Enter your special ID (e.g., YR...)"
                      value={touristForm.specialId}
                      onChange={(e) => handleSpecialIdChange(e.target.value)}
                      required
                      className="uppercase"
                    />
                    {validatingSpecialId && (
                      <p className="text-sm text-muted-foreground mt-1">Validating special ID...</p>
                    )}
                  </div>
                  
                  {getSpecialIdStatusMessage()}
                  
                  <div>
                    <Label htmlFor="touristPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="touristPassword"
                        type={touristForm.showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={touristForm.password}
                        onChange={(e) => setTouristForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setTouristForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      >
                        {touristForm.showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || !specialIdStatus?.canLogin}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    {loading ? "Signing in..." : "Sign In as Tourist"}
                  </Button>
                </form>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Don't have a special ID?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium"
                      onClick={() => navigate("/auth/register")}
                    >
                      Apply for Digital ID
                    </Button>
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@yatrarakshak.com"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="adminPassword">Admin Password</Label>
                    <div className="relative">
                      <Input
                        id="adminPassword"
                        type={adminForm.showPassword ? "text" : "password"}
                        placeholder="Enter admin password"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setAdminForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      >
                        {adminForm.showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Shield className="w-4 h-4 mr-2" />
                    {loading ? "Signing in..." : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <Separator className="my-6" />
            
            <Alert>
              <AlertDescription className="text-xs">
                <strong>Security Note:</strong> Your login attempts are monitored for security. 
                Multiple failed attempts will temporarily lock your account.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}