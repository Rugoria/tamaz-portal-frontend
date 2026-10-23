"use client";

/** Simple line drawings for an empty photo slot, chosen from the slot's name (our own drawings, not copied from anywhere). */
const ART: Record<string, [string, string]> = {
  face: ["M40 6c-11 0-16 9-16 21 0 12 7 23 16 23s16-11 16-23C56 15 51 6 40 6z", "M33 25h.1M47 25h.1M34 37q6 5 12 0"],
  smile: ["M10 30q30-24 60 0q-30 22-60 0z", "M18 30q22 9 44 0M40 23v14"],
  front: ["M12 22q0-4 4-4h48q4 0 4 4v16q0 4-4 4H16q-4 0-4-4z", "M12 30h56M26 18v24M40 18v24M54 18v24"],
  side: ["M8 40q0-20 32-20q32 0 32 8v12q0 4-4 4H12q-4 0-4-4z", "M22 30v16M34 28v18M46 28v18M58 30v16"],
  occ: ["M14 50q-4-38 26-38t26 38", "M24 44q-2-22 16-22t16 22M40 16v8"],
  profile: ["M28 6q20 0 20 22l7 10-7 3v7q0 9-12 11H26q-3-24 2-53z", "M41 23h.1M32 44q6 4 12 0"],
  pano: ["M6 12h68v36H6z", "M14 38q26-26 52 0M20 42q20 8 40 0"],
  xray: ["M18 6h44v48H18z", "M28 38q12-20 24 0M32 44h16"],
  generic: ["M8 14h64v38H8z", "M8 44l18-16 14 12 12-10 20 18M54 26h.1"],
};

export function artFor(label: string): { key: keyof typeof ART; flipX: boolean; flipY: boolean } {
  const l = label.toLowerCase();
  const right = /\bright\b/.test(l);
  if (/pano/.test(l)) return { key: "pano", flipX: false, flipY: false };
  if (/x-?ray|ceph/.test(l)) return { key: "xray", flipX: false, flipY: false };
  if (/profile/.test(l)) return { key: "profile", flipX: right, flipY: false };
  if (/occlusal|upper|lower/.test(l)) return { key: "occ", flipX: false, flipY: /lower/.test(l) };
  if (/smile/.test(l)) return { key: "smile", flipX: false, flipY: false };
  if (/face/.test(l)) return { key: "face", flipX: false, flipY: false };
  if (/front/.test(l)) return { key: "front", flipX: false, flipY: false };
  if (/left|right|side/.test(l)) return { key: "side", flipX: right, flipY: false };
  return { key: "generic", flipX: false, flipY: false };
}

export function SlotArt({ label, stroke = "#7E93AE", size = 64 }: { label: string; stroke?: string; size?: number }) {
  const a = artFor(label);
  const [d, d2] = ART[a.key];
  return (
    <svg width={size} height={(size * 60) / 80} viewBox="0 0 80 60" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: `${a.flipX ? "scaleX(-1)" : ""} ${a.flipY ? "scaleY(-1)" : ""}`.trim() || "none" }}>
      <path d={d} />
      <path d={d2} />
    </svg>
  );
}
