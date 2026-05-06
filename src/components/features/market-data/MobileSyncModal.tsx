"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FC } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSyncModal: FC<Props> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm p-6"
          >
            <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/5 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center p-6">
                    <h3 className="text-2xl font-black text-foreground uppercase italic tracking-tighter transform -skew-x-6 font-display mb-2">
                        Sync Mobile
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Scan to access Street Sync on your mobile device.
                    </p>
                    
                    <div className="bg-white p-4 rounded-xl shadow-inner mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={`${process.env.NODE_ENV === 'production' ? '/snapdrop' : ''}/street-sync-qr.png`} 
                            alt="Mobile Sync QR Code" 
                            className="w-48 h-48 object-contain"
                        />
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors font-display uppercase tracking-wide"
                    >
                        Close
                    </button>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
