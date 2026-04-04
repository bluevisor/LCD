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
  LCDText,
  LCDDivider,
  LCDMenu,
  BitmapFont,
  useLCD,
  useFocus,
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

const font = new BitmapFont();

const W = 200;
const H = 140;

function useCancel(onBack: () => void) {
  const { engine } = useLCD();
  useEffect(() => {
    engine.focus.onCancel(onBack);
    return () => engine.focus.offCancel(onBack);
  }, [engine, onBack]);
}

function PickerContent({ onSelect, selected, setSelected }: {
  onSelect: (mode: Mode) => void;
  selected: number;
  setSelected: (i: number) => void;
}) {
  const { engine, offsetX, offsetY } = useLCD();

  const onUp = useCallback(() => {
    if (selected > 0) { setSelected(selected - 1); return true; }
    return false;
  }, [selected]);

  const onDown = useCallback(() => {
    if (selected < MODES.length - 1) { setSelected(selected + 1); return true; }
    return false;
  }, [selected]);

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

    // Title
    fb.fillRect(ox, oy, W, H, 0);
    const title = "LCD Device Museum";
    const tw = font.measureText(title);
    font.drawText(fb, title, ox + Math.floor((W - tw) / 2), oy + 3, { intensity: 1 });

    // Divider
    for (let x = ox + 4; x < ox + W - 4; x++) fb.set(x, oy + 12, 0.5);

    // Subtitle
    const sub = "Select a device";
    const sw = font.measureText(sub);
    font.drawText(fb, sub, ox + Math.floor((W - sw) / 2), oy + 15, { intensity: 0.5 });

    // Device list
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

      // Divider between items
      if (i < MODES.length - 1) {
        for (let x = ox + 4; x < ox + W - 4; x++) {
          fb.set(x, y + itemH - 2, 0.15);
        }
      }
    });

    // Footer
    const footer = "Enter to select  Esc to exit";
    const fw = font.measureText(footer);
    font.drawText(fb, footer, ox + Math.floor((W - fw) / 2), oy + H - 9, { intensity: 0.3 });

    engine.markDirty();
  }, [engine, offsetX, offsetY, selected]);

  return null;
}

function ModePicker({ onSelect, selected, setSelected }: {
  onSelect: (mode: Mode) => void;
  selected: number;
  setSelected: (i: number) => void;
}) {
  // Calculate pixel size to fill viewport
  const [pixelSize, setPixelSize] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = Math.floor(vw / W);
      const scaleY = Math.floor(vh / H);
      setPixelSize(Math.max(2, Math.min(scaleX, scaleY) - 1));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        overflow: "hidden",
      }}
    >
      <LCDScreen width={W} height={H} pixelSize={pixelSize} theme="green">
        <PickerContent onSelect={onSelect} selected={selected} setSelected={setSelected} />
      </LCDScreen>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("picker");
  const [pickerIdx, setPickerIdx] = useState(0);

  if (mode === "nokia") return <NokiaMode onExit={() => setMode("picker")} />;
  if (mode === "newton") return <NewtonMode onExit={() => setMode("picker")} />;
  if (mode === "palm") return <PalmMode onExit={() => setMode("picker")} />;
  if (mode === "nokia9210") return <Nokia9210Mode onExit={() => setMode("picker")} />;
  if (mode === "blackberry") return <BlackBerryMode onExit={() => setMode("picker")} />;
  if (mode === "gameboy") return <GameBoyMode onExit={() => setMode("picker")} />;
  if (mode === "tamagotchi") return <TamagotchiMode onExit={() => setMode("picker")} />;
  if (mode === "pager") return <PagerMode onExit={() => setMode("picker")} />;
  return <ModePicker onSelect={setMode} selected={pickerIdx} setSelected={setPickerIdx} />;
}
