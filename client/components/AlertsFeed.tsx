import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { formatDateDDMMYYYY } from "@/lib/utils";

interface AlertEvent {
  alertId: string;
  userId: string;
  name: string;
  location: { lat: number; lng: number };
  severity: string;
  timestamp: string;
  notes?: string;
}

export default function AlertsFeed() {
  const [events, setEvents] = useState<AlertEvent[]>([]);

  useEffect(() => {
    const socket: Socket = io({ path: "/socket.io" });
    const onPanic = (e: AlertEvent) => setEvents((prev) => [e, ...prev].slice(0, 20));
    socket.on("panic_alert", onPanic);
    return () => {
      socket.off("panic_alert", onPanic);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
  <div className="font-semibold mb-2">Live alerts</div>
      <div className="space-y-2 max-h-80 overflow-auto pr-2">
        {events.length === 0 && (
          <div className="text-sm text-foreground/60">No alerts yet</div>
        )}
        {events.map((e) => (
          <div key={e.alertId} className="p-3 rounded-lg bg-foreground/5 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{e.name || e.userId}</div>
              <div className="text-xs text-foreground/60">{formatDateDDMMYYYY(e.timestamp)} • {e.severity}</div>
            </div>
            <a className="text-xs underline" href={`https://www.openstreetmap.org/?mlat=${e.location.lat}&mlon=${e.location.lng}#map=14/${e.location.lat}/${e.location.lng}`} target="_blank" rel="noreferrer">Open map</a>
          </div>
        ))}
      </div>
    </div>
  );
}
