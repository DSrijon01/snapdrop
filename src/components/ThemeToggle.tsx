"use client";

import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9" />; // Placeholder
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        // Moon icon for Light mode (to switch to Dark)
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground transition-all hover:text-primary">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // Sun icon for Dark mode (to switch to Light)
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground transition-all hover:text-primary">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
