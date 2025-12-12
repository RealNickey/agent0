type WeatherProps = {
  temperature: number;
  weather: string;
  location: string;
};

// Weather icon components
const SunIcon = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-full bg-yellow-300 shadow-lg ${className}`} />
);

const CloudIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className}>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
  </svg>
);

const RainIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className}>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    <path d="M7 19l2 3M12 19l2 3M17 19l2 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const SnowIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className}>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    <circle cx="7" cy="20" r="1" />
    <circle cx="12" cy="21" r="1" />
    <circle cx="17" cy="20" r="1" />
  </svg>
);

const StormIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className}>
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    <path d="M13 16l-2 4h3l-2 4" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const PartlyCloudyIcon = ({ className = "" }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-yellow-300 shadow-md" />
    <svg viewBox="0 0 24 24" fill="white" className="relative z-10">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
  </div>
);

const FoggyIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="white" className={className}>
    <path d="M4 14h16M4 18h16M4 10h16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

// Get appropriate weather icon based on condition
const getWeatherIcon = (weather: string | undefined | null, size: 'small' | 'large' = 'large') => {
  const sizeClass = size === 'large' ? 'w-16 h-16' : 'w-10 h-10';
  if (!weather || typeof weather !== 'string') {
    // Defensive: unknown or missing weather, show default icon
    return <SunIcon className={sizeClass} />;
  }
  const weatherLower = weather.toLowerCase();
  if (weatherLower.includes('sunny') || weatherLower.includes('clear')) {
    return <SunIcon className={sizeClass} />;
  } else if (weatherLower.includes('partly') || weatherLower.includes('mostly')) {
    return <PartlyCloudyIcon className={sizeClass} />;
  } else if (weatherLower.includes('cloud')) {
    return <CloudIcon className={sizeClass} />;
  } else if (weatherLower.includes('rain') || weatherLower.includes('drizzle') || weatherLower.includes('shower')) {
    return <RainIcon className={sizeClass} />;
  } else if (weatherLower.includes('snow') || weatherLower.includes('sleet')) {
    return <SnowIcon className={sizeClass} />;
  } else if (weatherLower.includes('storm') || weatherLower.includes('thunder')) {
    return <StormIcon className={sizeClass} />;
  } else if (weatherLower.includes('fog') || weatherLower.includes('mist') || weatherLower.includes('haze')) {
    return <FoggyIcon className={sizeClass} />;
  }
  // Default to sunny for unknown conditions
  return <SunIcon className={sizeClass} />;
};

export const Weather = ({ temperature, weather, location }: WeatherProps) => {
  // Generate hourly forecast data (simulated progression)
  const currentHour = new Date().getHours();
  const hours = Array.from({ length: 7 }, (_, i) => {
    const hour = (currentHour + i) % 24;
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      time: `${displayHour}${period}`,
      temp: Math.round(temperature + (i * 2) - 3), // Simulated temp progression
    };
  });

  // Get current day of week and month
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate();

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 p-8 text-white shadow-2xl max-w-2xl">
      {/* Header with date and condition */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-lg font-medium opacity-90">
            {dayOfWeek}, {month} {day}
          </div>
        </div>
        <div className="text-lg font-medium">{weather}</div>
      </div>

      {/* Main temperature display */}
      <div className="mb-8 flex items-center gap-4">
        <div className="text-7xl font-bold">{temperature}°</div>
        {getWeatherIcon(weather, 'large')}
      </div>

      {/* Hourly forecast */}
      <div className="grid grid-cols-7 gap-4 pt-4 border-t border-white/20">
        {hours.map((hour, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="text-sm opacity-80">{hour.time}</div>
            {getWeatherIcon(weather, 'small')}
            <div className="text-sm font-medium">{hour.temp}°</div>
          </div>
        ))}
      </div>
    </div>
  );
};
