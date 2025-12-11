# Weather Card UI Mockup

## Visual Structure

The WeatherCard component creates a visually appealing card that displays weather information with these layers:

### 1. Gradient Header (Dynamic Colors)
```
┌─────────────────────────────────────────────────┐
│ 🌍 San Francisco, US              ☀️          │
│ Clear sky                                       │
│                                                 │
│ 18°C                                           │
│ Feels like 17°C                                │
└─────────────────────────────────────────────────┘
```

**Color Schemes Based on Weather:**
- Clear sky: Blue gradient (from-blue-400 to-blue-600)
- Partly cloudy: Light blue (from-blue-300 to-blue-500)
- Overcast: Gray (from-gray-400 to-gray-600)
- Rain: Slate (from-slate-400 to-slate-600)
- Snow: Light blue (from-blue-200 to-blue-400)
- Thunderstorm: Purple (from-purple-500 to-purple-700)

### 2. Weather Metrics Grid
```
┌─────────────────────────────────────────────────┐
│  💨 Wind                🌧️ Humidity            │
│  15 km/h                 72%                    │
│  NW                                             │
│                                                 │
│  💧 Precipitation       🌡️ Temperature          │
│  0 mm                    18.5°C                 │
└─────────────────────────────────────────────────┘
```

**Metric Icons:**
- Wind: WindIcon (with direction)
- Humidity: DropletIcon
- Precipitation: CloudRainIcon (if > 0)
- Temperature: ThermometerIcon

### 3. Footer Timestamp
```
┌─────────────────────────────────────────────────┐
│ Updated: 12/11/2024, 4:39:11 PM                │
└─────────────────────────────────────────────────┘
```

## Weather Icons

The card displays different icons based on weather codes:

| Weather Code | Icon | Condition |
|--------------|------|-----------|
| 0 | ☀️ SunIcon | Clear sky |
| 1-3 | 🌤️ CloudSunIcon | Partly cloudy |
| 45-48 | 🌫️ CloudFogIcon | Fog |
| 51-55 | 🌦️ CloudDrizzleIcon | Drizzle |
| 61-67 | 🌧️ CloudRainIcon | Rain |
| 71-86 | 🌨️ CloudSnowIcon | Snow |
| 95-99 | ⚡ ZapIcon | Thunderstorm |

## Responsive Design

- **Max Width**: 28rem (448px)
- **Shadow**: Large shadow for depth
- **Border**: None (seamless card)
- **Padding**: 1.5rem (24px) for header, 1.5rem for metrics

## Error State

When location is not found or API fails:

```
┌─────────────────────────────────────────────────┐
│ ☁️ Weather Unavailable                         │
│                                                 │
│ Location not found: Invalid City Name          │
└─────────────────────────────────────────────────┘
```

**Error Design:**
- Red border (border-destructive/50)
- Red background (bg-destructive/10)
- CloudIcon with error message

## Animation & Interaction

- **Entry Animation**: Fade in with slight slide up
- **Non-Interactive**: Pure display component (no hover states)
- **Static**: No loading states (data comes from completed tool call)

## Example Use Cases

### Sunny Day in California
```
Gradient: Bright blue
Icon: Large sun (20px)
Temp: 22°C
Condition: Clear sky
Wind: Light breeze from W
```

### Rainy Day in London
```
Gradient: Slate gray
Icon: Rain cloud
Temp: 12°C
Condition: Moderate rain
Precipitation: 5mm
Humidity: High (85%)
```

### Snowy Day in Moscow
```
Gradient: Light blue/white
Icon: Snow cloud
Temp: -5°C
Condition: Heavy snow
Wind: Strong from N
```

### Thunderstorm in Miami
```
Gradient: Purple/dark
Icon: Lightning bolt
Temp: 28°C
Condition: Thunderstorm
High humidity and wind
```

## Technical Implementation Details

### CSS Classes

The card uses Tailwind CSS with custom gradients:
- `bg-gradient-to-br`: Bottom-right diagonal gradient
- `shadow-lg`: Large drop shadow
- `rounded-lg`: Rounded corners
- `overflow-hidden`: Prevents content overflow

### Icon Styling

All icons use consistent sizing:
- Main weather icon: `size-20` (5rem)
- Metric icons: `size-5` (1.25rem)
- Icon containers: `size-10` (2.5rem) with colored backgrounds

### Typography

- Location name: `text-lg font-semibold`
- Temperature: `text-6xl font-bold` (main display)
- Feels like: `text-sm text-white/80`
- Metrics: `text-sm font-semibold`
- Labels: `text-xs text-muted-foreground`

## Accessibility

- Semantic HTML structure
- Clear visual hierarchy
- High contrast text on gradient backgrounds
- Descriptive text for all data points
- No reliance on color alone (icons + text)
