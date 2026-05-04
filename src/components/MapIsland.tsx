import { useEffect, useRef, useState } from 'preact/hooks';

interface MapIslandProps {
  mode: 'display' | 'picker';
  lat: number;
  lng: number;
  fuzzed?: boolean;
  onChange?: (lat: number, lng: number) => void;
}

export default function MapIsland({ mode, lat, lng, fuzzed = false, onChange }: MapIslandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);

  const [inputLat, setInputLat] = useState(lat.toFixed(6));
  const [inputLng, setInputLng] = useState(lng.toFixed(6));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Leaflet requires window — safe here since this is a client island
    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: mode === 'picker',
        dragging: mode === 'picker',
        scrollWheelZoom: mode === 'picker',
        doubleClickZoom: mode === 'picker',
        touchZoom: mode === 'picker',
        keyboard: mode === 'picker',
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const marker = L.marker([lat, lng], {
        icon,
        draggable: mode === 'picker',
      }).addTo(map);

      if (mode === 'picker') {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const newLat = parseFloat(pos.lat.toFixed(6));
          const newLng = parseFloat(pos.lng.toFixed(6));
          setInputLat(newLat.toString());
          setInputLng(newLng.toString());
          onChange?.(newLat, newLng);
        });

        map.on('click', (e) => {
          const newLat = parseFloat(e.latlng.lat.toFixed(6));
          const newLng = parseFloat(e.latlng.lng.toFixed(6));
          marker.setLatLng([newLat, newLng]);
          setInputLat(newLat.toString());
          setInputLng(newLng.toString());
          onChange?.(newLat, newLng);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  function handleCoordInput(field: 'lat' | 'lng', value: string) {
    if (field === 'lat') setInputLat(value);
    else setInputLng(value);

    const numLat = field === 'lat' ? parseFloat(value) : parseFloat(inputLat);
    const numLng = field === 'lng' ? parseFloat(value) : parseFloat(inputLng);

    if (isFinite(numLat) && isFinite(numLng) && markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([numLat, numLng]);
      mapRef.current.panTo([numLat, numLng]);
      onChange?.(numLat, numLng);
    }
  }

  const label = fuzzed
    ? 'Approximate location (fuzzed for privacy)'
    : 'Location map';

  return (
    <div class="map-island">
      <div
        ref={containerRef}
        class="map-container"
        aria-label={label}
        role="application"
        tabIndex={mode === 'display' ? 0 : undefined}
        style={{ height: '300px', width: '100%' }}
      />
      {mode === 'picker' && (
        <div class="map-coords" role="group" aria-label="Manual coordinate input">
          <label>
            Latitude
            <input
              type="number"
              step="0.000001"
              value={inputLat}
              onInput={(e) => handleCoordInput('lat', (e.target as HTMLInputElement).value)}
              aria-label="Latitude"
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="0.000001"
              value={inputLng}
              onInput={(e) => handleCoordInput('lng', (e.target as HTMLInputElement).value)}
              aria-label="Longitude"
            />
          </label>
        </div>
      )}
    </div>
  );
}
