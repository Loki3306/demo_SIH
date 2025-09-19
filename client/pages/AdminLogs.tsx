import React, { useEffect, useState } from "react";
import { formatDateDDMMYYYY } from "@/lib/utils";

type LogItem = { userId: string; action: string; admin?: string; notes?: string; timestamp: string };

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/logs')
      .then(r => r.json())
      .then(j => setLogs(j.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Activity Logs</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-foreground/5">
            <tr>
              <th className="text-left px-4 py-2">Timestamp</th>
              <th className="text-left px-4 py-2">User ID</th>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Admin</th>
              <th className="text-left px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={5}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={5}>No log entries.</td></tr>
            ) : (
              logs.map((l, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="px-4 py-2">{formatDateDDMMYYYY(l.timestamp)}</td>
                  <td className="px-4 py-2">{l.userId}</td>
                  <td className="px-4 py-2">{l.action}</td>
                  <td className="px-4 py-2">{l.admin ?? '-'}</td>
                  <td className="px-4 py-2">{l.notes ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
