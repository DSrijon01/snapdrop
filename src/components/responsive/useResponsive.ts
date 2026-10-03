"use client";

import { useState, useEffect } from "react";

export function useResponsive() {
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState<number>(1200);

  useEffect(() => {
    setMounted(true);
    const updateSize = () => setWidth(window.innerWidth);
    updateSize();

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const isMobile = mounted ? width < 768 : false;
  const isTablet = mounted ? width >= 768 && width < 1024 : false;
  const isDesktop = mounted ? width >= 1024 : true;

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    mounted,
  };
}
