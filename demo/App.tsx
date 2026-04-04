import { useState, useEffect, useCallback } from "react";
import { NokiaMode } from "./modes/NokiaMode";
import { NewtonMode } from "./modes/NewtonMode";
import { PalmMode } from "./modes/PalmMode";

type Mode = "picker" | "nokia" | "newton" | "palm";

const MODES: { key: Mode; label: string; color: string }[] = [
  { key: "nokia", label: "Nokia Mode", color: "#7B8B2D" },
  { key: "newton", label: "Newton Mode", color: "#9BA88A" },
  { key: "palm", label: "Palm Pilot", color: "#B0BFA0" },
];

function ModePicker({ onSelect }: { onSelect: (mode: Mode) => void }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setSelected((s) => (s > 0 ? s - 1 : MODES.length - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setSelected((s) => (s < MODES.length - 1 ? s + 1 : 0));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(MODES[selected].key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, onSelect]);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 40,
      background: "#111",
      fontFamily: "monospace",
      color: "#888",
    }}>
      {MODES.map((m, i) => (
        <button
          key={m.key}
          onClick={() => onSelect(m.key)}
          style={{
            padding: "20px 32px",
            background: i === selected ? m.color : "#222",
            color: i === selected ? "#111" : m.color,
            border: `2px solid ${m.color}`,
            borderRadius: 8,
            fontSize: 18,
            fontFamily: "monospace",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("picker");

  if (mode === "nokia") return <NokiaMode onExit={() => setMode("picker")} />;
  if (mode === "newton") return <NewtonMode onExit={() => setMode("picker")} />;
  if (mode === "palm") return <PalmMode onExit={() => setMode("picker")} />;
  return <ModePicker onSelect={setMode} />;
}
