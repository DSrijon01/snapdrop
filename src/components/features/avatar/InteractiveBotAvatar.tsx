"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface InteractiveBotAvatarProps {
  seed: string;
  onClick?: () => void;
  className?: string;
}

export function InteractiveBotAvatar({
  seed,
  onClick,
  className = "",
}: InteractiveBotAvatarProps) {
  const [svgContent, setSvgContent] = useState<string>("");
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Framer Motion cursor tracking values
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Smooth springs for elastic, physical movement
  const springX = useSpring(rawX, { stiffness: 220, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 220, damping: 22 });

  // 3D perspective tilt
  const rotateX = useTransform(springY, [-100, 100], [16, -16]);
  const rotateY = useTransform(springX, [-100, 100], [-16, 16]);

  // Physical translation (moves around with cursor)
  const moveX = useTransform(springX, [-120, 120], [-26, 26]);
  const moveY = useTransform(springY, [-120, 120], [-26, 26]);

  // Fetch Bottts SVG and inject eye blink + antenna glow CSS
  useEffect(() => {
    let isMounted = true;
    const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;

    fetch(url)
      .then((res) => res.text())
      .then((svgText) => {
        if (!isMounted) return;

        // Custom CSS for organic eye blink and antenna glow
        const customStyle = `
          <style>
            @keyframes botBlink {
              0%, 88%, 94%, 100% {
                transform: scaleY(1);
              }
              91% {
                transform: scaleY(0.1);
              }
            }
            .bot-blinking-eyes {
              transform-box: view-box;
              transform-origin: 90px 96px;
              animation: botBlink 3.6s infinite ease-in-out;
            }
            @keyframes antennaGlow {
              0%, 100% {
                filter: drop-shadow(0 0 4px rgba(255, 24, 1, 0.4));
              }
              50% {
                filter: drop-shadow(0 0 14px rgba(255, 24, 1, 0.95));
              }
            }
            .bot-glowing-antenna {
              animation: antennaGlow 2.4s infinite ease-in-out;
            }
          </style>
        `;

        // Inject styles right after opening <svg> tag
        let modifiedSvg = svgText.replace(/<svg([^>]*)>/, `<svg$1>${customStyle}`);

        // Target the eye visor group: transform="translate(38 76)"
        // Wrap inner content in <g class="bot-blinking-eyes"> with view-box transform-origin (90px 96px)
        modifiedSvg = modifiedSvg
          .replace(
            /(<g transform="translate\(38 76\)"[^>]*>)/,
            `$1<g class="bot-blinking-eyes">`
          )
          .replace(
            /(<g transform="translate\(38 76\)"[\s\S]*?)(<\/g>)/,
            `$1</g>$2`
          );

        // Target the top antenna / bulb group: transform="translate(41)"
        modifiedSvg = modifiedSvg.replace(
          'transform="translate(41)"',
          'transform="translate(41)" class="bot-glowing-antenna"'
        );

        setSvgContent(modifiedSvg);
      })
      .catch((err) => {
        console.error("Failed to load bot avatar SVG:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [seed]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    rawX.set(deltaX);
    rawY.set(deltaY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rawX.set(0);
    rawY.set(0);
  };

  const handleClick = () => {
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 300);
    onClick?.();
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title="Click to cycle"
      className={`relative cursor-pointer flex flex-col items-center select-none perspective-[800px] p-4 ${className}`}
    >
      {/* Ambient Pulsing Halo */}
      <motion.div
        animate={{
          scale: isHovered ? 1.4 : 1.15,
          opacity: isHovered ? 0.45 : 0.25,
        }}
        transition={{ duration: 0.4 }}
        className="absolute inset-4 bg-primary blur-3xl rounded-full pointer-events-none -z-10"
      />

      {/* Main Interactive Robot Head Container */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          x: moveX,
          y: moveY,
          transformStyle: "preserve-3d",
        }}
        animate={
          !isHovered
            ? {
                // Gentle breathing float when idle (replaces harsh bouncing)
                y: [0, -6, 0],
                transition: {
                  repeat: Infinity,
                  duration: 3.2,
                  ease: "easeInOut",
                },
              }
            : isClicking
            ? {
                scale: [0.92, 1.12, 1],
                transition: { duration: 0.3 },
              }
            : {
                scale: 1.08,
                transition: { duration: 0.25 },
              }
        }
        className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 shrink-0 relative flex items-center justify-center drop-shadow-[0_0_25px_rgba(255,24,1,0.5)] dark:drop-shadow-[0_0_35px_rgba(255,24,1,0.7)]"
      >
        {svgContent ? (
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain pointer-events-none"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`}
            alt="Street Sync Bot"
            className="w-full h-full object-contain pointer-events-none"
          />
        )}
      </motion.div>
    </div>
  );
}
