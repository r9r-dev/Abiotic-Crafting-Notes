import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Import dynamique pour éviter les erreurs SSR
declare global {
  interface Window {
    VANTA: {
      NET: (config: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

interface VantaBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function VantaBackground({ children, className = "" }: VantaBackgroundProps) {
  const vantaRef = useRef<HTMLDivElement>(null);
  const [vantaEffect, setVantaEffect] = useState<{ destroy: () => void } | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadVanta = async () => {
      if (vantaEffect) return;

      try {
        // Import dynamique de Vanta NET
        const VANTA = await import("vanta/dist/vanta.net.min");

        if (!mounted || !vantaRef.current) return;

        const effect = VANTA.default({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          // Couleurs theme scientifique vert
          color: 0x22c55e,        // Vert principal (lignes)
          backgroundColor: 0x0a0f14, // Fond sombre
          points: 8.0,            // Densite des points
          maxDistance: 20.0,      // Distance max des connexions
          spacing: 18.0,          // Espacement
          showDots: true,         // Afficher les points
        });

        setVantaEffect(effect);
      } catch (error) {
        console.error("Erreur chargement Vanta:", error);
      }
    };

    loadVanta();

    return () => {
      mounted = false;
      if (vantaEffect) {
        vantaEffect.destroy();
      }
    };
  }, [vantaEffect]);

  return (
    <div ref={vantaRef} className={`relative ${className}`}>
      {/* Overlay sombre pour attenuer l'effet */}
      <div className="absolute inset-0 bg-background/60 z-[1]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
