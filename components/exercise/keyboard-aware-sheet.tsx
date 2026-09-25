"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { SheetContent } from "@/components/ui/sheet";

export function KeyboardAwareSheetContent({ style, ...props }: ComponentProps<typeof SheetContent>) {
  const [viewport, setViewport] = useState<{ bottom: number; height: number } | null>(null);

  useEffect(() => {
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    const update = () => setViewport({
      bottom: Math.max(0, window.innerHeight - visualViewport.offsetTop - visualViewport.height),
      height: visualViewport.height,
    });
    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return <SheetContent {...props} side="bottom" style={{ ...style, ...(viewport && {
    bottom: viewport.bottom,
    maxHeight: viewport.height,
  }) }} />;
}
