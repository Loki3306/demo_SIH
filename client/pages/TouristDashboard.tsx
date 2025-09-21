import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  User, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  QrCode,
  MapPin,
  Phone
} from "lucide-react";
import SafetyScoreCard from "@/components/SafetyScoreCard";
import PanicButton from "@/components/PanicButton";
import MapLive from "@/components/MapLive";
import AlertsFeed from "@/components/AlertsFeed";
import UploadBox from "@/components/UploadBox";

interface TouristProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "archived";
  blockchainId?: string;
  applicationDate?: string;
}

interface DigitalIDData {
  userId: string;
  blockchainId?: string;
  verificationStatus: string;
  qrCodeData?: string;
  blockchainStatus?: string;
  applicationDate?: string;
}

export default function TouristDashboard() {
  const [profile, setProfile] = useState<TouristProfile | null>(null);
  const [digitalID, setDigitalID] = useState<DigitalIDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mock user ID - in real app, get from authentication context
  const userId = "t123";
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch profile data
      const profileRes = await fetch(`/api/tourist/profile/${userId}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
      }
      
      // Fetch digital ID data
      const digitalIDRes = await fetch(`/api/tourist/digital-id/${userId}`);
      if (digitalIDRes.ok) {
        const digitalIDData = await digitalIDRes.json();
        setDigitalID(digitalIDData);
      }
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };
  
  return (
    <main className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tourist Dashboard</h1>
          <p className="text-muted-foreground">
            {profile ? `Welcome back, ${profile.name}` : 'Welcome to YatraRakshak'}
          </p>
        </div>
      </div>
      
      {/* Digital ID Status Card */}
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Digital Tourist ID</CardTitle>
                    <p className="text-sm text-muted-foreground">Your verification status</p>
                  </div>
                </div>
                <Badge className={getStatusColor(profile.verificationStatus)}>
                  {getStatusIcon(profile.verificationStatus)}
                  <span className="ml-1 capitalize">{profile.verificationStatus}</span>
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {profile.verificationStatus === 'verified' && digitalID?.blockchainId ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Digital ID Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Blockchain ID</p>
                        <p className="font-mono text-xs">{digitalID.blockchainId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Issued</p>
                        <p>{digitalID.applicationDate ? new Date(digitalID.applicationDate).toLocaleDateString() : 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <QrCode className="w-4 h-4 mr-1" />
                        View QR Code
                      </Button>
                      <Button size="sm" variant="outline">
                        <User className="w-4 h-4 mr-1" />
                        View Full Profile
                      </Button>
                    </div>
                  </div>
                  
                  {digitalID.qrCodeData && (
                    <div className="flex justify-center">
                      <div className="p-2 bg-white rounded-lg shadow-sm border">
                        <img 
                          src={digitalID.qrCodeData} 
                          alt="Digital ID QR Code" 
                          className="w-20 h-20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : profile.verificationStatus === 'pending' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Verification in Progress</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your Digital Tourist ID application is being reviewed. This typically takes 2-3 business days.
                  </p>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Application submitted: {profile.applicationDate ? new Date(profile.applicationDate).toLocaleDateString() : 'Unknown'}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : profile.verificationStatus === 'rejected' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Application Rejected</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your application was rejected. Please check your email for details and reapply with correct information.
                  </p>
                  <Button size="sm" variant="outline">
                    Reapply for Digital ID
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <User className="w-5 h-5" />
                    <span className="font-medium">Get Your Digital ID</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Apply for your Digital Tourist ID to unlock all safety features and benefits.
                  </p>
                  <Button size="sm">
                    Apply for Digital ID
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <SafetyScoreCard score={78} />
          <PanicButton userId={userId} />
          
          {/* Quick Stats */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{profile.name}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Current Location: Delhi</span>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <MapLive />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <AlertsFeed />
          <UploadBox />
        </motion.div>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </main>
  );
}
