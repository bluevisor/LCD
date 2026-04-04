import { useState } from "react";
import { NokiaMode } from "./modes/NokiaMode";
import { NewtonMode } from "./modes/NewtonMode";

type Mode = "picker" | "nokia" | "newton";

function ModePicker({ onSelect }: { onSelect: (mode: Mode) => void }) {
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
      <button
        onClick={() => onSelect("nokia")}
        style={{
          padding: "20px 32px",
          background: "#222",
          color: "#7B8B2D",
          border: "2px solid #7B8B2D",
          borderRadius: 8,
          fontSize: 18,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        Nokia Mode
      </button>
      <button
        onClick={() => onSelect("newton")}
        style={{
          padding: "20px 32px",
          background: "#222",
          color: "#9BA88A",
          border: "2px solid #9BA88A",
          borderRadius: 8,
          fontSize: 18,
          fontFamily: "monospace",
          cursor: "pointer",
        }}
      >
        Newton Mode
      </button>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("picker");

  if (mode === "nokia") return <NokiaMode onExit={() => setMode("picker")} />;
  if (mode === "newton") return <NewtonMode onExit={() => setMode("picker")} />;
  return <ModePicker onSelect={setMode} />;
}
