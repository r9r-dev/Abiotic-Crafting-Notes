declare module "vanta/dist/vanta.net.min" {
  interface VantaEffect {
    destroy: () => void;
  }

  interface VantaNetConfig {
    el: HTMLElement;
    THREE: unknown;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    backgroundColor?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
  }

  function NET(config: VantaNetConfig): VantaEffect;
  export default NET;
}
