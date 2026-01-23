import { useEffect, useRef } from "react";

interface ElectricStringsBackgroundProps {
  children: React.ReactNode;
  className?: string;
  /** Vitesse de l'animation (defaut: 1, plus grand = plus rapide) */
  speed?: number;
  /** Couleur de l'effet (defaut: "cyan", alternative: "red") */
  color?: "cyan" | "red";
}

export function ElectricStringsBackground({ children, className = "", speed = 1, color = "cyan" }: ElectricStringsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const speedRef = useRef(speed);
  const colorRef = useRef(color);

  // Mettre a jour les refs quand les props changent
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const c = canvas.getContext("2d");
    if (!c) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const mouse: { x: number | false; y: number | false } = { x: false, y: false };
    let last_target: { x?: number; y?: number } = {};
    let t = 0;

    function dist(p1x: number, p1y: number, p2x: number, p2y: number) {
      return Math.sqrt(Math.pow(p2x - p1x, 2) + Math.pow(p2y - p1y, 2));
    }

    class Segment {
      pos: { x: number; y: number };
      l: number;
      ang: number;
      nextPos: { x: number; y: number };
      first: boolean;

      constructor(parent: { x: number; y: number } | Segment, l: number, a: number, first: boolean) {
        this.first = first;
        if (first) {
          const p = parent as { x: number; y: number };
          this.pos = { x: p.x, y: p.y };
        } else {
          const p = parent as Segment;
          this.pos = { x: p.nextPos.x, y: p.nextPos.y };
        }
        this.l = l;
        this.ang = a;
        this.nextPos = {
          x: this.pos.x + this.l * Math.cos(this.ang),
          y: this.pos.y + this.l * Math.sin(this.ang),
        };
      }

      update(t: { x: number; y: number }) {
        this.ang = Math.atan2(t.y - this.pos.y, t.x - this.pos.x);
        this.pos.x = t.x + this.l * Math.cos(this.ang - Math.PI);
        this.pos.y = t.y + this.l * Math.sin(this.ang - Math.PI);
        this.nextPos.x = this.pos.x + this.l * Math.cos(this.ang);
        this.nextPos.y = this.pos.y + this.l * Math.sin(this.ang);
      }

      fallback(t: { x: number; y: number }) {
        this.pos.x = t.x;
        this.pos.y = t.y;
        this.nextPos.x = this.pos.x + this.l * Math.cos(this.ang);
        this.nextPos.y = this.pos.y + this.l * Math.sin(this.ang);
      }

      show(ctx: CanvasRenderingContext2D) {
        ctx.lineTo(this.nextPos.x, this.nextPos.y);
      }
    }

    class Tentacle {
      x: number;
      y: number;
      l: number;
      n: number;
      rand: number;
      segments: Segment[];
      angle: number = 0;
      dt: number = 0;
      t: { x?: number; y?: number } = {};

      constructor(x: number, y: number, l: number, n: number) {
        this.x = x;
        this.y = y;
        this.l = l;
        this.n = n;
        this.rand = Math.random();
        this.segments = [new Segment(this, this.l / this.n, 0, true)];
        for (let i = 1; i < this.n; i++) {
          this.segments.push(
            new Segment(this.segments[i - 1], this.l / this.n, 0, false)
          );
        }
      }

      move(last_target: { x?: number; y?: number }, target: { x: number; y: number }) {
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.dt = dist(last_target.x || 0, last_target.y || 0, target.x, target.y) + 5;
        this.t = {
          x: target.x - 0.8 * this.dt * Math.cos(this.angle),
          y: target.y - 0.8 * this.dt * Math.sin(this.angle),
        };
        if (this.t.x) {
          this.segments[this.n - 1].update(this.t as { x: number; y: number });
        } else {
          this.segments[this.n - 1].update(target);
        }
        for (let i = this.n - 2; i >= 0; i--) {
          this.segments[i].update(this.segments[i + 1].pos);
        }
        if (
          dist(this.x, this.y, target.x, target.y) <=
          this.l + dist(last_target.x || 0, last_target.y || 0, target.x, target.y)
        ) {
          this.segments[0].fallback({ x: this.x, y: this.y });
          for (let i = 1; i < this.n; i++) {
            this.segments[i].fallback(this.segments[i - 1].nextPos);
          }
        }
      }

      show(ctx: CanvasRenderingContext2D, target: { x: number; y: number }, hueBase: number) {
        if (dist(this.x, this.y, target.x, target.y) <= this.l) {
          ctx.globalCompositeOperation = "lighter";
          ctx.beginPath();
          ctx.lineTo(this.x, this.y);
          for (let i = 0; i < this.n; i++) {
            this.segments[i].show(ctx);
          }
          // Couleurs basees sur hueBase (170 pour cyan, 0 pour rouge)
          ctx.strokeStyle =
            "hsl(" +
            (this.rand * 30 + hueBase) +
            ",100%," +
            (this.rand * 40 + 40) +
            "%)";
          ctx.lineWidth = this.rand * 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
      }

      show2(ctx: CanvasRenderingContext2D, target: { x: number; y: number }, activeColor: string, inactiveColor: string) {
        ctx.beginPath();
        if (dist(this.x, this.y, target.x, target.y) <= this.l) {
          ctx.arc(this.x, this.y, 2 * this.rand + 1, 0, 2 * Math.PI);
          ctx.fillStyle = activeColor;
        } else {
          ctx.arc(this.x, this.y, this.rand * 2, 0, 2 * Math.PI);
          ctx.fillStyle = inactiveColor;
        }
        ctx.fill();
      }
    }

    const maxl = 300;
    const minl = 50;
    const n = 30;
    const numt = 500;
    const tent: Tentacle[] = [];
    const target = { x: w / 2, y: h / 2, errx: 0, erry: 0 };
    // Parametres aleatoires pour un mouvement organique
    const freqX1 = 0.3 + Math.random() * 0.4;
    const freqX2 = 0.7 + Math.random() * 0.6;
    const freqY1 = 0.4 + Math.random() * 0.5;
    const freqY2 = 0.8 + Math.random() * 0.5;
    const phaseX = Math.random() * Math.PI * 2;
    const phaseY = Math.random() * Math.PI * 2;
    const ampX = w * 0.3;
    const ampY = h * 0.3;

    for (let i = 0; i < numt; i++) {
      tent.push(
        new Tentacle(
          Math.random() * w,
          Math.random() * h,
          Math.random() * (maxl - minl) + minl,
          n
        )
      );
    }

    function draw() {
      if (!c) return;

      // Couleurs selon le theme
      const isRed = colorRef.current === "red";
      const hueBase = isRed ? 0 : 170;
      const activeColor = isRed ? "#FF8D8D" : "#8DFFFB";
      const inactiveColor = isRed ? "#4a0d0d" : "#0d4a47";

      if (mouse.x !== false && mouse.y !== false) {
        target.errx = mouse.x - target.x;
        target.erry = mouse.y - target.y;
      } else {
        // Mouvement organique avec sinusoides combinees
        const targetX = w / 2 + Math.sin(t * freqX1 + phaseX) * ampX * 0.6 + Math.sin(t * freqX2) * ampX * 0.4;
        const targetY = h / 2 + Math.sin(t * freqY1 + phaseY) * ampY * 0.6 + Math.cos(t * freqY2) * ampY * 0.4;
        target.errx = targetX - target.x;
        target.erry = targetY - target.y;
      }

      target.x += target.errx * speedRef.current / 10;
      target.y += target.erry * speedRef.current / 10;
      t += 0.01 * speedRef.current;

      c.beginPath();
      c.arc(
        target.x,
        target.y,
        dist(last_target.x || target.x, last_target.y || target.y, target.x, target.y) + 5,
        0,
        2 * Math.PI
      );
      c.fillStyle = activeColor;
      c.fill();

      for (let i = 0; i < numt; i++) {
        tent[i].move(last_target, target);
        tent[i].show2(c, target, activeColor, inactiveColor);
      }
      for (let i = 0; i < numt; i++) {
        tent[i].show(c, target, hueBase);
      }
      last_target.x = target.x;
      last_target.y = target.y;
    }

    function loop() {
      if (!c) return;
      c.clearRect(0, 0, w, h);
      draw();
      animationRef.current = requestAnimationFrame(loop);
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.pageX;
      mouse.y = e.pageY;
    };

    const handleMouseLeave = () => {
      mouse.x = false;
      mouse.y = false;
    };

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", handleResize);

    loop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{ background: "#0a0f14" }}
      />
      {/* Overlay sombre pour attenuer l'effet */}
      <div className="absolute inset-0 bg-background/40 z-[1]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
