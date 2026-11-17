export type GuidVersion = "v4" | "v7" | "v1" | "nil";

export type GuidSettings = {
  version: GuidVersion;
  uppercase: boolean;
  braces: boolean;
  hyphens: boolean;
};

export const DEFAULT_SETTINGS: GuidSettings = {
  version: "v4",
  uppercase: false,
  braces: false,
  hyphens: true,
};

export const VERSION_INFO: Record<GuidVersion, { label: string; description: string }> = {
  v4: { label: "Version 4 (random)", description: "122 random bits. The usual choice." },
  v7: { label: "Version 7 (time-ordered)", description: "Unix ms timestamp + random bits. Sortable by creation time." },
  v1: { label: "Version 1 (time-based)", description: "Gregorian timestamp + random clock sequence and node." },
  nil: { label: "Nil GUID", description: "All zeros: 00000000-0000-0000-0000-000000000000." },
};

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

function setVersionAndVariant(b: Uint8Array, version: number): void {
  b[6] = (b[6]! & 0x0f) | (version << 4);
  b[8] = (b[8]! & 0x3f) | 0x80; // RFC 9562 variant
}

function v4(): Uint8Array {
  const b = random(16);
  setVersionAndVariant(b, 4);
  return b;
}

function v7(): Uint8Array {
  const b = random(16);
  let ms = BigInt(Date.now());
  for (let i = 5; i >= 0; i--) {
    b[i] = Number(ms & 0xffn);
    ms >>= 8n;
  }
  setVersionAndVariant(b, 7);
  return b;
}

function v1(): Uint8Array {
  const b = random(16);
  // 100ns intervals since 1582-10-15, with random sub-ms precision.
  const t =
    BigInt(Date.now()) * 10000n + 122192928000000000n + BigInt(Math.floor(Math.random() * 10000));
  const timeLow = t & 0xffffffffn;
  const timeMid = (t >> 32n) & 0xffffn;
  const timeHi = (t >> 48n) & 0x0fffn;
  b[0] = Number(timeLow >> 24n);
  b[1] = Number((timeLow >> 16n) & 0xffn);
  b[2] = Number((timeLow >> 8n) & 0xffn);
  b[3] = Number(timeLow & 0xffn);
  b[4] = Number(timeMid >> 8n);
  b[5] = Number(timeMid & 0xffn);
  b[6] = Number(timeHi >> 8n);
  b[7] = Number(timeHi & 0xffn);
  setVersionAndVariant(b, 1);
  b[10] = b[10]! | 0x01; // multicast bit: random node, not a real MAC
  return b;
}

export function generateGuid(s: GuidSettings): string {
  const bytes =
    s.version === "v7" ? v7() : s.version === "v1" ? v1() : s.version === "nil" ? new Uint8Array(16) : v4();
  const hex = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
  let out = s.hyphens
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    : hex;
  if (s.uppercase) out = out.toUpperCase();
  if (s.braces) out = `{${out}}`;
  return out;
}

export function parseSettings(raw: unknown): GuidSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<GuidSettings>;
  return {
    version: r.version && r.version in VERSION_INFO ? r.version : DEFAULT_SETTINGS.version,
    uppercase: typeof r.uppercase === "boolean" ? r.uppercase : DEFAULT_SETTINGS.uppercase,
    braces: typeof r.braces === "boolean" ? r.braces : DEFAULT_SETTINGS.braces,
    hyphens: typeof r.hyphens === "boolean" ? r.hyphens : DEFAULT_SETTINGS.hyphens,
  };
}
