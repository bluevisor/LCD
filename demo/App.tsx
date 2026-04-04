import { useState, useEffect, useCallback, useRef } from "react";
import { NokiaMode } from "./modes/NokiaMode";
import { NewtonMode } from "./modes/NewtonMode";
import { PalmMode } from "./modes/PalmMode";
import { Nokia9210Mode } from "./modes/Nokia9210Mode";
import { BlackBerryMode } from "./modes/BlackBerryMode";
import { GameBoyMode } from "./modes/GameBoyMode";
import { TamagotchiMode } from "./modes/TamagotchiMode";
import { PagerMode } from "./modes/PagerMode";
import {
  LCDScreen,
  BitmapFont,
  useLCD,
  useFocus,
  type ThemePresetName,
} from "../src";

type Mode = "picker" | "nokia" | "nokia9210" | "newton" | "palm" | "blackberry" | "gameboy" | "tamagotchi" | "pager";

const MODES: { key: Mode; label: string; detail: string }[] = [
  { key: "gameboy", label: "Game Boy", detail: "160x144  1989" },
  { key: "pager", label: "Motorola Pager", detail: "120x32  1990" },
  { key: "newton", label: "Apple Newton", detail: "240x320  1993" },
  { key: "palm", label: "Palm Pilot", detail: "160x160  1996" },
  { key: "tamagotchi", label: "Tamagotchi", detail: "32x30  1996" },
  { key: "nokia", label: "Nokia 6110", detail: "84x48  1997" },
  { key: "blackberry", label: "BlackBerry 850", detail: "132x65  1999" },
  { key: "nokia9210", label: "Nokia 9210", detail: "320x100  2001" },
];

const CAMERAS: string[] = ["straight", "isometric", "desk", "handheld"];
const THEMES: ThemePresetName[] = ["green", "amber", "gray", "blue", "newton", "palm", "gameboy", "tamagotchi", "pager"];

const font = new BitmapFont();

const W = 200;
const H = 140;

function PickerContent({ onSelect, selected, setSelected }: {
  onSelect: (mode: Mode) => void;
  selected: number;
  setSelected: (i: number) => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  const onUp = useCallback(() => {
    if (selected > 0) { setSelected(selected - 1); return true; }
    return false;
  }, [selected, setSelected]);

  const onDown = useCallback(() => {
    if (selected < MODES.length - 1) { setSelected(selected + 1); return true; }
    return false;
  }, [selected, setSelected]);

  const onActivate = useCallback(() => {
    onSelect(MODES[selected].key);
  }, [selected, onSelect]);

  useFocus({
    rect: { x: offsetX, y: offsetY + 22, width: W, height: MODES.length * 12 },
    order: 10,
    onUp,
    onDown,
    onActivate,
  });

  useEffect(() => {
    const fb = engine.fb;
    const ox = offsetX;
    const oy = offsetY;

    fb.fillRect(ox, oy, W, H, 0);
    const title = "LCD Device Museum";
    const tw = font.measureText(title);
    font.drawText(fb, title, ox + Math.floor((W - tw) / 2), oy + 3, { intensity: 1 });

    for (let x = ox + 4; x < ox + W - 4; x++) fb.set(x, oy + 12, 0.5);

    const sub = "Select a device";
    const sw = font.measureText(sub);
    font.drawText(fb, sub, ox + Math.floor((W - sw) / 2), oy + 15, { intensity: 0.5 });

    const listY = oy + 26;
    const itemH = 12;

    MODES.forEach((m, i) => {
      const y = listY + i * itemH;

      if (i === selected) {
        fb.fillRect(ox + 2, y, W - 4, itemH - 3, 1);
        font.drawText(fb, m.label, ox + 6, y + 1, { intensity: 0 });
        const dw = font.measureText(m.detail);
        font.drawText(fb, m.detail, ox + W - 6 - dw, y + 1, { intensity: 0 });
      } else {
        font.drawText(fb, m.label, ox + 6, y + 1, { intensity: 1 });
        const dw = font.measureText(m.detail);
        font.drawText(fb, m.detail, ox + W - 6 - dw, y + 1, { intensity: 0.4 });
      }

      if (i < MODES.length - 1) {
        for (let x = ox + 4; x < ox + W - 4; x++) {
          fb.set(x, y + itemH - 2, 0.15);
        }
      }
    });

    const footer = "-/+ size  ,/. angle  \\ persp";
    const fw = font.measureText(footer);
    font.drawText(fb, footer, ox + Math.floor((W - fw) / 2), oy + H - 9, { intensity: 0.3 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected]);

  return null;
}

function ModePicker({ onSelect, selected, setSelected, theme, camera, pixelSize, perspective }: {
  onSelect: (mode: Mode) => void;
  selected: number;
  setSelected: (i: number) => void;
  theme: ThemePresetName;
  camera: string;
  pixelSize: number;
  perspective: boolean;
}) {
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
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme={theme} camera={camera} perspective={perspective}>
        <PickerContent onSelect={onSelect} selected={selected} setSelected={setSelected} />
      </LCDScreen>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("picker");
  const [pickerIdx, setPickerIdx] = useState(0);
  const [theme, setTheme] = useState<ThemePresetName>("green");
  const [camera, setCamera] = useState("straight");
  const [pixelSize, setPixelSize] = useState(4);
  const [perspective, setPerspective] = useState(false);

  // Shared hotkeys active on picker screen
  useEffect(() => {
    if (mode !== "picker") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "-" || e.key === "_") {
        setPixelSize(s => Math.max(2, s - 1));
      } else if (e.key === "=" || e.key === "+") {
        setPixelSize(s => Math.min(12, s + 1));
      } else if (e.key === "," || e.key === "<") {
        setCamera(c => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx - 1 + CAMERAS.length) % CAMERAS.length];
        });
      } else if (e.key === "." || e.key === ">") {
        setCamera(c => {
          const idx = CAMERAS.indexOf(c);
          return CAMERAS[(idx + 1) % CAMERAS.length];
        });
      } else if (e.key === "\\") {
        setPerspective(p => !p);
      } else if (e.key === "[") {
        setTheme(t => {
          const idx = THEMES.indexOf(t);
          return THEMES[(idx - 1 + THEMES.length) % THEMES.length];
        });
      } else if (e.key === "]") {
        setTheme(t => {
          const idx = THEMES.indexOf(t);
          return THEMES[(idx + 1) % THEMES.length];
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  if (mode === "nokia") return <NokiaMode onExit={() => setMode("picker")} />;
  if (mode === "newton") return <NewtonMode onExit={() => setMode("picker")} />;
  if (mode === "palm") return <PalmMode onExit={() => setMode("picker")} />;
  if (mode === "nokia9210") return <Nokia9210Mode onExit={() => setMode("picker")} />;
  if (mode === "blackberry") return <BlackBerryMode onExit={() => setMode("picker")} />;
  if (mode === "gameboy") return <GameBoyMode onExit={() => setMode("picker")} />;
  if (mode === "tamagotchi") return <TamagotchiMode onExit={() => setMode("picker")} />;
  if (mode === "pager") return <PagerMode onExit={() => setMode("picker")} />;
  return (
    <ModePicker
      onSelect={setMode}
      selected={pickerIdx}
      setSelected={setPickerIdx}
      theme={theme}
      camera={camera}
      pixelSize={pixelSize}
      perspective={perspective}
    />
  );
}
