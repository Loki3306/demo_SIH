import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  Search,
  Download,
  Eye,
  AlertTriangle,
  Shield
} from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/utils";

interface Tourist {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  documentType?: "aadhaar" | "passport";
  documentNumber?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "archived";
  specialLoginId?: string;
  applicationDate?: string;
  blockchainId?: string;
  history?: Array<{
    action: string;
    admin?: string;
    notes?: string;
    timestamp: string;
  }>;
}

interface CreateTouristForm {
  name: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  documentType: "aadhaar" | "passport";
  documentNumber: string;
  itinerary: string;
}

export default function EnhancedAdminTouristManagement() {
  const [tourists, setTourists] = useState<Tourist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters and pagination
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;
  
  // Create tourist form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTouristForm>({
    name: "",
    email: "",
    phone: "",
    emergencyName: "",
    emergencyPhone: "",
    documentType: "aadhaar",
    documentNumber: "",
    itinerary: ""
  });
  const [creating, setCreating] = useState(false);
  
  // Selected tourist for details
  const [selectedTourist, setSelectedTourist] = useState<Tourist | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load tourists data
  const loadTourists = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        perPage: perPage.toString()
      });
      
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/pending-verifications?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to load tourists");
      }
      
      const data = await res.json();
      setTourists(data.data || []);
      setTotal(data.total || 0);
      
    } catch (err: any) {
      setError(err.message || "Failed to load tourists");
    } finally {
      setLoading(false);
    }
  };

  // Create new tourist
  const handleCreateTourist = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/admin/create-tourist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create tourist");
      }
      
      setSuccess(`Tourist profile created successfully. ID: ${data.userId}`);
      setShowCreateForm(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        emergencyName: "",
        emergencyPhone: "",
        documentType: "aadhaar",
        documentNumber: "",
        itinerary: ""
      });
      
      // Reload data
      loadTourists();
      
    } catch (err: any) {
      setError(err.message || "Failed to create tourist");
    } finally {
      setCreating(false);
    }
  };

  // Approve tourist
  const handleApprove = async (touristId: string) => {
    if (!confirm("Are you sure you want to approve this tourist?")) return;
    
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/approve/${touristId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: "Approved by admin"
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to approve tourist");
      }
      
      setSuccess(`Tourist approved successfully. Special ID: ${data.specialLoginId}`);
      loadTourists();
      
    } catch (err: any) {
      setError(err.message || "Failed to approve tourist");
    }
  };

  // Reject tourist
  const handleReject = async (touristId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (!reason) return;
    
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/reject/${touristId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: reason
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to reject tourist");
      }
      
      setSuccess("Tourist application rejected");
      loadTourists();
      
    } catch (err: any) {
      setError(err.message || "Failed to reject tourist");
    }
  };

  // Archive tourist
  const handleArchive = async (touristId: string) => {
    if (!confirm("Are you sure you want to archive this tourist?")) return;
    
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/admin/archive/${touristId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error("Failed to archive tourist");
      }
      
      setSuccess("Tourist application archived");
      loadTourists();
      
    } catch (err: any) {
      setError(err.message || "Failed to archive tourist");
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      pending: { variant: "outline", icon: Clock, color: "text-yellow-600" },
      verified: { variant: "default", icon: CheckCircle, color: "text-green-600" },
      rejected: { variant: "destructive", icon: XCircle, color: "text-red-600" },
      archived: { variant: "secondary", icon: Archive, color: "text-gray-600" }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <Badge variant={config.variant} className="capitalize">
          {status}
        </Badge>
      </div>
    );
  };

  useEffect(() => {
    loadTourists();
  }, [statusFilter, searchQuery, page]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tourist Management</h1>
          <p className="text-muted-foreground">Manage tourist applications and verifications</p>
        </div>
        
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Tourist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Tourist Profile</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleCreateTourist} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="documentType">Document Type</Label>
                  <Select
                    value={createForm.documentType}
                    onValueChange={(value: "aadhaar" | "passport") => 
                      setCreateForm(prev => ({ ...prev, documentType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="documentNumber">Document Number</Label>
                <Input
                  id="documentNumber"
                  value={createForm.documentNumber}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, documentNumber: e.target.value }))}
                  placeholder={createForm.documentType === "aadhaar" ? "1234 5678 9012" : "A1234567"}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyName"
                    value={createForm.emergencyName}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, emergencyName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <Input
                    id="emergencyPhone"
                    value={createForm.emergencyPhone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="itinerary">Travel Itinerary</Label>
                <Textarea
                  id="itinerary"
                  value={createForm.itinerary}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, itinerary: e.target.value }))}
                  placeholder="Brief description of travel plans..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Tourist"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tourist List */}
      <Card>
        <CardHeader>
          <CardTitle>Tourist Applications ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tourist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Special ID</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : tourists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No tourists found</TableCell>
                </TableRow>
              ) : (
                tourists.map((tourist) => (
                  <TableRow key={tourist._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{tourist.name}</div>
                        <div className="text-sm text-muted-foreground">{tourist.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tourist.verificationStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="capitalize">{tourist.documentType}</div>
                      <div className="text-sm text-muted-foreground">{tourist.documentNumber}</div>
                    </TableCell>
                    <TableCell>
                      {tourist.applicationDate ? formatDateDDMMYYYY(tourist.applicationDate) : '-'}
                    </TableCell>
                    <TableCell>
                      {tourist.specialLoginId ? (
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {tourist.specialLoginId}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">Not generated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTourist(tourist);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        {tourist.verificationStatus === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(tourist._id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(tourist._id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {(tourist.verificationStatus === 'verified' || tourist.verificationStatus === 'rejected') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(tourist._id)}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tourist Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tourist Details</DialogTitle>
          </DialogHeader>
          
          {selectedTourist && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Personal Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedTourist.name}</div>
                    <div><strong>Email:</strong> {selectedTourist.email}</div>
                    <div><strong>Phone:</strong> {selectedTourist.phone || 'Not provided'}</div>
                    <div><strong>Status:</strong> <StatusBadge status={selectedTourist.verificationStatus} /></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Document Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Type:</strong> {selectedTourist.documentType}</div>
                    <div><strong>Number:</strong> {selectedTourist.documentNumber}</div>
                    <div><strong>Applied:</strong> {selectedTourist.applicationDate ? formatDateDDMMYYYY(selectedTourist.applicationDate) : 'Not available'}</div>
                  </div>
                </div>
              </div>
              
              {selectedTourist.specialLoginId && (
                <div>
                  <h3 className="font-semibold mb-2">Authentication Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Special Login ID:</strong> 
                      <code className="ml-2 bg-muted px-2 py-1 rounded">
                        {selectedTourist.specialLoginId}
                      </code>
                    </div>
                    {selectedTourist.blockchainId && (
                      <div><strong>Blockchain ID:</strong> 
                        <code className="ml-2 bg-muted px-2 py-1 rounded text-xs">
                          {selectedTourist.blockchainId}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedTourist.history && selectedTourist.history.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Activity History</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {selectedTourist.history.map((entry, index) => (
                      <div key={index} className="text-sm border-l-2 border-muted pl-3">
                        <div className="font-medium capitalize">{entry.action.replace('_', ' ')}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                          {entry.admin && ` • by ${entry.admin}`}
                        </div>
                        {entry.notes && (
                          <div className="text-muted-foreground text-xs mt-1">{entry.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}