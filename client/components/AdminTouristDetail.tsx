import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDateDDMMYYYY } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type HistoryItem = { action: string; admin?: string; notes?: string; timestamp: string };

type ItineraryItem = { from?: string; to?: string; start?: string; end?: string };

type TouristDetail = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  itinerary?: string | ItineraryItem[];
  emergencyName?: string;
  emergencyPhone?: string;
  documentType?: string;
  documentNumber?: string;
  documentFileName?: string;
  verificationStatus?: string;
  blockchainId?: string;
  applicationDate?: string;
  history?: HistoryItem[];
};

export default function AdminTouristDetail({
  userId,
  open,
  onOpenChange,
  onDone,
}: {
  userId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}) {
  const [detail, setDetail] = useState<TouristDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;
    let mounted = true;
    setLoading(true);
    setFetchError(null);
    fetch(`/api/tourists/${userId}`)
      .then(async (r) => {
        if (!mounted) return;
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          setFetchError(`Error ${r.status}: ${text || r.statusText}`);
          setDetail(null);
          return;
        }
        const json = await r.json().catch(() => null);
        if (!mounted) return;
        if (!json) {
          setFetchError("Empty response from server");
          setDetail(null);
        } else {
          setDetail(json ?? null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch tourist detail:", err);
        if (mounted) setFetchError(String(err?.message ?? err));
        if (mounted) setDetail(null);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [open, userId]);

  async function postAction(action: "approve" | "reject") {
    if (!detail) return;
    setActionLoading(true);
    try {
      const r = await fetch(`/api/admin/${action}/${detail._id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!r.ok) throw new Error("failed");
      // refresh parent list
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      alert(`Failed to ${action} application.`);
    } finally {
      setActionLoading(false);
    }
  }

  function openDocument() {
    if (!detail?.documentFileName) return alert("No document uploaded");
    const url = `/api/admin/document/${detail._id}`;
    window.open(url, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="w-full max-w-3xl sm:max-w-2xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="backdrop-blur-md bg-white/40 dark:bg-[#0b0e10]/40">
          <DialogTitle>Tourist Application Details</DialogTitle>
          <DialogDescription>Review the application and add notes before approving or rejecting.</DialogDescription>
          <div className="dialog-header-divider" />
        </DialogHeader>

  <div className="flex-1 overflow-y-auto p-6 space-y-4 ui-scrollbar">
          {loading ? (
            <div className="py-10 text-center">Loading application details…</div>
          ) : fetchError ? (
            <div className="p-4 text-sm text-red-600">
              <div className="mb-2">Failed to load details: {fetchError}</div>
              <div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!userId) return;
                    setFetchError(null);
                    setLoading(true);
                    fetch(`/api/tourists/${userId}`)
                      .then(async (r) => {
                        if (!r.ok) {
                          const t = await r.text().catch(() => "");
                          setFetchError(`Error ${r.status}: ${t || r.statusText}`);
                          setDetail(null);
                          return;
                        }
                        const j = await r.json().catch(() => null);
                        setDetail(j ?? null);
                      })
                      .catch((e) => {
                        setFetchError(String(e?.message ?? e));
                        setDetail(null);
                      })
                      .finally(() => setLoading(false));
                  }}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : detail ? (
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Name</div>
                      <div className="mt-1 text-base text-foreground">{detail.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Email</div>
                      <div className="mt-1 text-base text-foreground">{detail.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Phone</div>
                      <div className="mt-1 text-base text-foreground">{detail.phone ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Applied</div>
                      <div className="mt-1 text-base text-foreground">{detail.applicationDate ? formatDateDDMMYYYY(detail.applicationDate) : "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Status</div>
                      <div className="mt-1">
                        <Badge className="capitalize">{detail.verificationStatus ?? "-"}</Badge>
                      </div>
                    </div>
                    {detail.blockchainId && (
                      <div>
                        <div className="text-sm text-muted-foreground font-medium">Blockchain ID</div>
                        <div className="mt-1 text-base text-foreground">{detail.blockchainId}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Itinerary</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(detail.itinerary) ? (
                    <div className="space-y-2">
                      {detail.itinerary.map((it, idx) => (
                        <div key={idx} className="border rounded p-3 bg-background/50">
                          <div className="flex flex-col sm:flex-row sm:gap-6 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground font-medium">From</div>
                              <div className="mt-1 text-base text-foreground">{it.from ?? "-"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground font-medium">To</div>
                              <div className="mt-1 text-base text-foreground">{it.to ?? "-"}</div>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-6 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground font-medium">Start</div>
                              <div className="mt-1 text-base text-foreground">{it.start ?? "-"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground font-medium">End</div>
                              <div className="mt-1 text-base text-foreground">{it.end ?? "-"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm">{detail.itinerary ?? "-"}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground font-medium">Name</div>
                    <div className="mt-1 text-base text-foreground">{detail.emergencyName ?? "-"}</div>
                    <div className="mt-2 text-xs text-muted-foreground font-medium">Phone</div>
                    <div className="mt-1 text-base text-foreground">{detail.emergencyPhone ?? "-"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Document</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground font-medium">Type</div>
                    <div className="mt-1 text-base text-foreground">{detail.documentType ?? "-"}</div>
                    <div className="mt-2 text-xs text-muted-foreground font-medium">Number</div>
                    <div className="mt-1 text-base text-foreground">{detail.documentNumber ?? "-"}</div>
                  </div>
                  <div className="mt-3">
                    <Button size="sm" onClick={openDocument}>
                      View Uploaded Document
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Admin Notes & History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Textarea placeholder="Add notes for approval or rejection" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <div>
                      <strong>History</strong>
                      {detail.history && detail.history.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {detail.history.map((h, i) => (
                            <li key={i} className="text-sm border rounded px-3 py-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{h.action}</div>
                                <div className="text-xs text-muted-foreground">{formatDateDDMMYYYY(h.timestamp)}</div>
                              </div>
                              {h.admin && <div className="text-xs mt-1">By: {h.admin}</div>}
                              {h.notes && <div className="text-xs mt-1">Notes: {h.notes}</div>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">No history</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div>No details available.</div>
          )}
        </div>

        <DialogFooter className="mt-4 bg-background/60 backdrop-blur-sm">
          <div className="flex items-center justify-between w-full gap-2 flex-wrap p-4">
            <div>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => postAction("reject")} disabled={actionLoading}>
                Reject
              </Button>
              <Button onClick={() => postAction("approve")} disabled={actionLoading}>
                Approve
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
