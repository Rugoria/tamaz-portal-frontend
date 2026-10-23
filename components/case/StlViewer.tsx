"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { api } from "@/lib/api";
import type { CaseFileDto, DownloadUrlDto } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogActions } from "@/components/ui/Dialog";

/**
 * Looks at a stored STL scan in the browser: drag to turn, scroll to zoom. The file is read straight from storage with
 * a short-lived address (it never passes through the backend). three.js is loaded only when someone opens a scan.
 */
export function StlViewerDialog({ caseId, file, onClose }: { caseId: string; file: CaseFileDto; onClose: () => void }) {
  const t = useT();
  const mount = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let disposed = false;
    let cleanup: () => void = () => {};
    (async () => {
      try {
        const { downloadUrl } = await api<DownloadUrlDto>(`/cases/${caseId}/files/${file.id}/download-url`);
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error("download");
        const buffer = await res.arrayBuffer();
        const THREE = await import("three");
        const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
        if (disposed || !mount.current) return;

        const geometry = new STLLoader().parse(buffer);
        if (!geometry.attributes.position || geometry.attributes.position.count === 0) throw new Error("empty");
        geometry.computeVertexNormals();
        geometry.center();
        geometry.computeBoundingSphere();
        const radius = geometry.boundingSphere?.radius || 1;

        const el = mount.current;
        const width = el.clientWidth || 600;
        const height = el.clientHeight || 420;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.setClearColor(0xeef3f9);
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, width / height, radius / 100, radius * 100);
        camera.position.set(0, -radius * 0.6, radius * 3);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1));
        const key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(radius, radius * 2, radius * 3);
        scene.add(key);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.55, metalness: 0.05 }));
        scene.add(mesh);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        let frame = 0;
        const loop = () => {
          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(loop);
        };
        loop();
        const onResize = () => {
          const w = el.clientWidth || width;
          const h = el.clientHeight || height;
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", onResize);
        cleanup = () => {
          cancelAnimationFrame(frame);
          window.removeEventListener("resize", onResize);
          controls.dispose();
          geometry.dispose();
          mesh.material.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        };
        setState("ready");
      } catch {
        if (!disposed) setState("failed");
      }
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [caseId, file.id]);

  return (
    <Dialog title={file.originalFilename} onClose={onClose} width={760}>
      <div className="relative h-[420px] w-full overflow-hidden rounded-xl bg-[#EEF3F9]" role="img" aria-label={t("3D view of {name}", { name: file.originalFilename })}>
        <div ref={mount} className="h-full w-full" />
        {state === "loading" && <div className="tz-pulse absolute inset-0 flex items-center justify-center text-muted">{t("Loading the 3D model")}</div>}
        {state === "failed" && <div role="alert" className="absolute inset-0 flex items-center justify-center px-6 text-center text-red">{t("We couldn't show this model. You can still download it.")}</div>}
      </div>
      <div className="text-sm text-muted">{t("Drag to turn the model, scroll to zoom.")}</div>
      <DialogActions>
        <Button onClick={onClose}>{t("Close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
