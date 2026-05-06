import { AppError, ErrorCode } from './errors';
import { buildR2Key } from './r2';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const MAGIC: Record<string, Uint8Array> = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff]),
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  webp: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF…WEBP (checked below)
  heic: new Uint8Array([0x00, 0x00, 0x00]), // ftyp box, checked below
};

function matchesMagic(buf: Uint8Array, magic: Uint8Array, offset = 0) {
  for (let i = 0; i < magic.length; i++) {
    if (buf[offset + i] !== magic[i]) return false;
  }
  return true;
}

function detectType(buf: Uint8Array): 'jpeg' | 'png' | 'webp' | 'heic' | null {
  if (matchesMagic(buf, MAGIC.jpeg)) return 'jpeg';
  if (matchesMagic(buf, MAGIC.png)) return 'png';
  if (
    matchesMagic(buf, MAGIC.webp) &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return 'webp';
  // HEIC/HEIF: ftyp box at byte 4 with 'heic', 'heix', 'mif1', 'msf1'
  if (buf.length >= 12) {
    const ftyp = String.fromCharCode(buf[4], buf[5], buf[6], buf[7]);
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (
      ftyp === 'ftyp' &&
      (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1')
    )
      return 'heic';
  }
  return null;
}

// Strip all APP1 (EXIF/XMP) markers from JPEG, returning a new Uint8Array.
function stripJpegExif(buf: Uint8Array): Uint8Array {
  const out: number[] = [0xff, 0xd8]; // SOI
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xd9) {
      out.push(0xff, 0xd9);
      break;
    } // EOI
    if (marker === 0xda) {
      // SOS — rest is entropy-coded, copy to end
      for (let j = i; j < buf.length; j++) out.push(buf[j]);
      break;
    }
    const segLen = (buf[i + 2] << 8) | buf[i + 3];
    // APP1 (0xE1) — skip EXIF/XMP
    if (marker !== 0xe1) {
      for (let j = i; j < i + 2 + segLen; j++) out.push(buf[j]);
    }
    i += 2 + segLen;
  }
  return new Uint8Array(out);
}

// Parse width/height from JPEG SOF marker.
function parseJpegDimensions(buf: Uint8Array): { width: number; height: number } | null {
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const segLen = (buf[i + 2] << 8) | buf[i + 3];
    // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF (exclude C4=DHT, C8=reserved)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8) {
      const height = (buf[i + 5] << 8) | buf[i + 6];
      const width = (buf[i + 7] << 8) | buf[i + 8];
      return { width, height };
    }
    i += 2 + segLen;
  }
  return null;
}

export interface ProcessedImage {
  r2KeyPrefix: string;
  thumbWidth: number | null;
  thumbHeight: number | null;
}

export async function processAndStoreImage(
  media: R2Bucket,
  ulid: string,
  file: File,
): Promise<ProcessedImage> {
  if (file.size > MAX_BYTES) {
    throw new AppError(ErrorCode.FILE_TOO_LARGE, 'File exceeds 10 MB limit', 400, 'photo');
  }

  const raw = new Uint8Array(await file.arrayBuffer());
  const detected = detectType(raw);
  if (!detected) {
    throw new AppError(ErrorCode.INVALID_FILE_TYPE, 'Unsupported file type', 400, 'photo');
  }

  // Strip EXIF from JPEG; leave other formats as-is for MVP
  const clean = detected === 'jpeg' ? stripJpegExif(raw) : raw;

  const ext = detected === 'heic' ? 'heic' : detected; // jpeg|png|webp|heic
  const dims = detected === 'jpeg' ? parseJpegDimensions(clean) : null;

  // MVP: store same binary under all three variant keys (no server-side resize)
  const variants = ['thumb', 'modal', 'full'] as const;
  for (const variant of variants) {
    const key = buildR2Key('pending', ulid, variant, ext);
    await media.put(key, clean, {
      httpMetadata: { contentType: `image/${detected === 'jpeg' ? 'jpeg' : detected}` },
    });
  }

  return {
    r2KeyPrefix: `pending/${ulid}`,
    thumbWidth: dims?.width ?? null,
    thumbHeight: dims?.height ?? null,
  };
}

export async function deleteR2Prefix(media: R2Bucket, prefix: string): Promise<void> {
  const listed = await media.list({ prefix });
  for (const obj of listed.objects) {
    await media.delete(obj.key);
  }
}
