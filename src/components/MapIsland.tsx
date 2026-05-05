import { useEffect, useRef, useState, useCallback } from 'preact/hooks';

interface MapIslandProps {
  mode: 'display' | 'picker';
  lat: number;
  lng: number;
  fuzzed?: boolean;
  onChange?: (lat: number, lng: number) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: { city?: string; town?: string; country?: string };
}

function getDistanceUnit(): 'km' | 'mi' {
  const IMPERIAL = new Set(['US', 'LR', 'MM']);
  try {
    // navigator.languages often contains explicit region tags (e.g. 'en-US')
    for (const lang of Array.from(navigator.languages ?? [navigator.language])) {
      const region = new Intl.Locale(lang).region;
      if (region) return IMPERIAL.has(region) ? 'mi' : 'km';
    }
    // Fall back to likely-subtag expansion on the base language
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region) return IMPERIAL.has(region) ? 'mi' : 'km';
  } catch { /* ignore */ }
  return 'km';
}

function formatFuzzNote(unit: 'km' | 'mi'): string {
  return unit === 'mi'
    ? 'Your pin will be offset by at least 300 ft for privacy.'
    : 'Your pin will be offset by at least 100 m for privacy.';
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

export default function MapIsland({ mode, lat, lng, fuzzed = false, onChange }: MapIslandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<import('leaflet').Map    | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);

  const [inputLat,   setInputLat]   = useState(lat.toFixed(6));
  const [inputLng,   setInputLng]   = useState(lng.toFixed(6));
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [distUnit,   setDistUnit]   = useState<'km' | 'mi'>('km');
  const searchRef = useRef<HTMLDivElement>(null);

  // Detect locale-based unit on mount
  useEffect(() => { setDistUnit(getDistanceUnit()); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Initialise Leaflet
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      import('leaflet/dist/leaflet.css');

      const isDefaultCenter = lat === 20 && lng === 0;

      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: isDefaultCenter ? 4 : 13,
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

      // Custom CSS-rendered marker — no external image
      const icon = L.divIcon({
        className: '',
        html: '<div class="map-custom-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([lat, lng], {
        icon,
        draggable: mode === 'picker',
      }).addTo(map);

      if (mode === 'picker') {
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const nLat = parseFloat(pos.lat.toFixed(6));
          const nLng = parseFloat(pos.lng.toFixed(6));
          setInputLat(nLat.toString());
          setInputLng(nLng.toString());
          onChange?.(nLat, nLng);
        });

        map.on('click', (e) => {
          const nLat = parseFloat(e.latlng.lat.toFixed(6));
          const nLng = parseFloat(e.latlng.lng.toFixed(6));
          marker.setLatLng([nLat, nLng]);
          setInputLat(nLat.toString());
          setInputLng(nLng.toString());
          onChange?.(nLat, nLng);
        });
      }

      mapRef.current    = map;
      markerRef.current = marker;

      // If no location was pre-filled (EXIF or previous input), pan to IP geolocation
      if (mode === 'picker' && isDefaultCenter) {
        fetch('/api/v1/geo')
          .then(r => r.ok ? r.json<{ lat: number | null; lng: number | null }>() : null)
          .then(data => {
            if (data?.lat != null && data?.lng != null && mapRef.current) {
              mapRef.current.setView([data.lat, data.lng], 10);
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
  }, []);

  // Text input → move marker
  function handleCoordInput(field: 'lat' | 'lng', value: string) {
    if (field === 'lat') setInputLat(value);
    else setInputLng(value);

    const nLat = field === 'lat' ? parseFloat(value) : parseFloat(inputLat);
    const nLng = field === 'lng' ? parseFloat(value) : parseFloat(inputLng);

    if (isFinite(nLat) && isFinite(nLng) && markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([nLat, nLng]);
      mapRef.current.panTo([nLat, nLng]);
      onChange?.(nLat, nLng);
    }
  }

  // Geocoding search (Nominatim)
  const runSearch = useCallback((q: string) => {
    if (q.trim().length < 3) { setResults([]); return; }
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { Accept: 'application/json' } },
        );
        const data = await res.json<SearchResult[]>();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  function handleSearchInput(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    setQuery(q);
    runSearch(q);
  }

  function selectResult(r: SearchResult) {
    const nLat = parseFloat(parseFloat(r.lat).toFixed(6));
    const nLng = parseFloat(parseFloat(r.lon).toFixed(6));
    setInputLat(nLat.toString());
    setInputLng(nLng.toString());
    setQuery(r.name ?? r.display_name.split(',')[0]);
    setResults([]);
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([nLat, nLng]);
      mapRef.current.setView([nLat, nLng], 14);
    }
    onChange?.(nLat, nLng);
  }

  const label = fuzzed ? 'Approximate location (offset for privacy)' : 'Location map';

  return (
    <div class="map-island">
      {mode === 'picker' && (
        <div class="map-search" ref={searchRef}>
          <input
            type="search"
            class="form-input map-search-input"
            placeholder="Search for a place name…"
            value={query}
            onInput={handleSearchInput}
            aria-label="Search location by name"
            aria-autocomplete="list"
            aria-controls="map-search-results"
            autoComplete="off"
          />
          {searching && (
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:0.75rem;color:var(--text-muted)" aria-live="polite">
              Searching…
            </span>
          )}
          {results.length > 0 && (
            <div
              id="map-search-results"
              class="map-search-results"
              role="listbox"
              aria-label="Search results"
            >
              {results.map((r, i) => {
                const name = r.name ?? r.display_name.split(',')[0];
                const detail = r.display_name;
                return (
                  <div
                    key={i}
                    class="map-search-result"
                    role="option"
                    tabIndex={0}
                    onClick={() => selectResult(r)}
                    onKeyDown={(e) => e.key === 'Enter' && selectResult(r)}
                  >
                    <div class="map-search-result-name">{name}</div>
                    <div class="map-search-result-detail">{detail}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        class="map-container"
        aria-label={label}
        role="application"
        tabIndex={mode === 'display' ? 0 : undefined}
        style={{ height: '300px', width: '100%' }}
      />

      {mode === 'picker' && (
        <>
          <div class="map-coords" role="group" aria-label="Manual coordinate entry">
            <div class="form-group" style="margin:0">
              <label class="form-label" for="map-lat">Latitude</label>
              <input
                id="map-lat"
                type="number"
                class="form-input"
                step="0.000001"
                min="-90"
                max="90"
                value={inputLat}
                onInput={(e) => handleCoordInput('lat', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label" for="map-lng">Longitude</label>
              <input
                id="map-lng"
                type="number"
                class="form-input"
                step="0.000001"
                min="-180"
                max="180"
                value={inputLng}
                onInput={(e) => handleCoordInput('lng', (e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
          <p class="map-fuzz-note" aria-live="polite">
            🔒 {formatFuzzNote(distUnit)}
          </p>
        </>
      )}
    </div>
  );
}
