"use client";

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  Wallet, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Shield,
  Key,
  Globe
} from "lucide-react";

interface WalletInfo {
  address: string;
  balance: string;
  authorityRole?: string;
}

interface LoginResponse {
  token: string;
  role: string;
  userId: string;
  user: {
    name: string;
    email: string;
    role: string;
    authType: string;
    sessionId?: string;
    walletInfo?: WalletInfo;
  };
}

interface BlockchainHealth {
  connected: boolean;
  contractAddress?: string;
  networkId?: string;
  chainId?: string;
  totalIDs?: number;
  activeIDs?: number;
  adminBalance?: string;
  lastChecked: string;
}

export default function EnhancedAdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/admin";
  
  // Form states
  const [authType, setAuthType] = useState<"password" | "wallet">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletPrivateKey, setWalletPrivateKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blockchainHealth, setBlockchainHealth] = useState<BlockchainHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  
  const checkBlockchainHealth = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('/api/admin/blockchain/health');
      if (response.ok) {
        const health: BlockchainHealth = await response.json();
        setBlockchainHealth(health);
      }
    } catch (error) {
      console.warn('Failed to check blockchain health:', error);
    } finally {
      setHealthLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const payload = {
        authType,
        ...(authType === "password" ? { email, password } : { walletPrivateKey })
      };
      
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const loginData: LoginResponse = data;
        
        // Store authentication token
        localStorage.setItem("adminToken", loginData.token);
        localStorage.setItem("adminUser", JSON.stringify(loginData.user));
        
        // Navigate to the intended page or admin dashboard
        navigate(from, { replace: true });
      } else {
        setError(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const validatePrivateKey = (key: string): { isValid: boolean; message?: string } => {
    if (!key) return { isValid: false, message: "Private key is required" };
    
    const cleanKey = key.startsWith('0x') ? key : `0x${key}`;
    if (cleanKey.length !== 66) {
      return { isValid: false, message: "Private key must be 64 hexadecimal characters" };
    }
    
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(cleanKey)) {
      return { isValid: false, message: "Invalid hexadecimal format" };
    }
    
    return { isValid: true };
  };
  
  // Check blockchain health on component mount
  useEffect(() => {
    checkBlockchainHealth();
  }, []);
  
  const privateKeyValidation = validatePrivateKey(walletPrivateKey);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">YatraRakshak</h1>
          </div>
          <p className="text-gray-300">Admin Authentication Portal</p>
        </motion.div>
        
        {/* Blockchain Health Status */}
        {blockchainHealth && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-3">
                  <div className={`h-3 w-3 rounded-full ${blockchainHealth.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      Blockchain Network
                    </div>
                    <div className="text-xs text-gray-400">
                      {blockchainHealth.connected ? 'Connected' : 'Disconnected'}
                      {blockchainHealth.networkId && ` • Network ID: ${blockchainHealth.networkId}`}
                    </div>
                  </div>
                  {blockchainHealth.connected && (
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      <Globe className="h-3 w-3 mr-1" />
                      Online
                    </Badge>
                  )}
                </div>
                {blockchainHealth.connected && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>Total IDs: {blockchainHealth.totalIDs || 0}</div>
                    <div>Active: {blockchainHealth.activeIDs || 0}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-gray-900/50 backdrop-blur border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Admin Login</CardTitle>
              <CardDescription className="text-gray-400">
                Choose your authentication method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authType} onValueChange={(value) => setAuthType(value as "password" | "wallet")}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                  <TabsTrigger value="password" className="data-[state=active]:bg-gray-700">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="data-[state=active]:bg-gray-700">
                    <Wallet className="h-4 w-4 mr-2" />
                    Wallet
                  </TabsTrigger>
                </TabsList>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <TabsContent value="password" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@yatrarakshak.com"
                          className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                          required={authType === "password"}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                          required={authType === "password"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="wallet" className="space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label htmlFor="privateKey" className="text-gray-300 flex items-center space-x-2">
                        <Key className="h-4 w-4" />
                        <span>Wallet Private Key</span>
                      </Label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                          id="privateKey"
                          type={showPrivateKey ? "text" : "password"}
                          value={walletPrivateKey}
                          onChange={(e) => setWalletPrivateKey(e.target.value)}
                          placeholder="0x..." 
                          className={`pl-10 pr-10 bg-gray-800 border-gray-700 text-white placeholder-gray-500 ${
                            walletPrivateKey && !privateKeyValidation.isValid ? 'border-red-500' : ''
                          }`}
                          required={authType === "wallet"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                        >
                          {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {/* Private Key Validation Feedback */}
                      {walletPrivateKey && (
                        <div className="flex items-center space-x-2 text-sm">
                          {privateKeyValidation.isValid ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-green-400">Valid private key format</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-400">{privateKeyValidation.message}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Wallet Authentication Info */}
                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-300 space-y-1">
                          <p><strong>Wallet Authentication:</strong></p>
                          <ul className="list-disc list-inside space-y-0.5 ml-2">
                            <li>Use your Ganache Account 0 private key</li>
                            <li>Must have admin authority on smart contract</li>
                            <li>Requires minimum 0.1 ETH balance</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  {error && (
                    <Alert className="bg-red-900/20 border-red-800">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button
                    type="submit"
                    disabled={loading || (authType === "wallet" && !privateKeyValidation.isValid)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        {authType === "password" ? (
                          <><Mail className="h-4 w-4 mr-2" />Sign In</>
                        ) : (
                          <><Wallet className="h-4 w-4 mr-2" />Connect Wallet</>
                        )}
                      </>
                    )}
                  </Button>
                </form>
              </Tabs>
              
              <Separator className="my-4 bg-gray-700" />
              
              {/* Health Check Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={checkBlockchainHealth}
                disabled={healthLoading}
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                {healthLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Check Blockchain Status
              </Button>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-xs text-gray-500"
        >
          <p>YatraRakshak Admin Portal • Secure Blockchain Authentication</p>
          <p className="mt-1">Network: Ganache Local • Chain ID: 1337</p>
        </motion.div>
      </div>
    </div>
  );
}