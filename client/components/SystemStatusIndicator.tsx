import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  WifiOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useBlockchainMonitoring } from '@/hooks/useBlockchainMonitoring';
import { useAuth } from '@/contexts/AuthContext';

interface SystemStatusIndicatorProps {
  showDetailed?: boolean;
  compact?: boolean;
  className?: string;
}

export default function SystemStatusIndicator({
  showDetailed = false,
  compact = false,
  className = ''
}: SystemStatusIndicatorProps) {
  const { user } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [hasShownOfflineAlert, setHasShownOfflineAlert] = useState(false);
  
  const {
    connectionStatus,
    health,
    isConnected,
    isOffline,
    getNetworkStatus
  } = useBlockchainMonitoring({
    enableRealTimeUpdates: true,
    pollingInterval: 60000 // Check every minute
  });

  // Show alert when going offline (only once per session)
  useEffect(() => {
    if (isOffline && !hasShownOfflineAlert && user?.role === 'tourist') {
      setShowAlert(true);
      setHasShownOfflineAlert(true);
    }
  }, [isOffline, hasShownOfflineAlert, user?.role]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'online': return <CheckCircle className="w-3 h-3" />;
      case 'degraded': return <AlertTriangle className="w-3 h-3" />;
      case 'offline': return <WifiOff className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusText = () => {
    if (compact) {
      switch (connectionStatus) {
        case 'online': return 'OK';
        case 'degraded': return 'LIMITED';
        case 'offline': return 'OFFLINE';
        default: return 'UNKNOWN';
      }
    }
    return getNetworkStatus();
  };

  if (compact) {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
          connectionStatus === 'online' ? 'animate-pulse' : ''
        }`} />
        <span className="text-xs font-medium">{getStatusText()}</span>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge 
          variant={isOffline ? 'destructive' : isConnected ? 'default' : 'secondary'}
          className="flex items-center gap-1 text-xs"
        >
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </Badge>
        
        {showDetailed && health && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>IDs: {health.blockchain.activeIDs || 0}</span>
            {health.responseTime && (
              <span>• {health.responseTime}ms</span>
            )}
          </div>
        )}
      </div>

      {/* Offline Alert */}
      <AnimatePresence>
        {showAlert && isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <Alert variant="destructive" className="shadow-lg border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AlertDescription>
                    <strong>Blockchain Service Offline</strong>
                    <br />
                    Some features may be limited. Your Digital ID verification is temporarily unavailable.
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-destructive-foreground hover:bg-destructive/20"
                  onClick={() => setShowAlert(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Quick status component for footers or sidebars
export function QuickStatusIndicator() {
  const { connectionStatus, health } = useBlockchainMonitoring({
    enableRealTimeUpdates: true,
    pollingInterval: 30000
  });

  return (
    <div className="flex items-center justify-between p-2 text-xs border rounded-lg bg-muted/50">
      <span className="text-muted-foreground">System Status</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'online' ? 'bg-green-500 animate-pulse' :
          connectionStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
        <span className="font-medium">
          {connectionStatus === 'online' ? 'Operational' :
           connectionStatus === 'degraded' ? 'Limited' : 'Offline'}
        </span>
        {health?.blockchain.activeIDs !== undefined && (
          <span className="text-muted-foreground">
            • {health.blockchain.activeIDs} IDs
          </span>
        )}
      </div>
    </div>
  );
}

// Mini status for navigation bars
export function MiniStatusIndicator() {
  const { connectionStatus } = useBlockchainMonitoring({
    enableRealTimeUpdates: true,
    pollingInterval: 60000
  });

  const getColor = () => {
    switch (connectionStatus) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full ${getColor()} ${
        connectionStatus === 'online' ? 'animate-pulse' : ''
      }`} />
      <span className="text-xs text-muted-foreground capitalize">
        {connectionStatus}
      </span>
    </div>
  );
}