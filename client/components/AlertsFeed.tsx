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

// Sample alert data for demonstration
const sampleAlerts: AlertEvent[] = [
  {
    alertId: "alert_001",
    userId: "tourist_123",
    name: "Sarah Johnson",
    location: { lat: 19.0330, lng: 72.8297 },
    severity: "Medium",
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    notes: "Tourist reported feeling unsafe at Marine Drive"
  },
  {
    alertId: "alert_002",
    userId: "tourist_456",
    name: "Mike Chen",
    location: { lat: 28.6139, lng: 77.2090 },
    severity: "High",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    notes: "Panic button activated near Connaught Place"
  },
  {
    alertId: "alert_003",
    userId: "tourist_789",
    name: "Emma Rodriguez",
    location: { lat: 15.2993, lng: 74.1240 },
    severity: "Low",
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 minutes ago
    notes: "Requested assistance at Calangute Beach"
  },
  {
    alertId: "alert_004",
    userId: "tourist_321",
    name: "David Smith",
    location: { lat: 26.9124, lng: 75.7873 },
    severity: "Medium",
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 minutes ago
    notes: "Lost tourist at Jaipur City Palace"
  },
  {
    alertId: "alert_005",
    userId: "tourist_654",
    name: "Lisa Wang",
    location: { lat: 9.9312, lng: 76.2673 },
    severity: "High",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    notes: "Medical emergency reported in Fort Kochi"
  }
];

export default function AlertsFeed() {
  const [events, setEvents] = useState<AlertEvent[]>(sampleAlerts);

  useEffect(() => {
    const socket: Socket = io({ path: "/socket.io" });
    const onPanic = (e: AlertEvent) => setEvents((prev) => [e, ...prev].slice(0, 20));
    socket.on("panic_alert", onPanic);

    // Add new sample alerts periodically for demonstration
    const addSampleAlert = () => {
      const locations = [
        { lat: 19.0760, lng: 72.8777, name: "Mumbai Central" },
        { lat: 28.7041, lng: 77.1025, name: "Delhi North" },
        { lat: 15.4909, lng: 73.8278, name: "Goa Beaches" },
        { lat: 12.2958, lng: 76.6394, name: "Mysore Palace" },
        { lat: 22.5726, lng: 88.3639, name: "Kolkata Heritage" }
      ];
      
      const severities = ["Low", "Medium", "High"];
      const names = ["Alex Kumar", "Maria Garcia", "John Doe", "Priya Sharma", "Robert Brown"];
      
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      const newAlert: AlertEvent = {
        alertId: `alert_${Date.now()}`,
        userId: `tourist_${Math.floor(Math.random() * 9999)}`,
        name: randomName,
        location: randomLocation,
        severity: randomSeverity,
        timestamp: new Date().toISOString(),
        notes: `Live update from ${randomLocation.name}`
      };
      
      setEvents((prev) => [newAlert, ...prev].slice(0, 20));
    };

    // Add a new sample alert every 30 seconds
    const interval = setInterval(addSampleAlert, 30000);

    return () => {
      socket.off("panic_alert", onPanic);
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-500/20 border-red-500/30 text-red-100';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-100';
      case 'low': return 'bg-green-500/20 border-green-500/30 text-green-100';
      default: return 'bg-foreground/5 border-foreground/10';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '💡';
      default: return '📍';
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
      <div className="font-semibold mb-2 flex items-center gap-2">
        <span>Live Tourist Alerts</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-400">LIVE</span>
        </div>
      </div>
      <div className="space-y-2 max-h-80 overflow-auto pr-2">
        {events.length === 0 && (
          <div className="text-sm text-foreground/60">No alerts yet</div>
        )}
        {events.map((e) => (
          <div key={e.alertId} className={`p-3 rounded-lg border ${getSeverityColor(e.severity)} flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{getSeverityIcon(e.severity)}</span>
              <div>
                <div className="text-sm font-medium">{e.name || e.userId}</div>
                <div className="text-xs opacity-70">{formatDateDDMMYYYY(e.timestamp)} • {e.severity}</div>
                {e.notes && (
                  <div className="text-xs opacity-60 mt-1">{e.notes}</div>
                )}
              </div>
            </div>
            <a 
              className="text-xs underline opacity-70 hover:opacity-100 transition-opacity" 
              href={`https://www.openstreetmap.org/?mlat=${e.location.lat}&mlon=${e.location.lng}#map=14/${e.location.lat}/${e.location.lng}`} 
              target="_blank" 
              rel="noreferrer"
            >
              View Location
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
