import SafetyScoreCard from "@/components/SafetyScoreCard";
import PanicButton from "@/components/PanicButton";
import MapLive from "@/components/MapLive";
import AlertsFeed from "@/components/AlertsFeed";
import UploadBox from "@/components/UploadBox";

export default function TouristDashboard() {
  const userId = "t123";
  return (
    <main className="container mx-auto py-8 grid lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <SafetyScoreCard score={78} />
        <PanicButton userId={userId} />
      </div>
      <div className="lg:col-span-1 md:col-span-2 lg:col-start-2 lg:col-end-3">
        <MapLive />
      </div>
      <div>
        <AlertsFeed />
        <div className="mt-4">
          <UploadBox />
        </div>
      </div>
    </main>
  );
}
