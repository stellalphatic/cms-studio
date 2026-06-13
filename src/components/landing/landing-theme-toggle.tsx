"use client";

import { useEffect, useState } from "react";
import { Leaf, Sun } from "lucide-react";

const STORAGE_KEY = "studio:theme";

/** Landing: light = white + green gradients, dark = deep green theme */
export function LandingThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null) ?? "light";
    setMode(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function toggle() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const isGreen = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isGreen ? "Switch to white theme" : "Switch to green theme"}
      aria-label={isGreen ? "Switch to white theme" : "Switch to green theme"}
      className="landing-btn landing-theme-toggle inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium"
    >
      {isGreen ? <Sun className="h-3.5 w-3.5" /> : <Leaf className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isGreen ? "White" : "Green"}</span>
    </button>
  );
}
