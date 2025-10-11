import AlertsFeed from "@/components/AlertsFeed";
import MapLive from "@/components/MapLive";
import PoliceHeatmap from "@/components/PoliceHeatmap";

export default function PoliceDashboard() {
  return (
    <main className="container mx-auto py-8 px-6 space-y-6">
      <div className="w-full grid md:grid-cols-2 gap-6">
        <MapLive />
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Tourist Activity Heatmap</div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">LIVE</span>
            </div>
          </div>
          <PoliceHeatmap />
          <div className="mt-4 text-xs text-foreground/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-medium">Activity Level:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-blue-500/40"></div>
                    <span>Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-green-500/50"></div>
                    <span>Med</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-yellow-500/50"></div>
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-red-500/60"></div>
                    <span>Critical</span>
                  </div>
                </div>
              </div>
              <span className="text-foreground/50">Click cells for details</span>
            </div>
          </div>
        </div>
      </div>
      <AlertsFeed />
    </main>
  );
}
