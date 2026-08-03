"use client";

import React, { useState } from "react";
import { 
  Home, 
  Inbox, 
  MessageSquare, 
  Bell, 
  Compass, 
  User, 
  Plus, 
  ChevronDown, 
  BookOpen, 
  MoreHorizontal,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SyncFeedNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenComposer: () => void;
}

export const SyncFeedNav: React.FC<SyncFeedNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenComposer
}) => {
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  const navItems = [
    { id: "home", label: "Home", icon: Home, badge: null },
    { id: "subscriptions", label: "Subscriptions", icon: Inbox, badge: "8" },
    { id: "chat", label: "Chat", icon: MessageSquare, badge: "3" },
    { id: "activity", label: "Activity", icon: Bell, badge: null },
    { id: "explore", label: "Explore", icon: Compass, badge: null },
    { id: "profile", label: "Profile", icon: User, badge: null },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col justify-between py-6 px-4 border border-border/60 bg-card/45 backdrop-blur-md min-h-[calc(100vh-100px)] rounded-2xl shadow-sm">
      <div className="space-y-6">
        {/* Sync Feed Pro Logo Badge */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-md shadow-primary/10">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black font-display uppercase tracking-tight text-base text-foreground">
                Sync Feed
              </span>
              <span className="bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
              Research Hub
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
                  <span className="font-display tracking-tight">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive 
                      ? "bg-primary-foreground/20 text-primary-foreground" 
                      : "bg-primary/10 border border-primary/20 text-primary"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Create Button with Dropdown */}
        <div className="relative pt-2">
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenComposer}
              className="flex-1 py-3 px-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold uppercase text-xs font-mono tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>Create</span>
            </button>
            <button
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="py-3 px-2.5 bg-primary/90 hover:bg-primary-hover text-primary-foreground rounded-xl transition-all"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <AnimatePresence>
            {showCreateDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute left-0 right-0 top-14 bg-card border border-border/80 rounded-xl p-2 shadow-2xl z-50 space-y-1 font-sans text-xs"
              >
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenComposer();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-bold text-foreground flex items-center justify-between"
                >
                  <span>New Post / Article</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Long-form</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenComposer();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-bold text-foreground flex items-center justify-between"
                >
                  <span>New Note / Thread</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Short</span>
                </button>
                <button
                  onClick={() => {
                    setShowCreateDropdown(false);
                    onOpenComposer();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted font-bold text-foreground flex items-center justify-between"
                >
                  <span>Research Brief</span>
                  <span className="text-[10px] font-mono text-primary uppercase">PDF/Data</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / More */}
      <div className="pt-6 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between px-3 text-xs font-mono text-muted-foreground font-bold">
          <span className="flex items-center gap-1.5">
            <Zap size={13} className="text-primary" />
            Pro Subscriber
          </span>
          <MoreHorizontal size={16} className="cursor-pointer hover:text-foreground" />
        </div>
      </div>
    </aside>
  );
};
