"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { DownloadUrlDto } from "@/lib/types";

const cache = new Map<string, string>();
// One picture is drawn at a time: each uses a WebGL context, and a browser only allows a handful.
let queue: Promise<unknown> = Promise.resolve();
const MAX_BYTES = 60 * 1024 * 1024;

async function render(caseId: string, fileId: string): Promise<string> {
  const { downloadUrl } = await api<DownloadUrlDto>(`/cases/${caseId}/files/${fileId}/download-url`);
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error("download");
  const buffer = await res.arrayBuffer();
  const THREE = await import("three");
  const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
  const geometry = new STLLoader().parse(buffer);
  if (!geometry.attributes.position || geometry.attributes.position.count === 0) throw new Error("empty");
  geometry.computeVertexNormals();
  geometry.center();
  geometry.computeBoundingSphere();
  const radius = geometry.boundingSphere?.radius || 1;
  const w = 320;
  const h = 200;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h);
  renderer.setClearColor(0x14243b);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, w / h, radius / 100, radius * 100);
  camera.position.set(0, -radius * 0.5, radius * 3);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(radius, radius * 2, radius * 3);
  scene.add(key);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xc9d1dc, roughness: 0.55, metalness: 0.05 }));
  scene.add(mesh);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  geometry.dispose();
  mesh.material.dispose();
  renderer.dispose();
  return url;
}

/** A small picture of an STL scan, drawn in the browser the first time it scrolls into view and remembered after that. */
export function StlThumb({ caseId, fileId, sizeBytes, label }: { caseId: string; fileId: string; sizeBytes: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(cache.get(fileId) ?? null);
  const [failed, setFailed] = useState(sizeBytes > MAX_BYTES);

  useEffect(() => {
    if (src || failed) return;
    const el = box.current;
    if (!el) return;
    let cancelled = false;
    const obs = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      queue = queue.then(() => (cancelled ? undefined : render(caseId, fileId).then((u) => { cache.set(fileId, u); if (!cancelled) setSrc(u); }).catch(() => { if (!cancelled) setFailed(true); })));
    });
    obs.observe(el);
    return () => { cancelled = true; obs.disconnect(); };
  }, [caseId, fileId, src, failed]);

  return (
    <div ref={box} className="relative flex h-[130px] items-center justify-center overflow-hidden bg-[#14243B]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <svg width="96" height="60" viewBox="0 0 160 100" aria-hidden="true" className={failed ? "" : "tz-pulse"}>
          <path d="M18 80C10 42 38 14 80 14s70 28 62 66c-8 8-20 4-26-6-5-9-12-10-18-2-6 8-14 8-20 0-6-8-13-7-18 2-6 10-18 14-26 6z" fill="#8E9AAB" />
        </svg>
      )}
    </div>
  );
}
