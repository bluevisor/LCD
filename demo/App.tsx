import { useState } from "react";
import {
  LCDScreen,
  LCDText,
  LCDHeading,
  LCDPanel,
  LCDDivider,
  LCDButton,
  LCDToggle,
  LCDSlider,
  LCDProgress,
  LCDBadge,
  LCDIcon,
  LCDTabs,
  LCDMenu,
} from "../src";

export default function App() {
  const [toggle, setToggle] = useState(false);
  const [slider, setSlider] = useState(0.5);
  const [progress, setProgress] = useState(0.65);
  const [activeTab, setActiveTab] = useState(0);
  const [menuItem, setMenuItem] = useState(0);
  const [camera, setCamera] = useState<"straight" | "isometric">("isometric");

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 16, fontFamily: "monospace", color: "#aaa" }}>
        <button onClick={() => setCamera(camera === "straight" ? "isometric" : "straight")}>
          Camera: {camera}
        </button>
      </div>
      <LCDScreen width={200} height={140} pixelSize={4} theme="green" camera={camera}>
        {/* Title bar */}
        <LCDPanel x={0} y={0} width={200} height={14}>
          <LCDIcon x={1} y={2} name="folder" />
          <LCDText x={11} y={3}>LCD Desktop v1.0</LCDText>
          <LCDBadge x={160} y={2} inverted>3 items</LCDBadge>
        </LCDPanel>

        <LCDDivider x={0} y={15} length={200} />

        {/* Tabs */}
        <LCDTabs
          x={2}
          y={18}
          tabs={["Main", "Settings", "About"]}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />

        {/* Content area */}
        <LCDPanel x={2} y={30} width={120} height={70} border>
          <LCDHeading x={2} y={2} level={3}>Controls</LCDHeading>
          <LCDDivider x={0} y={11} length={118} />

          <LCDText x={2} y={14}>Toggle:</LCDText>
          <LCDToggle x={50} y={14} value={toggle} onChange={setToggle} />

          <LCDText x={2} y={24}>Volume:</LCDText>
          <LCDSlider x={50} y={24} width={60} value={slider} onChange={setSlider} />

          <LCDText x={2} y={34}>Load:</LCDText>
          <LCDProgress x={50} y={34} width={60} value={progress} />

          <LCDButton
            x={2}
            y={44}
            label="Click Me"
            onClick={() => setProgress(Math.random())}
          />
        </LCDPanel>

        {/* Side menu */}
        <LCDPanel x={126} y={30} width={72} height={70} border>
          <LCDText x={2} y={2}>Menu</LCDText>
          <LCDDivider x={0} y={11} length={70} />
          <LCDMenu
            x={2}
            y={14}
            items={["Dashboard", "Files", "Network", "System"]}
            selectedIndex={menuItem}
            onSelect={setMenuItem}
            width={66}
          />
        </LCDPanel>

        {/* Status bar */}
        <LCDDivider x={0} y={105} length={200} />
        <LCDText x={4} y={108}>Status: OK</LCDText>
        <LCDIcon x={186} y={107} name="gear" />

        {/* Footer icons */}
        <LCDDivider x={0} y={118} length={200} />
        <LCDIcon x={4} y={122} name="folder" scale={2} />
        <LCDIcon x={24} y={122} name="file" scale={2} />
        <LCDIcon x={44} y={122} name="gear" scale={2} />
        <LCDText x={70} y={126}>LCD UI v1.0</LCDText>
      </LCDScreen>
    </div>
  );
}
