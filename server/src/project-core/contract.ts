import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { ApiError } from '../security.js';

export const PROJECT_FORMAT = 'JSON_V1' as const;
export const MAX_PROJECTS = 10;
export const MAX_REVISIONS = 50;
export const MAX_ASSETS = 8;
export const MAX_DOCUMENT_BYTES = 16384;
export const MAX_SOURCE_PNG_BYTES = 98304;
export const MAX_STORED_PNG_BYTES = 131072;

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export type JsonObject = { [key: string]: JsonValue };
export type AssetDigest = { id: string; sha256: string };
const invalidDocument = () => new ApiError(422, 'DOCUMENT_INVALID', 'Use a bounded JSON object for this private project.');
export const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

/** Canonical data-only document: no executable/project semantics, grades or permissions. */
export function normalizeDocument(input: unknown): { document: JsonObject; canonical: string } {
  let nodes = 0;
  const visit = (value: unknown, depth: number): JsonValue => {
    if (++nodes > 384 || depth > 12) throw invalidDocument();
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.length > 2000) throw invalidDocument();
      return value;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw invalidDocument();
      return value;
    }
    if (Array.isArray(value)) {
      if (value.length > 128) throw invalidDocument();
      return value.map((item) => visit(item, depth + 1));
    }
    if (typeof value !== 'object' ||
        (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null))
      throw invalidDocument();
    const keys = Object.keys(value);
    if (keys.length > 64) throw invalidDocument();
    const result: JsonObject = Object.create(null) as JsonObject;
    for (const key of keys.sort()) {
      if (!key || key.length > 80 || [...key].some((ch) => ch.charCodeAt(0) < 32) ||
          ['__proto__', 'constructor', 'prototype'].includes(key))
        throw invalidDocument();
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (!property || !('value' in property)) throw invalidDocument();
      result[key] = visit(property.value, depth + 1);
    }
    return result;
  };
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalidDocument();
  const document = visit(input, 0) as JsonObject;
  const canonical = JSON.stringify(document);
  if (Buffer.byteLength(canonical, 'utf8') > MAX_DOCUMENT_BYTES)
    throw new ApiError(413, 'PROJECT_TOO_LARGE', 'Project data exceeds the private storage limit.');
  return { document, canonical };
}

/** Asset IDs are an explicit manifest; a later editor adapter must map its own format to it. */
export function checkedAssetIds(ids: string[]): string[] {
  const sorted = [...ids].sort();
  if (sorted.length > MAX_ASSETS || sorted.some((id, i) => i > 0 && id === sorted[i - 1]))
    throw new ApiError(422, 'ASSET_MANIFEST_INVALID', 'List each owned asset once, up to the private limit.');
  return sorted;
}

export function revisionDigest(canonicalDocument: string, assets: AssetDigest[]): string {
  return sha256(JSON.stringify({ format: PROJECT_FORMAT, document: JSON.parse(canonicalDocument), assets }));
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const strictBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
/** Validate image bytes, CRC and pixel budget, then strip metadata by re-encoding RGBA PNG. */
export function normalizePng(dataBase64: string, expectedSha256: string) {
  if (dataBase64.length > Math.ceil(MAX_SOURCE_PNG_BYTES / 3) * 4)
    throw new ApiError(413, 'ASSET_TOO_LARGE', 'Image exceeds the private PNG limit.');
  if (!dataBase64 || !strictBase64.test(dataBase64))
    throw new ApiError(422, 'ASSET_INVALID', 'Provide a valid PNG image in canonical base64.');
  const raw = Buffer.from(dataBase64, 'base64');
  if (raw.length > MAX_SOURCE_PNG_BYTES)
    throw new ApiError(413, 'ASSET_TOO_LARGE', 'Image exceeds the private PNG limit.');
  if (!raw.subarray(0, 8).equals(signature) || raw.length < 33 ||
      raw.readUInt32BE(8) !== 13 || raw.toString('ascii', 12, 16) !== 'IHDR')
    throw new ApiError(422, 'ASSET_INVALID', 'Only PNG images with a valid header are accepted.');
  if (sha256(raw) !== expectedSha256)
    throw new ApiError(422, 'ASSET_HASH_MISMATCH', 'Image bytes did not match the supplied digest.');
  const width = raw.readUInt32BE(16);
  const height = raw.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 1024 || height > 1024 || width * height > 1048576)
    throw new ApiError(413, 'IMAGE_DIMENSIONS', 'Image exceeds the private pixel limit.');
  let decoded: PNG;
  try {
    decoded = PNG.sync.read(raw, { checkCRC: true });
  } catch {
    throw new ApiError(422, 'ASSET_INVALID', 'The PNG image could not be decoded safely.');
  }
  if (decoded.width !== width || decoded.height !== height ||
      decoded.data.length !== width * height * 4)
    throw new ApiError(422, 'ASSET_INVALID', 'The decoded image dimensions did not match.');
  const content = PNG.sync.write(decoded, { colorType: 6, inputHasAlpha: true });
  if (content.length > MAX_STORED_PNG_BYTES)
    throw new ApiError(413, 'ASSET_TOO_LARGE', 'The normalized PNG exceeds the storage limit.');
  return { content, contentSha256: sha256(content), sourceSha256: sha256(raw), width, height };
}
