import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AdminTouristDetail from "@/components/AdminTouristDetail";
import { io } from "socket.io-client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Link } from "react-router-dom";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { IdCard, CheckCircle, XCircle, Clock, FileText, Home, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Applicant = {
  _id: string;
  name: string;
  email: string;
  documentType?: string;
  // older seed data uses `kyc.type` instead of documentType
  kyc?: { type?: string };
  documentNumber?: string;
  applicationDate?: string;
  verificationStatus?: "pending" | "verified" | "rejected" | "archived";
};

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Applicant[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPending, setTotalPending] = useState<number | null>(null);
  const [applicationsToday, setApplicationsToday] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "verified" | "rejected" | "archived" | "all"
  >("pending");
  
  // Anomaly alerts state
  const [anomalyAlerts, setAnomalyAlerts] = useState<any[]>([]);

  // load data; allow optional overrides so we can trigger a search immediately
  async function load(opts?: { page?: number; status?: typeof statusFilter; query?: string }) {
    setLoading(true);
    try {
      const useStatus = opts?.status ?? statusFilter;
      const usePage = opts?.page ?? page;
      const useQuery = opts?.query ?? query;
      const params = new URLSearchParams();
      params.set("status", useStatus);
      params.set("page", String(usePage));
      params.set("perPage", String(perPage));
      if ((useQuery ?? "").trim()) params.set("q", (useQuery ?? "").trim());

      const r = await fetch(`/api/admin/pending-verifications?${params.toString()}`);
      if (!r.ok) {
        // server returned an error; ensure we clear items and show no results
        console.error("Failed to load admin pending-verifications", r.status, await r.text().catch(() => ""));
        setItems([]);
        setTotal(0);
        return;
      }

      const json = await r.json();
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error("Error loading admin data", e);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // debounce timer for search input
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSearch = (q?: string) => {
    // reset to first page when searching
    const queryValue = q ?? query;
    setPage(1);
    // call load with overrides so we don't have to wait for setPage to flush
    load({ page: 1, query: queryValue });
  };

  async function loadMetrics() {
    try {
      // total pending (use perPage=1 to get total fast)
      const r1 = await fetch(
        `/api/admin/pending-verifications?status=pending&perPage=1&page=1`
      );
      const j1 = await r1.json();
      setTotalPending(j1.total ?? 0);

      // applications today - fetch all tourists (dev only) and count applicationDate in same day
      const r2 = await fetch(`/api/tourists`);
      const j2 = await r2.json();
      const all: any[] = j2.data ?? [];
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const countToday = all.filter((t) => {
        const d = new Date(t.applicationDate ?? t.createdAt ?? 0);
        return d >= startOfDay;
      }).length;
      setApplicationsToday(countToday);
    } catch (e) {
      // ignore metric errors in dev
    }
  }

  useEffect(() => {
    load();
  }, [page, statusFilter]);

  useEffect(() => {
    // refresh metrics on mount
    loadMetrics();
  }, []);

  useEffect(() => {
    // Setup Socket.IO connection for real-time anomaly alerts
    const socket = io();
    
    socket.on('new-anomaly-alert', (alertData) => {
      console.log('Received anomaly alert:', alertData);
      setAnomalyAlerts(prev => [alertData, ...prev.slice(0, 9)]); // Keep last 10 alerts
      
      // Optional: Show notification
      if (Notification && Notification.permission === 'granted') {
        new Notification(`Anomaly Alert: ${alertData.name}`, {
          body: `Anomaly detected with score ${alertData.anomalyScore.toFixed(2)}`,
          icon: '/favicon.ico'
        });
      }
    });

    // Request notification permission on mount
    if (Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  async function approve(id: string) {
    const r = await fetch(`/api/admin/approve/${id}`, { method: "POST" });
    if (r.ok) await load();
  }

  async function reject(id: string) {
    const r = await fetch(`/api/admin/reject/${id}`, { method: "POST" });
    if (r.ok) await load();
  }

  async function archive(id: string) {
    const r = await fetch(`/api/admin/archive/${id}`, { method: "POST" });
    if (r.ok) await load();
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            {user && (
              <div className="text-sm text-muted-foreground">
                Welcome, {user.name} ({user.email})
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      <main className="container mx-auto py-8">
          <div className="w-full">
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{totalPending ?? items.filter(i => i.verificationStatus === 'pending').length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Applications Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{applicationsToday ?? '-'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Avg Approval Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">-</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Anomaly Alerts
                      {anomalyAlerts.length > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                          {anomalyAlerts.length}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold">{anomalyAlerts.length}</div>
                    {anomalyAlerts.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Latest: {new Date(anomalyAlerts[0].timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Anomaly Alerts Section */}
              {anomalyAlerts.length > 0 && (
                <div className="mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        🚨 Recent Anomaly Alerts
                        <Badge variant="outline">{anomalyAlerts.length} alerts</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {anomalyAlerts.slice(0, 5).map((alert, index) => (
                          <div key={`${alert.alertId}-${index}`} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={alert.severity === 'high' ? 'destructive' : alert.severity === 'medium' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {alert.severity?.toUpperCase() || 'UNKNOWN'}
                                </Badge>
                                <span className="font-medium">{alert.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Score: {alert.anomalyScore?.toFixed(3) || 'N/A'} | 
                                Location: {alert.location?.lat?.toFixed(4) || 'N/A'}, {alert.location?.lng?.toFixed(4) || 'N/A'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                // Navigate to user location or show details
                                console.log('View alert details:', alert);
                              }}>
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {anomalyAlerts.length > 5 && (
                        <p className="text-xs text-muted-foreground mt-3 text-center">
                          Showing 5 of {anomalyAlerts.length} alerts
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="rounded-2xl border border-white/6 bg-background/60 backdrop-blur overflow-hidden">
                <div className="p-4 border-b border-white/6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </span>
                        <input
                          value={query}
                          onChange={(e) => {
                            const v = e.target.value;
                            setQuery(v);
                            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                            searchTimerRef.current = setTimeout(() => {
                              triggerSearch(v);
                            }, 300);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (searchTimerRef.current) {
                                clearTimeout(searchTimerRef.current);
                                searchTimerRef.current = null;
                              }
                              triggerSearch((e.currentTarget as HTMLInputElement).value);
                            }
                          }}
                          onBlur={(e) => {
                            if (searchTimerRef.current) {
                              clearTimeout(searchTimerRef.current);
                              searchTimerRef.current = null;
                            }
                            triggerSearch((e.currentTarget as HTMLInputElement).value);
                          }}
                          placeholder="Search by name or email"
                          className="h-10 pl-10 pr-3 rounded-md border bg-background/50 w-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
                        />
                      </div>
                      <div className="relative inline-block w-48">
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                          <SelectTrigger aria-label="Filter by status" className="w-full">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Apply button removed — search triggers on Enter, blur, or after typing (debounced) */}
                    </div>
                    <div className="text-sm text-foreground/70">Showing: <span className="font-medium capitalize">{statusFilter}</span></div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Tourist</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
                    ) : items.length === 0 ? (
                      <TableRow><TableCell colSpan={6}>No applications for {statusFilter}.</TableCell></TableRow>
                    ) : (
                      items.map((a) => (
                        <TableRow key={a._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="font-medium">{a.name}</span>
                                <span className="text-xs text-muted-foreground">{a._id}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {a.verificationStatus === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                              {a.verificationStatus === 'verified' && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {a.verificationStatus === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                              <Badge variant={a.verificationStatus === 'pending' ? 'outline' : a.verificationStatus === 'verified' ? 'default' : 'destructive'} className="ml-1 capitalize">{a.verificationStatus ?? '-'}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>{a.email}</TableCell>
                          <TableCell>
                              <div className="flex items-center gap-2">
                                {/* Use document type icons for clarity */}
                                {(((a.documentType ?? (a as any).kyc?.type) || '') as string).toLowerCase().includes('passport') ? (
                                  <IdCard className="h-4 w-4" />
                                ) : (
                                  <IdCard className="h-4 w-4" />
                                )}
                                <span className="capitalize">{a.documentType ?? (a as any).kyc?.type ?? '-'}</span>
                              </div>
                          </TableCell>
                          <TableCell>{a.applicationDate ? formatDateDDMMYYYY(a.applicationDate) : '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setSelected(a._id); setDetailOpen(true); }}>View</Button>
                              {((a.documentType ?? (a as any).kyc?.type) && a.verificationStatus === 'pending') && (
                                <Button size="sm" variant="default" onClick={() => approve(a._id)}>Approve</Button>
                              )}
                              {a.verificationStatus === 'pending' && (
                                <Button size="sm" variant="outline" onClick={() => reject(a._id)}>Reject</Button>
                              )}
                              {(a.verificationStatus === 'verified' || a.verificationStatus === 'rejected') && (
                                <Button size="sm" variant="ghost" onClick={() => archive(a._id)}>Archive</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>

                <div className="p-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setPage(Math.max(1, page - 1))} aria-disabled={page <= 1} />
                      </PaginationItem>
                      {/* Simple numeric pages */}
                      {Array.from({ length: Math.max(1, Math.ceil(total / perPage)) }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink isActive={page === i + 1} onClick={() => setPage(i + 1)}>{i + 1}</PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage(Math.min(Math.max(1, Math.ceil(total / perPage)), page + 1))} aria-disabled={page >= Math.ceil(total / perPage)} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
          </div>
      </main>
      <AdminTouristDetail
        userId={selected}
        open={detailOpen}
        onOpenChange={(v) => setDetailOpen(v)}
        onDone={() => load()}
      />
    </>
  );
}