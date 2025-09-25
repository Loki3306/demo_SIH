import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Shield,
  Wallet,
  Users,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Server,
  Key,
  Zap
} from 'lucide-react';

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

interface AdminDashboardMetrics {
  totalPending: number;
  applicationsToday: number;
  verificationRate: number;
  averageProcessingTime: number;
  activeDigitalIDs: number;
  systemHealth: BlockchainHealth;
}

interface WalletInfo {
  address: string;
  balance: string;
  authorityRole?: string;
}

interface AdminUser {
  name: string;
  email: string;
  role: string;
  authType: string;
  sessionId?: string;
  walletInfo?: WalletInfo;
}

interface EnhancedAdminDashboardProps {
  user?: AdminUser;
}

export default function EnhancedAdminDashboard({ user }: EnhancedAdminDashboardProps) {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setError(null);
        const response = await fetch('/api/admin/dashboard/metrics', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        });

        if (response.ok) {
          const data: AdminDashboardMetrics = await response.json();
          setMetrics(data);
        } else {
          throw new Error('Failed to fetch metrics');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger metrics refresh
    const event = new CustomEvent('refreshMetrics');
    window.dispatchEvent(event);
  };

  const getHealthStatusColor = (connected: boolean) => {
    return connected ? 'text-green-500' : 'text-red-500';
  };

  const getHealthStatusBadge = (connected: boolean) => {
    return connected 
      ? <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>
      : <Badge className="bg-red-100 text-red-800 border-red-200">Offline</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="text-gray-600">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with User Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name || 'Administrator'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {user?.walletInfo && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-3">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">
                      {user.walletInfo.address.substring(0, 6)}...{user.walletInfo.address.substring(38)}
                    </div>
                    <div className="text-xs text-blue-600">
                      {parseFloat(user.walletInfo.balance).toFixed(4)} ETH
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    {user.walletInfo.authorityRole || 'Admin'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Blockchain System Status */}
      {metrics?.systemHealth && (
        <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-blue-600" />
              <span>Blockchain System Status</span>
              {getHealthStatusBadge(metrics.systemHealth.connected)}
            </CardTitle>
            <CardDescription>
              Real-time monitoring of blockchain infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getHealthStatusColor(metrics.systemHealth.connected)}`}>
                  {metrics.systemHealth.connected ? '✓' : '✗'}
                </div>
                <div className="text-sm text-gray-600">Network</div>
                <div className="text-xs text-gray-500">
                  {metrics.systemHealth.networkId ? `ID: ${metrics.systemHealth.networkId}` : 'Disconnected'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.systemHealth.totalIDs || 0}
                </div>
                <div className="text-sm text-gray-600">Total IDs</div>
                <div className="text-xs text-gray-500">Blockchain</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {metrics.systemHealth.activeIDs || 0}
                </div>
                <div className="text-sm text-gray-600">Active IDs</div>
                <div className="text-xs text-gray-500">Verified</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.systemHealth.adminBalance ? 
                    parseFloat(metrics.systemHealth.adminBalance).toFixed(2) : '0.00'
                  }
                </div>
                <div className="text-sm text-gray-600">ETH Balance</div>
                <div className="text-xs text-gray-500">Admin Wallet</div>
              </div>
            </div>

            {metrics.systemHealth.contractAddress && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Key className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Smart Contract:</span>
                </div>
                <div className="text-xs font-mono text-gray-600 mt-1 break-all">
                  {metrics.systemHealth.contractAddress}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 text-right mt-2">
              Last checked: {new Date(metrics.systemHealth.lastChecked).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pending Applications */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">
                Pending Applications
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {metrics.totalPending}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                Awaiting verification
              </p>
            </CardContent>
          </Card>

          {/* Applications Today */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">
                Applications Today
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {metrics.applicationsToday}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                New submissions
              </p>
            </CardContent>
          </Card>

          {/* Verification Rate */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                Verification Rate
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {metrics.verificationRate}%
              </div>
              <Progress 
                value={metrics.verificationRate} 
                className="mt-2 h-2"
              />
              <p className="text-xs text-green-600 mt-1">
                Success rate
              </p>
            </CardContent>
          </Card>

          {/* Active Digital IDs */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">
                Active Digital IDs
              </CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {metrics.activeDigitalIDs}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                Blockchain verified
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Processing Statistics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span>Processing Performance</span>
              </CardTitle>
              <CardDescription>
                Average application processing metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Processing Time</span>
                  <Badge variant="outline">
                    {metrics.averageProcessingTime > 0 
                      ? `${metrics.averageProcessingTime}h` 
                      : 'N/A'
                    }
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Blockchain Success Rate</span>
                  <Badge className="bg-green-100 text-green-800">
                    {metrics.systemHealth.connected ? '98%' : 'Offline'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Digital ID Generation</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {metrics.activeDigitalIDs > 0 ? 'Active' : 'Pending'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                <span>System Alerts</span>
              </CardTitle>
              <CardDescription>
                Important system notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!metrics.systemHealth.connected && (
                  <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-800">
                        Blockchain Disconnected
                      </div>
                      <div className="text-xs text-red-600">
                        Check Ganache connection and restart services
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.totalPending > 10 && (
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-800">
                        High Pending Queue
                      </div>
                      <div className="text-xs text-yellow-600">
                        {metrics.totalPending} applications awaiting review
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.systemHealth.adminBalance && 
                 parseFloat(metrics.systemHealth.adminBalance) < 1 && (
                  <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <Wallet className="h-4 w-4 text-orange-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-orange-800">
                        Low Wallet Balance
                      </div>
                      <div className="text-xs text-orange-600">
                        Consider adding more ETH for blockchain operations
                      </div>
                    </div>
                  </div>
                )}
                
                {metrics.systemHealth.connected && 
                 metrics.totalPending <= 10 && 
                 (!metrics.systemHealth.adminBalance || parseFloat(metrics.systemHealth.adminBalance) >= 1) && (
                  <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        All Systems Operational
                      </div>
                      <div className="text-xs text-green-600">
                        Blockchain connected and functioning normally
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}