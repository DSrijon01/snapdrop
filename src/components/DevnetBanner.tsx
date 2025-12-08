"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export const DevnetBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-yellow-500 text-black px-4 py-3 relative z-50 shadow-md"
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <p className="text-sm font-medium">
              <span className="font-bold">Developer Mode Required:</span> This is a showcase project on Solana <b>Devnet</b>. 
              Please enable Developer Mode in your Phantom wallet settings and switch to Devnet to mint.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-yellow-600 rounded-full transition-colors ml-4"
            aria-label="Dismiss warning"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
