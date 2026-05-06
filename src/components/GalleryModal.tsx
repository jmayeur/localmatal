import { useEffect, useRef } from 'preact/hooks';
import type { Signal } from '@preact/signals'; // eslint-disable-line @typescript-eslint/no-unused-vars
import { signal } from '@preact/signals';
import MapIsland from './MapIsland';

export interface GalleryPlace {
  id: string;
  place_name: string;
  contributor_name: string;
  sentence: string;
  lat: number;
  lng: number;
  modalUrl: string;
}

export const activePlace = signal<GalleryPlace | null>(null);

export function openModal(place: GalleryPlace) {
  activePlace.value = place;
}

export function GalleryModal() {
  const place = activePlace.value;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const prevTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (place) {
      prevTriggerRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [place]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    function onClose() {
      activePlace.value = null;
      prevTriggerRef.current?.focus();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        activePlace.value = null;
      }
    }

    dialog.addEventListener('close', onClose);
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogRef.current) {
      activePlace.value = null;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={place?.place_name ?? 'Place detail'}
      onClick={handleBackdropClick}
      style={{
        maxWidth: '640px',
        width: '90vw',
        padding: '1.5rem',
        borderRadius: '4px',
        border: '1px solid var(--border)',
      }}
    >
      {place && (
        <>
          <button
            onClick={() => {
              activePlace.value = null;
            }}
            aria-label="Close"
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              minHeight: '44px',
              minWidth: '44px',
            }}
          >
            ✕
          </button>
          <img
            src={place.modalUrl}
            alt={place.sentence}
            style={{ width: '100%', height: 'auto', borderRadius: '2px', marginBottom: '1rem' }}
          />
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 'normal' }}>
            {place.place_name}
          </h2>
          <p style={{ fontStyle: 'italic', margin: '0 0 0.25rem' }}>"{place.sentence}"</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 1rem' }}>
            — {place.contributor_name}
          </p>
          <MapIsland mode="display" lat={place.lat} lng={place.lng} fuzzed={true} />
          <p style={{ marginTop: '1rem' }}>
            <a href={`/place/${place.id}`} style={{ color: 'var(--accent)' }}>
              View permalink →
            </a>
          </p>
        </>
      )}
    </dialog>
  );
}
