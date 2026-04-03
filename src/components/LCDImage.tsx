import { useEffect, useRef } from "react";
import { useLCD } from "./LCDContext";
import { sampleImageToFramebuffer } from "../assets/image-sampler";

export interface LCDImageProps {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function LCDImage({ src, x, y, width, height }: LCDImageProps) {
  const { engine, offsetX, offsetY } = useLCD();
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      sampleImageToFramebuffer(
        img,
        engine.fb,
        x + offsetX,
        y + offsetY,
        width,
        height
      );
      engine.markDirty();
    };
    img.src = src;
  }, [engine, src, x, y, offsetX, offsetY, width, height]);

  return null;
}
