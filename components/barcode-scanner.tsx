"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: {
      new (opts?: { formats?: string[] }): Detector;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

/** Scanner: BarcodeDetector nativo; fallback html5-qrcode. */
export function BarcodeScanner({ onDetect, onClose }: { onDetect: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackId = "barcode-fallback";
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"native" | "fallback" | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let html5: { stop: () => Promise<void>; clear: () => void } | null = null;
    const done = (code: string) => {
      if (stopped) return;
      stopped = true;
      navigator.vibrate?.(60);
      onDetect(code);
    };

    async function startNative() {
      const supported = (await window.BarcodeDetector!.getSupportedFormats?.()) ?? FORMATS;
      const detector = new window.BarcodeDetector!({ formats: FORMATS.filter((f) => supported.includes(f)) });
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(v);
          if (codes[0]?.rawValue) return done(codes[0].rawValue);
        } catch {}
        raf = requestAnimationFrame(tick);
      };
      tick();
    }

    async function startFallback() {
      const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
      const s = new Html5Qrcode(fallbackId, {
        formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128],
        verbose: false,
      });
      html5 = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 260, height: 140 } }, (text) => done(text), () => {});
    }

    (async () => {
      try {
        if (window.BarcodeDetector) {
          setMode("native");
          await startNative();
        } else {
          setMode("fallback");
          await startFallback();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível acessar a câmera.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      html5?.stop().then(() => html5?.clear()).catch(() => {});
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium">Aponte para o código de barras</p>
        <Button variant="secondary" size="sm" onClick={onClose}>Fechar</Button>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-2xl">
        {mode === "native" && <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />}
        {mode === "fallback" && <div id={fallbackId} className="h-full w-full" />}
        {mode === "native" && <div className="pointer-events-none absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 rounded-xl border-2 border-white/80" />}
      </div>
      {error && <p className="mt-3 rounded-lg bg-danger/30 p-2 text-sm">{error}</p>}
    </div>
  );
}
