import { Unzlib, zlibSync } from "three/examples/jsm/libs/fflate.module.js";

/** Storage only: exports and the game schema remain ordinary lossless JSON. */
export const SAVE_CODEC_RULES = {
  version: 1,
  minimumCharacters: 262144,
  maximumDecodedBytes: 64 * 1024 * 1024,
  maximumCompressedBytes: 65 * 1024 * 1024,
  inflateInputChunkBytes: 1024,
  packedCharacterBase: 0x4000,
} as const;
type Envelope = {
  hearthwildStorage: 1;
  codec: "zlib-utf15";
  utf8Bytes: number;
  compressedBytes: number;
  adler32: number;
  data: string;
};
const failure = () => new Error("Invalid or oversized compressed village checkpoint");
export function isStoredSaveEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.hasOwn(value, "hearthwildStorage")
  );
}
export function packStorageBytes(bytes: Uint8Array) {
  let acc = 0,
    bits = 0;
  const parts: string[] = [],
    codes: number[] = [];
  const append = (v: number) => {
    codes.push(SAVE_CODEC_RULES.packedCharacterBase + v);
    if (codes.length === 4096) {
      parts.push(String.fromCharCode(...codes));
      codes.length = 0;
    }
  };
  for (const byte of bytes) {
    acc |= byte << bits;
    bits += 8;
    while (bits >= 15) {
      append(acc & 32767);
      acc >>>= 15;
      bits -= 15;
    }
  }
  if (bits) append(acc);
  if (codes.length) parts.push(String.fromCharCode(...codes));
  return parts.join("");
}
export function unpackStorageBytes(text: string, length: number) {
  if (
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > SAVE_CODEC_RULES.maximumCompressedBytes ||
    text.length !== Math.ceil((length * 8) / 15)
  )
    throw failure();
  const out = new Uint8Array(length);
  let acc = 0,
    bits = 0,
    offset = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - SAVE_CODEC_RULES.packedCharacterBase;
    if (code < 0 || code > 32767) throw failure();
    acc |= code << bits;
    bits += 15;
    while (bits >= 8 && offset < length) {
      out[offset++] = acc & 255;
      acc >>>= 8;
      bits -= 8;
    }
  }
  if (offset !== length || acc !== 0) throw failure();
  return out;
}
function adler32(bytes: Uint8Array) {
  let a = 1,
    b = 0;
  for (let i = 0; i < bytes.length;) {
    const end = Math.min(bytes.length, i + 5552);
    for (; i < end; i++) {
      a += bytes[i];
      b += a;
    }
    a %= 65521;
    b %= 65521;
  }
  return ((b << 16) | a) >>> 0;
}
function inflateEnvelope(value: Record<string, unknown>) {
  const e = value as unknown as Envelope,
    r = SAVE_CODEC_RULES;
  if (
    Object.keys(value).length !== 6 ||
    e.hearthwildStorage !== 1 ||
    e.codec !== "zlib-utf15" ||
    !Number.isSafeInteger(e.utf8Bytes) ||
    e.utf8Bytes < 1 ||
    e.utf8Bytes > r.maximumDecodedBytes ||
    !Number.isSafeInteger(e.compressedBytes) ||
    e.compressedBytes < 8 ||
    e.compressedBytes > r.maximumCompressedBytes ||
    !Number.isSafeInteger(e.adler32) ||
    e.adler32 < 0 ||
    e.adler32 > 0xffffffff ||
    typeof e.data !== "string"
  )
    throw failure();
  const compressed = unpackStorageBytes(e.data, e.compressedBytes),
    end = compressed.length,
    tail =
      ((compressed[end - 4] << 24) |
        (compressed[end - 3] << 16) |
        (compressed[end - 2] << 8) |
        compressed[end - 1]) >>>
      0;
  if (tail !== e.adler32) throw failure();
  // Never preallocate a forgeable advertised output size. Small compressed input
  // chunks bound each inflate increment; reject excess output before retaining it.
  // A dishonest header cannot request an unbounded temporary expansion.
  const chunks: Uint8Array[] = [];
  let length = 0,
    finished = false;
  const inflater = new Unzlib((chunk, final) => {
    if (length + chunk.length > e.utf8Bytes || length + chunk.length > r.maximumDecodedBytes)
      throw failure();
    if (chunk.length) {
      chunks.push(chunk);
      length += chunk.length;
    }
    finished = final;
  });
  try {
    for (let i = 0; i < compressed.length; i += r.inflateInputChunkBytes)
      inflater.push(
        compressed.subarray(i, i + r.inflateInputChunkBytes),
        i + r.inflateInputChunkBytes >= compressed.length,
      );
  } catch {
    throw failure();
  }
  if (!finished || length !== e.utf8Bytes) throw failure();
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  if (adler32(bytes) !== e.adler32) throw failure();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw failure();
  }
}
export function encodeStoredJson(json: string) {
  if (json.length < SAVE_CODEC_RULES.minimumCharacters) return json;
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > SAVE_CODEC_RULES.maximumDecodedBytes) throw failure();
  const compressed = zlibSync(bytes, { level: 6 });
  if (compressed.length > SAVE_CODEC_RULES.maximumCompressedBytes) throw failure();
  const envelope: Envelope = {
    hearthwildStorage: 1,
    codec: "zlib-utf15",
    utf8Bytes: bytes.length,
    compressedBytes: compressed.length,
    adler32: adler32(bytes),
    data: packStorageBytes(compressed),
  };
  const stored = JSON.stringify(envelope);
  return stored.length < json.length ? stored : json;
}
export function serializeStoredSave(value: unknown) {
  return encodeStoredJson(JSON.stringify(value));
}
export function unpackStoredJson(stored: string) {
  const parsed: unknown = JSON.parse(stored);
  return isStoredSaveEnvelope(parsed) ? inflateEnvelope(parsed) : stored;
}
export function parseStoredSave(stored: string): unknown {
  const parsed: unknown = JSON.parse(stored);
  return isStoredSaveEnvelope(parsed) ? JSON.parse(inflateEnvelope(parsed)) : parsed;
}
