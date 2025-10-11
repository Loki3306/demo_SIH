import { useState, useEffect } from "react";

// Sample data for tourism activity heatmap (by hour and day)
const generateHeatmapData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  
  const data = days.map(day => 
    hours.map(hour => {
      // Simulate realistic patterns
      const hourNum = parseInt(hour.split(':')[0]);
      const isDayTime = hourNum >= 8 && hourNum <= 20;
      const isWeekend = day === 'Sat' || day === 'Sun';
      const isPeakHour = hourNum >= 10 && hourNum <= 14 || hourNum >= 18 && hourNum <= 22;
      
      let baseIntensity = 0.1;
      if (isDayTime) baseIntensity += 0.3;
      if (isWeekend) baseIntensity += 0.2;
      if (isPeakHour) baseIntensity += 0.3;
      
      // Add some randomness
      const randomVariation = Math.random() * 0.2 - 0.1;
      const intensity = Math.max(0.05, Math.min(0.95, baseIntensity + randomVariation));
      
      return {
        day,
        hour,
        intensity,
        alerts: Math.floor(intensity * 50), // Scale to number of alerts
        tourists: Math.floor(intensity * 200) // Scale to number of tourists
      };
    })
  );
  
  return data;
};

const getIntensityColor = (intensity: number) => {
  if (intensity < 0.2) return 'bg-blue-500/20 border-blue-500/30';
  if (intensity < 0.4) return 'bg-green-500/30 border-green-500/40';
  if (intensity < 0.6) return 'bg-yellow-500/40 border-yellow-500/50';
  if (intensity < 0.8) return 'bg-orange-500/50 border-orange-500/60';
  return 'bg-red-500/60 border-red-500/70';
};

const getIntensityText = (intensity: number) => {
  if (intensity < 0.2) return 'Very Low';
  if (intensity < 0.4) return 'Low';
  if (intensity < 0.6) return 'Medium';
  if (intensity < 0.8) return 'High';
  return 'Very High';
};

export default function PoliceHeatmap() {
  const [heatmapData, setHeatmapData] = useState(() => generateHeatmapData());
  const [selectedCell, setSelectedCell] = useState<any>(null);

  // Update data every 30 seconds to simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setHeatmapData(generateHeatmapData());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="h-[320px] relative">
      {/* Heatmap Grid */}
      <div className="flex flex-col gap-1 h-full overflow-auto">
        {/* Hour labels */}
        <div className="flex gap-1">
          <div className="w-12"></div> {/* Space for day labels */}
          {hours.map(hour => (
            <div key={hour} className="text-xs text-center text-foreground/60 w-6 font-mono">
              {hour.split(':')[0]}
            </div>
          ))}
        </div>
        
        {/* Data rows */}
        {heatmapData.map((dayData, dayIndex) => (
          <div key={days[dayIndex]} className="flex gap-1 items-center">
            {/* Day label */}
            <div className="text-xs text-foreground/60 w-12 font-medium">
              {days[dayIndex]}
            </div>
            
            {/* Hour cells */}
            {dayData.map((cellData, hourIndex) => (
              <div
                key={`${dayIndex}-${hourIndex}`}
                className={`
                  relative rounded border cursor-pointer transition-all duration-200 hover:scale-125 hover:z-10 w-6 h-6
                  ${getIntensityColor(cellData.intensity)}
                  ${selectedCell?.day === cellData.day && selectedCell?.hour === cellData.hour ? 'ring-2 ring-white scale-125' : ''}
                `}
                onClick={() => setSelectedCell(cellData)}
                title={`${cellData.day} ${cellData.hour}: ${getIntensityText(cellData.intensity)} activity`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-xs font-bold opacity-80" style={{ fontSize: '8px' }}>
                    {cellData.alerts > 0 ? cellData.alerts : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Selected Cell Info */}
      {selectedCell && (
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur rounded-lg p-3 text-sm min-w-[160px]">
          <div className="font-medium text-white">{selectedCell.day} {selectedCell.hour}</div>
          <div className="text-foreground/80 mt-1">
            <div>Activity: <span className="text-white">{getIntensityText(selectedCell.intensity)}</span></div>
            <div>Alerts: <span className="text-red-400">{selectedCell.alerts}</span></div>
            <div>Tourists: <span className="text-blue-400">{selectedCell.tourists}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}