import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Shield, 
  Download, 
  Share2, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertTriangle,
  QrCode,
  Phone,
  Mail,
  Calendar,
  FileText,
  MapPin
} from "lucide-react";

interface TouristProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  itinerary?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  documentType?: "aadhaar" | "passport";
  documentNumber?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "archived";
  applicationDate?: string;
  blockchainId?: string;
  qrCodeData?: string;
  blockchainStatus?: string;
  transactionHash?: string;
  history?: Array<{
    action: string;
    admin?: string;
    notes?: string;
    timestamp: string;
  }>;
}

interface DigitalIDData {
  userId: string;
  blockchainId?: string;
  verificationStatus: string;
  qrCodeData?: string;
  blockchainStatus?: string;
  transactionHash?: string;
  applicationDate?: string;
  blockchainVerification?: {
    valid: boolean;
    issuedAt?: string;
    expiresAt?: string;
    onChain?: boolean;
    error?: string;
  };
}

export default function MyProfile() {
  const [profile, setProfile] = useState<TouristProfile | null>(null);
  const [digitalID, setDigitalID] = useState<DigitalIDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Mock user ID - in real app, get from authentication context
  const userId = "t123";
  
  useEffect(() => {
    fetchProfileData();
  }, []);
  
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch profile data
      const profileRes = await fetch(`/api/tourist/profile/${userId}`);
      if (!profileRes.ok) {
        throw new Error('Failed to fetch profile data');
      }
      const profileData = await profileRes.json();
      setProfile(profileData);
      
      // Fetch digital ID data
      const digitalIDRes = await fetch(`/api/tourist/digital-id/${userId}`);
      if (!digitalIDRes.ok) {
        throw new Error('Failed to fetch digital ID data');
      }
      const digitalIDData = await digitalIDRes.json();
      setDigitalID(digitalIDData);
      
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshBlockchainStatus = async () => {
    if (!digitalID?.blockchainId) return;
    
    setRefreshing(true);
    try {
      const res = await fetch(`/api/blockchain/verify-id?blockchainId=${digitalID.blockchainId}`);
      if (res.ok) {
        const data = await res.json();
        setDigitalID(prev => prev ? {
          ...prev,
          blockchainVerification: {
            valid: data.valid,
            issuedAt: data.issuedAt,
            expiresAt: data.expiresAt,
            onChain: data.onChain
          }
        } : null);
      }
    } catch (err) {
      console.error('Failed to refresh blockchain status:', err);
    } finally {
      setRefreshing(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      case 'archived': return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-400';
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'archived': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };
  
  const downloadQRCode = () => {
    if (!digitalID?.qrCodeData) return;
    
    const link = document.createElement('a');
    link.href = digitalID.qrCodeData;
    link.download = `yatrarakshak-digital-id-${digitalID.userId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const shareDigitalID = async () => {
    if (!digitalID?.blockchainId) return;
    
    const shareData = {
      title: 'YatraRakshak Digital Tourist ID',
      text: `Verify my Digital Tourist ID: ${digitalID.blockchainId}`,
      url: `https://yatrarakshak.verify/${digitalID.blockchainId}`
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url);
      alert('Verification URL copied to clipboard!');
    }
  };
  
  if (loading) {
    return (
      <main className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </main>
    );
  }
  
  if (error || !profile) {
    return (
      <main className="container mx-auto py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Profile not found'}
          </AlertDescription>
        </Alert>
      </main>
    );
  }
  
  return (
    <main className="container mx-auto py-8 max-w-4xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your Digital Tourist ID and profile information</p>
          </div>
          <Button variant="outline" onClick={fetchProfileData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Digital ID Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Digital Tourist ID</CardTitle>
                  <p className="text-primary-foreground/80">YatraRakshak Verified Identity</p>
                </div>
              </div>
              <Badge className={`${getStatusColor(profile.verificationStatus)} border-0`}>
                {getStatusIcon(profile.verificationStatus)}
                <span className="ml-1 capitalize">{profile.verificationStatus}</span>
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {profile.verificationStatus === 'verified' && digitalID ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Left Column - Profile Info */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Personal Information</span>
                    </div>
                    <div className="pl-6 space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{profile.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Document Type</p>
                        <p className="font-medium capitalize">{profile.documentType || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Document Number</p>
                        <p className="font-medium">{profile.documentNumber || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {digitalID.blockchainId && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Blockchain Information</span>
                      </div>
                      <div className="pl-6 space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Blockchain ID</p>
                          <p className="font-mono text-sm">{digitalID.blockchainId}</p>
                        </div>
                        {digitalID.transactionHash && (
                          <div>
                            <p className="text-sm text-muted-foreground">Transaction Hash</p>
                            <p className="font-mono text-sm break-all">{digitalID.transactionHash}</p>
                          </div>
                        )}
                        {digitalID.blockchainVerification && (
                          <div>
                            <p className="text-sm text-muted-foreground">Expires</p>
                            <p className="text-sm">{digitalID.blockchainVerification.expiresAt ? new Date(digitalID.blockchainVerification.expiresAt).toLocaleDateString() : 'Unknown'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Column - QR Code */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  {digitalID.qrCodeData ? (
                    <>
                      <div className="p-4 bg-white rounded-lg shadow-sm border">
                        <img 
                          src={digitalID.qrCodeData} 
                          alt="Digital ID QR Code" 
                          className="w-32 h-32"
                        />
                      </div>
                      <p className="text-sm text-center text-muted-foreground max-w-xs">
                        Scan this QR code to verify your Digital Tourist ID
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={downloadQRCode}>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline" onClick={shareDigitalID}>
                          <Share2 className="w-4 h-4 mr-1" />
                          Share
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={refreshBlockchainStatus}
                          disabled={refreshing}
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                          Verify
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">QR Code will be available after verification</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Verification in Progress</h3>
                <p className="text-muted-foreground mb-4">
                  Your Digital Tourist ID application is being reviewed. You'll receive an email notification once verification is complete.
                </p>
                <p className="text-sm text-muted-foreground">
                  Application submitted: {profile.applicationDate ? new Date(profile.applicationDate).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Profile Details */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email</span>
                </div>
                <p className="font-medium">{profile.email}</p>
              </div>
              
              {profile.phone && (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Phone</span>
                  </div>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              )}
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Emergency Contact</h4>
                {profile.emergencyName && (
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Name:</span> {profile.emergencyName}
                    </p>
                    {profile.emergencyPhone && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Phone:</span> {profile.emergencyPhone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Travel Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Travel Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.itinerary ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Planned Itinerary</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{profile.itinerary}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No travel information provided</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Application History */}
        {profile.history && profile.history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Application History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.history.map((entry, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                      {entry.admin && (
                        <p className="text-xs text-muted-foreground">By: {entry.admin}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </main>
  );
}