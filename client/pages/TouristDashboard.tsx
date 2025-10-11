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
  
  // Location tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Safety score state
  const [safetyScore, setSafetyScore] = useState(100);
  const [scoreFactors, setScoreFactors] = useState<string[]>([]);
  const [isLoadingScore, setIsLoadingScore] = useState(true);
  
  // Authentication disabled for now
  // const [authToken] = useState("demo_token_123"); // Mock token - get from auth context in real app
  
  // Mock user ID - in real app, get from authentication context
  const userId = "t123";
  
  useEffect(() => {
    fetchDashboardData();
    fetchSafetyScore();
  }, []);
  
  const fetchSafetyScore = async () => {
    try {
      setIsLoadingScore(true);
      // This call goes to the Express bridge endpoint
      const response = await fetch(`/api/bridge/aiml/safetyScore?user_id=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setSafetyScore(data.score);
        setScoreFactors(data.factors || []);
      } else {
        console.error("Failed to fetch safety score:", response.statusText);
        // Keep default values on error
      }
    } catch (error) {
      console.error("Error fetching safety score:", error);
      // Keep default values on error
    } finally {
      setIsLoadingScore(false);
    }
  };
  
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

  // Location tracking functions
  const handleStartJourney = async () => {
    try {
      const aimlApiUrl = import.meta.env.VITE_AIML_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${aimlApiUrl}/api/v1/start_journey/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      });

      if (response.ok) {
        setIsTracking(true);
        
        // Start sending location data every 10 seconds
        const interval = setInterval(() => {
          sendLocationData();
        }, 10000);
        
        setTrackingInterval(interval);
        
        // Send initial location immediately
        sendLocationData();
      } else {
        console.error('Failed to start journey:', response.statusText);
        setError('Failed to start journey tracking');
      }
    } catch (error) {
      console.error('Error starting journey:', error);
      setError('Error starting journey tracking');
    }
  };

  const handleEndJourney = async () => {
    try {
      const aimlApiUrl = import.meta.env.VITE_AIML_API_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${aimlApiUrl}/api/v1/end_journey/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      });

      if (response.ok) {
        setIsTracking(false);
        
        // Clear the interval
        if (trackingInterval) {
          clearInterval(trackingInterval);
          setTrackingInterval(null);
        }
      } else {
        console.error('Failed to end journey:', response.statusText);
        setError('Failed to end journey tracking');
      }
    } catch (error) {
      console.error('Error ending journey:', error);
      setError('Error ending journey tracking');
    }
  };

  const sendLocationData = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const aimlApiUrl = import.meta.env.VITE_AIML_API_URL || 'http://127.0.0.1:8000';
          
          const locationData = {
            user_id: userId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: new Date().toISOString(),
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
          };

          const response = await fetch(`${aimlApiUrl}/api/v1/track_location/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData),
          });

          if (!response.ok) {
            console.error('Failed to send location data:', response.statusText);
          } else {
            // Refresh safety score after location update (with a small delay for processing)
            setTimeout(() => {
              fetchSafetyScore();
            }, 2000);
          }
        } catch (error) {
          console.error('Error sending location data:', error);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  // Clean up interval on component unmount
  useEffect(() => {
    return () => {
      if (trackingInterval) {
        clearInterval(trackingInterval);
      }
    };
  }, [trackingInterval]);
  
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
      
      {/* Journey Tracking Card */}
      {profile && profile.verificationStatus === 'verified' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Journey Tracking</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {isTracking ? 'AI-powered safety monitoring active' : 'Start tracking for real-time safety monitoring'}
                    </p>
                  </div>
                </div>
                <Badge className={isTracking ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-400'}>
                  {isTracking ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                      Active
                    </>
                  ) : (
                    'Inactive'
                  )}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our AI system monitors your location patterns to detect anomalies and ensure your safety during your journey.
                </p>
                
                <div className="flex gap-3">
                  {!isTracking ? (
                    <Button 
                      onClick={handleStartJourney}
                      className="flex-1"
                      disabled={loading}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Start Journey
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleEndJourney}
                      variant="destructive"
                      className="flex-1"
                      disabled={loading}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      End Journey
                    </Button>
                  )}
                </div>
                
                {isTracking && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">Location tracking active</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Your location is being monitored every 10 seconds for safety analysis
                    </p>
                  </div>
                )}
              </div>
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
          {isLoadingScore ? (
            <Card className="p-6">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading Safety Score...</p>
              </div>
            </Card>
          ) : (
            <>
              <SafetyScoreCard score={safetyScore} />
              {scoreFactors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Safety Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {scoreFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-muted-foreground">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
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
