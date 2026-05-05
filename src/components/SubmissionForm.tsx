import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import imageCompression from 'browser-image-compression';
import MapIsland from './MapIsland';

type PhotoState = 'idle' | 'compressing' | 'ready' | 'error';
type FormStep   = 'photo' | 'details' | 'map' | 'review';
type SubmitState = 'idle' | 'submitting' | 'success' | 'nudge' | 'error';

interface Props { currentSentence: string; }

interface FormValues {
  place_name: string;
  contributor_name: string;
  sentence: string;
  lat: number | null;
  lng: number | null;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// ─── Minimal EXIF GPS reader ──────────────────────────────────────────────────
function readExifGps(buffer: ArrayBuffer): { lat: number; lng: number } | null {
  const view = new DataView(buffer);
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null;
  let offset = 2;
  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda || marker === 0xd9) break;
    const segLen = view.getUint16(offset + 2);
    if (marker === 0xe1 && offset + 10 < view.byteLength) {
      const h = String.fromCharCode(view.getUint8(offset+4), view.getUint8(offset+5),
                                    view.getUint8(offset+6), view.getUint8(offset+7));
      if (h === 'Exif') return parseExifGps(buffer, offset + 10);
    }
    offset += 2 + segLen;
  }
  return null;
}

function parseExifGps(buffer: ArrayBuffer, tiffStart: number): { lat: number; lng: number } | null {
  try {
    const view = new DataView(buffer);
    const le = view.getUint16(tiffStart) === 0x4949;
    const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, le);
    const ifd0Count  = view.getUint16(ifd0Offset, le);
    let gpsIfdOffset = 0;
    for (let i = 0; i < ifd0Count; i++) {
      const tagOff = ifd0Offset + 2 + i * 12;
      if (view.getUint16(tagOff, le) === 0x8825) {
        gpsIfdOffset = tiffStart + view.getUint32(tagOff + 8, le);
        break;
      }
    }
    if (!gpsIfdOffset) return null;
    const gpsCount = view.getUint16(gpsIfdOffset, le);
    let latRef = 'N', lngRef = 'E';
    let latR: number[] | null = null, lngR: number[] | null = null;
    for (let i = 0; i < gpsCount; i++) {
      const tagOff = gpsIfdOffset + 2 + i * 12;
      const tag = view.getUint16(tagOff, le);
      const valOff = tiffStart + view.getUint32(tagOff + 8, le);
      if (tag === 0x01) latRef = String.fromCharCode(view.getUint8(tagOff + 8));
      else if (tag === 0x03) lngRef = String.fromCharCode(view.getUint8(tagOff + 8));
      else if (tag === 0x02) latR = readRationals(view, valOff, 3, le);
      else if (tag === 0x04) lngR = readRationals(view, valOff, 3, le);
    }
    if (!latR || !lngR) return null;
    return {
      lat: (latRef === 'S' ? -1 : 1) * (latR[0] + latR[1]/60 + latR[2]/3600),
      lng: (lngRef === 'W' ? -1 : 1) * (lngR[0] + lngR[1]/60 + lngR[2]/3600),
    };
  } catch { return null; }
}

function readRationals(v: DataView, off: number, count: number, le: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const n = v.getUint32(off + i * 8, le), d = v.getUint32(off + i * 8 + 4, le);
    out.push(d === 0 ? 0 : n / d);
  }
  return out;
}

export default function SubmissionForm({ currentSentence }: Props) {
  const [step,          setStep]          = useState<FormStep>('photo');
  const [photoState,    setPhotoState]    = useState<PhotoState>('idle');
  const [compressedFile, setCompressed]   = useState<File | null>(null);
  const [photoError,    setPhotoError]    = useState('');
  const [values,        setValues]        = useState<FormValues>({
    place_name: '', contributor_name: '', sentence: '', lat: null, lng: null,
  });
  const [submitState,   setSubmitState]   = useState<SubmitState>('idle');
  const [apiError,      setApiError]      = useState('');
  const [nudgeSentence, setNudgeSentence] = useState(currentSentence);
  const [previewUrl,    setPreviewUrl]    = useState<string | null>(null);
  const [lightboxOpen,  setLightboxOpen]  = useState(false);
  const mountTimestamp = useRef(Date.now());
  const liveRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compressedFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(compressedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [compressedFile]);

  useEffect(() => {
    if (step !== 'review') return;
    const win = window as Window & {
      turnstile?: { render: (el: HTMLElement, opts: { sitekey: string }) => void };
      __turnstileSiteKey?: string;
    };
    if (!win.__turnstileSiteKey || !turnstileRef.current) return;
    if (turnstileRef.current.childElementCount > 0) return; // already rendered
    const tryRender = () => {
      if (win.turnstile) {
        win.turnstile.render(turnstileRef.current!, { sitekey: win.__turnstileSiteKey! });
      } else {
        setTimeout(tryRender, 200);
      }
    };
    tryRender();
  }, [step]);

  const announce = useCallback((msg: string, assertive = false) => {
    if (!liveRef.current) return;
    liveRef.current.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    liveRef.current.textContent = '';
    void liveRef.current.offsetHeight;
    liveRef.current.textContent = msg;
  }, []);

  async function handleFileChange(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setPhotoError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError('Please choose a JPEG, PNG, WebP, or HEIC image.');
      announce('Please choose a JPEG, PNG, WebP, or HEIC image.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPhotoError('File is too large. Please choose an image under 20 MB.');
      announce('File is too large.');
      return;
    }
    setPhotoState('compressing');
    try {
      const buf = await file.arrayBuffer();
      const gps = readExifGps(buf);
      if (gps && values.lat === null) setValues(v => ({ ...v, lat: gps.lat, lng: gps.lng }));

      const compressed = await imageCompression(file, {
        maxSizeMB: 1, maxWidthOrHeight: 2048, useWebWorker: true, fileType: 'image/jpeg',
      });
      setCompressed(compressed);
      setPhotoState('ready');
    } catch {
      setPhotoState('error');
      setPhotoError('Could not compress the image. Please try another file.');
      announce('Could not compress the image.');
    }
  }

  const senLen = values.sentence.length;
  const senRemaining = 250 - senLen;
  useEffect(() => {
    if (senRemaining <= 50 && senRemaining >= 0) announce(`${senRemaining} characters remaining`);
  }, [senRemaining]);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!compressedFile || values.lat === null || values.lng === null) return;
    setSubmitState('submitting');
    setApiError('');
    const token = (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value ?? '';
    const fd = new FormData();
    fd.append('photo', compressedFile, compressedFile.name);
    fd.append('place_name', values.place_name);
    fd.append('contributor_name', values.contributor_name);
    fd.append('sentence', values.sentence);
    fd.append('lat', String(values.lat));
    fd.append('lng', String(values.lng));
    fd.append('website', '');
    fd.append('time_on_form', String(Date.now() - mountTimestamp.current));
    fd.append('cf-turnstile-response', token);
    try {
      const res = await fetch('/api/v1/submissions', { method: 'POST', body: fd });
      const json = await res.json<{ id?: string; error?: { code: string; message: string }; currentSentence?: string }>();
      if (res.status === 422 && json.error?.code === 'CONCEPT_OVERLAP_FAILED') {
        setNudgeSentence(json.currentSentence ?? currentSentence);
        setSubmitState('nudge');
        setStep('details');
        announce('Your description needs to connect with the previous one.', true);
        return;
      }
      if (!res.ok) {
        setApiError(json.error?.message ?? 'Something went wrong. Please try again.');
        setSubmitState('error');
        announce(json.error?.message ?? 'Something went wrong.', true);
        return;
      }
      setSubmitState('success');
    } catch {
      setApiError('Could not reach the server. Please check your connection.');
      setSubmitState('error');
      announce('Could not reach the server.', true);
    }
  }

  if (submitState === 'success') {
    return (
      <div class="submission-success" role="status">
        <p>Your place is in the queue. Thank you.</p>
      </div>
    );
  }

  return (
    <form class="submission-form" onSubmit={handleSubmit} noValidate>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} aria-hidden="true"
        style="position:absolute;left:-9999px" autoComplete="off" />
      <div ref={liveRef} aria-live="polite" aria-atomic="true" class="sr-only" />

      {/* ── Step indicator ── */}
      <div class="step-indicator" aria-label="Progress" style="font-family:var(--font-sans);font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-5)">
        {(['photo','details','map','review'] as FormStep[]).map((s, i) => (
          <span key={s} style={`font-weight:${step===s?'700':'400'};margin-right:var(--sp-3)`}>
            {i+1}. {s.charAt(0).toUpperCase()+s.slice(1)}{step===s ? ' ←' : ''}
          </span>
        ))}
      </div>

      {/* ── Step: Photo ── */}
      {step === 'photo' && (
        <section aria-label="Step 1: Choose your photo">
          <h2>Choose your photo</h2>
          <div class="form-group">
            <label class="form-label" for="photo-input">
              Upload or take a photo of a place you love
            </label>
            <input
              id="photo-input"
              type="file"
              name="photo"
              class="form-input"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={photoState === 'compressing'}
            />
            {photoState === 'compressing' && (
              <p class="form-hint" aria-live="polite">Preparing your photo…</p>
            )}
            {photoState === 'ready' && compressedFile && previewUrl && (
              <div class="photo-preview">
                <button type="button" class="photo-thumb-btn" onClick={() => setLightboxOpen(true)}
                  aria-label="View uploaded photo">
                  <img src={previewUrl} alt="Your uploaded photo" class="photo-thumb" />
                </button>
                <span>{(compressedFile.size / 1024).toFixed(0)} KB — tap to preview</span>
              </div>
            )}
            {photoError && <p class="field-error" role="alert">{photoError}</p>}
          </div>
          <div class="step-nav">
            <button type="button" class="btn btn-primary" onClick={() => setStep('details')}
              disabled={photoState !== 'ready'}>
              Next →
            </button>
          </div>
        </section>
      )}

      {/* ── Step: Details ── */}
      {step === 'details' && (
        <section aria-label="Step 2: About this place">
          <div class="details-header">
            <h2>About this place</h2>
            {previewUrl && (
              <button type="button" class="photo-thumb-btn photo-thumb-btn--sm"
                onClick={() => setLightboxOpen(true)} aria-label="View uploaded photo">
                <img src={previewUrl} alt="Your uploaded photo" class="photo-thumb photo-thumb--sm" />
              </button>
            )}
          </div>

          {submitState === 'nudge' && (
            <div class="nudge" role="alert">
              <p>The current place says: <em>"{nudgeSentence}"</em></p>
              <p>Try focusing on a feeling or image from the previous one.</p>
            </div>
          )}

          <div class="form-group">
            <label class="form-label" for="place_name">Place name</label>
            <input id="place_name" type="text" class="form-input" maxLength={100} required
              value={values.place_name}
              onInput={(e) => setValues(v => ({ ...v, place_name: (e.target as HTMLInputElement).value }))} />
          </div>

          <div class="form-group">
            <label class="form-label" for="contributor_name">Your name (or a pseudonym)</label>
            <input id="contributor_name" type="text" class="form-input" maxLength={80} required
              value={values.contributor_name}
              onInput={(e) => setValues(v => ({ ...v, contributor_name: (e.target as HTMLInputElement).value }))} />
          </div>

          <div class="form-group">
            <label class="form-label" for="sentence">
              A short description of why this place moves you
            </label>
            <textarea id="sentence" class="form-input form-textarea" rows={3} maxLength={250} required
              value={values.sentence}
              onInput={(e) => setValues(v => ({ ...v, sentence: (e.target as HTMLTextAreaElement).value }))}
              aria-describedby="sentence-count" />
            <span id="sentence-count"
              class={`form-char-count${senRemaining <= 50 ? ' warn' : ''}`}
              aria-live={senRemaining <= 50 ? 'polite' : 'off'}>
              {senLen}/250
            </span>
          </div>

          <div class="step-nav">
            <button type="button" class="btn btn-secondary" onClick={() => setStep('photo')}>← Back</button>
            <button type="button" class="btn btn-primary"
              onClick={() => setStep('map')}
              disabled={!values.place_name || !values.contributor_name || senLen < 1 || senLen > 250}>
              Next →
            </button>
          </div>
        </section>
      )}

      {/* ── Step: Map ── */}
      {step === 'map' && (
        <section aria-label="Step 3: Place on map">
          <h2>Where is it?</h2>
          <MapIsland
            mode="picker"
            lat={values.lat ?? 20}
            lng={values.lng ?? 0}
            onChange={(lat, lng) => setValues(v => ({ ...v, lat, lng }))}
          />
          <div class="step-nav">
            <button type="button" class="btn btn-secondary" onClick={() => setStep('details')}>← Back</button>
            <button type="button" class="btn btn-primary"
              onClick={() => setStep('review')}
              disabled={values.lat === null || values.lng === null}>
              Next →
            </button>
          </div>
        </section>
      )}

      {/* ── Step: Review & Submit ── */}
      {step === 'review' && (
        <section aria-label="Step 4: Review and submit">
          <h2>Review your submission</h2>
          <dl style="font-family:var(--font-sans);font-size:var(--text-sm);display:grid;grid-template-columns:auto 1fr;gap:var(--sp-1) var(--sp-4);margin:0 0 var(--sp-6)">
            <dt style="color:var(--text-muted)">Place</dt>       <dd style="margin:0">{values.place_name}</dd>
            <dt style="color:var(--text-muted)">Your name</dt>   <dd style="margin:0">{values.contributor_name}</dd>
            <dt style="color:var(--text-muted)">Sentence</dt>    <dd style="margin:0"><em>"{values.sentence}"</em></dd>
          </dl>

          {submitState === 'error' && (
            <p class="field-error" role="alert" aria-live="assertive">{apiError}</p>
          )}

          <div ref={turnstileRef} id="turnstile-widget" style="margin-bottom:var(--sp-4)" />

          <div class="step-nav">
            <button type="button" class="btn btn-secondary" onClick={() => setStep('map')}>← Back</button>
            <button type="submit" class="btn btn-primary"
              disabled={submitState === 'submitting'}>
              {submitState === 'submitting' ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </section>
      )}
      {lightboxOpen && previewUrl && (
        <div class="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo preview"
          onClick={() => setLightboxOpen(false)}>
          <button type="button" class="photo-lightbox-close" aria-label="Close preview"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}>
            ✕
          </button>
          <img src={previewUrl} alt="Your uploaded photo" class="photo-lightbox-img"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </form>
  );
}
