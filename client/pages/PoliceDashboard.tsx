import AlertsFeed from "@/components/AlertsFeed";
import MapLive from "@/components/MapLive";

export default function PoliceDashboard() {
  return (
    <main className="container mx-auto py-8 px-6 space-y-6">
      <div className="w-full grid md:grid-cols-2 gap-6">
        <MapLive />
        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="font-semibold mb-2">Heatmap</div>
          <p className="text-sm text-foreground/70">Heatmap placeholder — will use leaflet.heat with location logs.</p>
        </div>
      </div>
      <AlertsFeed />
    </main>
  );
}
