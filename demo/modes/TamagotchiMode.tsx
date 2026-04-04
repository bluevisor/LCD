import { useState, useEffect, useCallback, useRef } from "react";
import {
  LCDScreen,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../../src";

const font = new BitmapFont("3x5");

const W = 32;
const H = 30;

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];

/* ── Pet Sprites (8x8) ─────────────────────────────────── */

const PET_HAPPY = [
  [0,0,1,1,1,1,0,0],
  [0,1,0,0,0,0,1,0],
  [1,0,1,0,0,1,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,1,0,0,1,0,1],
  [1,0,0,1,1,0,0,1],
  [0,1,0,0,0,0,1,0],
  [0,0,1,1,1,1,0,0],
];

const PET_HUNGRY = [
  [0,0,1,1,1,1,0,0],
  [0,1,0,0,0,0,1,0],
  [1,0,1,0,0,1,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,1,1,0,0,1],
  [1,0,1,1,1,1,0,1],
  [0,1,0,0,0,0,1,0],
  [0,0,1,1,1,1,0,0],
];

const PET_SLEEPING = [
  [0,0,1,1,1,1,0,0],
  [0,1,0,0,0,0,1,0],
  [1,0,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1],
  [1,0,0,1,1,0,0,1],
  [0,1,0,0,0,0,1,0],
  [0,0,1,1,1,1,0,0],
];

const PET_SICK = [
  [0,0,1,1,1,1,0,0],
  [0,1,0,0,0,0,1,0],
  [1,0,1,0,0,1,0,1],
  [1,0,0,1,1,0,0,1],
  [1,0,1,0,0,1,0,1],
  [1,0,0,0,0,0,0,1],
  [0,1,0,0,0,0,1,0],
  [0,0,1,1,1,1,0,0],
];

const PET_DEAD = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0],
  [0,0,0,1,1,0,0,0],
  [0,0,1,1,1,1,0,0],
];

/* ── Icon sprites (3x3) ────────────────────────────────── */

const ICONS_3X3: number[][][] = [
  // Feed (fork shape)
  [[1,0,1],[1,0,1],[0,1,0]],
  // Light (bulb)
  [[0,1,0],[1,1,1],[0,1,0]],
  // Play (ball)
  [[0,1,0],[1,0,1],[0,1,0]],
  // Medicine (cross)
  [[0,1,0],[1,1,1],[0,1,0]],
  // Clean (sparkle)
  [[1,0,1],[0,1,0],[1,0,1]],
  // Stats (bars)
  [[1,0,0],[1,1,0],[1,1,1]],
  // Discipline (!)
  [[0,1,0],[0,1,0],[0,1,0]],
  // Attention (heart)
  [[1,0,1],[1,1,1],[0,1,0]],
];

/* ── Inner component (has LCD context) ──────────────────── */

function TamagotchiInner({ onExit }: { onExit: () => void }) {
  const { engine, offsetX, offsetY } = useLCD();

  // Pet state
  const [hunger, setHunger] = useState(0);
  const [happiness, setHappiness] = useState(4);
  const [health, setHealth] = useState(4);
  const [age, setAge] = useState(0);
  const [sleeping, setSleeping] = useState(false);
  const [alive, setAlive] = useState(true);

  // UI state
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [animFrame, setAnimFrame] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [tempAnim, setTempAnim] = useState<string | null>(null);

  // Refs for interval access
  const stateRef = useRef({ hunger, happiness, health, sleeping, alive });
  stateRef.current = { hunger, happiness, health, sleeping, alive };

  // Animation timer (500ms bounce)
  useEffect(() => {
    const id = setInterval(() => setAnimFrame((f) => (f + 1) % 2), 500);
    return () => clearInterval(id);
  }, []);

  // Decay timer (10s)
  useEffect(() => {
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s.alive || s.sleeping) return;
      setHunger((h) => Math.min(h + 1, 4));
      setHappiness((h) => Math.max(h - 1, 0));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  // Health decay: when hunger=4 or happiness=0
  useEffect(() => {
    if (!alive) return;
    if (hunger >= 4 || happiness <= 0) {
      setHealth((h) => Math.max(h - 1, 0));
    }
  }, [hunger, happiness, alive]);

  // Death check
  useEffect(() => {
    if (health <= 0 && alive) {
      setAlive(false);
    }
  }, [health, alive]);

  // Age timer (30s)
  useEffect(() => {
    const id = setInterval(() => {
      if (stateRef.current.alive) setAge((a) => a + 1);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Reset pet
  const resetPet = useCallback(() => {
    setHunger(0);
    setHappiness(4);
    setHealth(4);
    setAge(0);
    setSleeping(false);
    setAlive(true);
    setShowStats(false);
    setTempAnim(null);
  }, []);

  // Activate icon action
  const activateIcon = useCallback(() => {
    if (!alive) { resetPet(); return; }

    switch (selectedIcon) {
      case 0: // Feed
        setHunger((h) => Math.max(h - 1, 0));
        setTempAnim("eat");
        setTimeout(() => setTempAnim(null), 1000);
        break;
      case 1: // Light
        setSleeping((s) => !s);
        break;
      case 2: // Play
        setHappiness((h) => Math.min(h + 1, 4));
        setTempAnim("play");
        setTimeout(() => setTempAnim(null), 1000);
        break;
      case 3: // Medicine
        if (health < 2) {
          setHealth(4);
          setTempAnim("med");
          setTimeout(() => setTempAnim(null), 1000);
        }
        break;
      case 4: // Clean
        setTempAnim("clean");
        setTimeout(() => setTempAnim(null), 1000);
        break;
      case 5: // Stats
        setShowStats(true);
        setTimeout(() => setShowStats(false), 3000);
        break;
      case 6: // Discipline
        setHappiness((h) => Math.max(h - 1, 0));
        break;
      case 7: // Attention
        setTempAnim("attn");
        setTimeout(() => setTempAnim(null), 2000);
        break;
    }
  }, [alive, selectedIcon, health, resetPet]);

  const goLeft = useCallback(() => {
    setSelectedIcon((i) => (i + 7) % 8);
  }, []);

  const goRight = useCallback(() => {
    setSelectedIcon((i) => (i + 1) % 8);
  }, []);

  // Register a single focusable region covering the whole screen
  useFocus({
    rect: { x: offsetX, y: offsetY, width: W, height: H },
    order: 0,
    onActivate: activateIcon,
    onLeft: goLeft,
    onRight: goRight,
  });

  // Cancel = exit
  useEffect(() => {
    engine.focus.onCancel(onExit);
    return () => engine.focus.offCancel(onExit);
  }, [engine, onExit]);

  // Render everything to framebuffer
  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    // Clear screen
    fb.fillRect(ox, oy, W, H, 0);

    // Draw icon bar (y=0..2)
    for (let i = 0; i < 8; i++) {
      const ix = ox + i * 4;
      const iy = oy;
      const selected = i === selectedIcon;
      const icon = ICONS_3X3[i];
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const on = icon[dy][dx] === 1;
          const intensity = selected ? (on ? 0.2 : 1) : (on ? 1 : 0);
          if (intensity > 0) {
            fb.set(ix + dx, iy + dy, intensity);
          }
        }
      }
    }

    // Divider line at y=3
    for (let x = 0; x < W; x++) {
      fb.set(ox + x, oy + 3, 0.3);
    }

    if (showStats && alive) {
      const labels = ["HNG", "HAP", "HLT"];
      const values = [4 - hunger, happiness, health];
      for (let row = 0; row < 3; row++) {
        const ty = oy + 6 + row * 6;
        font.drawText(fb, labels[row], ox + 2, ty, { intensity: 1 });
        for (let s = 0; s < 5; s++) {
          const bx = ox + 15 + s * 3;
          const filled = s < values[row];
          fb.fillRect(bx, ty, 2, 4, filled ? 1 : 0.2);
        }
      }
      font.drawText(fb, `AGE ${age}`, ox + 2, oy + 24, { intensity: 1 });
    } else if (tempAnim === "attn" && alive) {
      font.drawText(fb, `AGE:${age}`, ox + 4, oy + 12, { intensity: 1 });
      const heart = ICONS_3X3[7];
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          if (heart[dy][dx]) fb.set(ox + 26 + dx, oy + 12 + dy, 1);
        }
      }
    } else {
      let sprite: number[][];
      if (!alive) {
        sprite = PET_DEAD;
      } else if (sleeping) {
        sprite = PET_SLEEPING;
      } else if (health < 2) {
        sprite = PET_SICK;
      } else if (hunger >= 3 || tempAnim === "eat") {
        sprite = PET_HUNGRY;
      } else {
        sprite = PET_HAPPY;
      }

      // Center sprite in content area (y=5 to y=26)
      const spriteX = ox + Math.floor((W - 8) / 2) + (animFrame === 1 && alive && !sleeping ? 1 : 0);
      const spriteY = oy + Math.floor((4 + H - 27 - 8) / 2) + 5;

      for (let dy = 0; dy < 8; dy++) {
        for (let dx = 0; dx < 8; dx++) {
          if (sprite[dy][dx]) {
            fb.set(spriteX + dx, spriteY + dy, 1);
          }
        }
      }

      if (sleeping && alive) {
        font.drawText(fb, "Z", ox + 24, oy + 8, { intensity: 0.7 });
        font.drawText(fb, "z", ox + 26, oy + 12, { intensity: 0.5 });
      }

      if (tempAnim === "clean") {
        fb.set(ox + 5, oy + 8, 0.8);
        fb.set(ox + 26, oy + 10, 0.8);
        fb.set(ox + 8, oy + 18, 0.8);
        fb.set(ox + 24, oy + 18, 0.8);
      }

      if (tempAnim === "med") {
        fb.fillRect(ox + 3, oy + 14, 3, 2, 0.8);
      }

      if (!alive) {
        font.drawText(fb, "RIP", ox + 10, oy + 7, { intensity: 1 });
      }
    }

    // Divider line
    for (let x = 0; x < W; x++) {
      fb.set(ox + x, oy + 27, 0.3);
    }

    // Bottom row: age
    if (alive) {
      const ageStr = `age ${age}`;
      const aw = font.measureText(ageStr);
      font.drawText(fb, ageStr, ox + Math.floor((W - aw) / 2), oy + 28, { intensity: 0.6 });
    }

    engine.markDirty();
  }, [engine, offsetX, offsetY, selectedIcon, hunger, happiness, health, age, sleeping, alive, animFrame, showStats, tempAnim]);

  return null;
}

/* ── Outer wrapper ──────────────────────────────────────── */

export function TamagotchiMode({ onExit }: { onExit: () => void }) {
  const [pixelSize, setPixelSize] = useState(12);
  const [cameraIdx, setCameraIdx] = useState(0);
  const [perspective, setPerspective] = useState(false);
  const [theme] = useState<ThemePresetName>("tamagotchi");

  // Shared hotkeys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "-") setPixelSize((s) => Math.max(2, s - 1));
      if (e.key === "=" || e.key === "+") setPixelSize((s) => Math.min(24, s + 1));
      if (e.key === ",") setCameraIdx((i) => (i + CAMERAS.length - 1) % CAMERAS.length);
      if (e.key === ".") setCameraIdx((i) => (i + 1) % CAMERAS.length);
      if (e.key === "\\") setPerspective((p) => !p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#111",
      overflow: "hidden",
    }}>
      <LCDScreen
        width={W}
        height={H}
        pixelSize={pixelSize}
        theme={theme}
        camera={CAMERAS[cameraIdx] as any}
        perspective={perspective}
      >
        <TamagotchiInner onExit={onExit} />
      </LCDScreen>
    </div>
  );
}
