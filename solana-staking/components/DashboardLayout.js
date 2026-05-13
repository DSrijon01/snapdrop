"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { TOKEN_DECIMALS } from "../utils/constants";
import { shortenAddress, formatTokenAmount } from "../utils/helpers";
import useStakingContract from "../hooks/useStakingContract";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const DashboardLayout = ({ children }) => {
  const { publicKey } = useWallet();
  const { forceRefresh, isAdmin, tokenBalance, userStake } =
    useStakingContract();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleRefresh = () => {
    setIsRefreshing(true);
    forceRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // Navigation items
  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
    },
    {
      name: "Stake",
      href: "/stake",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path
            fillRule="evenodd"
            d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "Rewards",
      href: "/rewards",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm4.707 3.707a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L8.414 9H10a3 3 0 013 3v1a1 1 0 102 0v-1a5 5 0 00-5-5H8.414l1.293-1.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  // Add admin section if user is admin
  if (isAdmin) {
    navItems.push({
      name: "Admin",
      href: "/admin",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
            clipRule="evenodd"
          />
        </svg>
      ),
    });
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-800 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Fixed Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 shadow-xl transition-transform duration-300 ease-in-out transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:relative md:z-auto`}
      >
        <div className="flex items-center justify-center h-[73px] px-4 bg-gray-900 border-b border-gray-700">
          <div className="text-2xl font-bold text-primary-500">
            <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
          </div>
        </div>

        <div className="flex flex-col h-[calc(100%-4rem)] overflow-hidden">
          {/* Navigation */}
          <div className="flex-grow overflow-y-auto py-4">
            <nav className="px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  href={item.href}
                  key={item.name}
                  className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-md group transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3 text-gray-400 group-hover:text-gray-300">
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Info (at bottom of sidebar) */}
          {publicKey && (
            <div className="p-4 border-t border-gray-700 mt-auto">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    {shortenAddress(publicKey.toString())}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isAdmin ? "Admin" : "User"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <svg
                    className="h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                {publicKey && (
                  <>
                    <button
                      onClick={handleRefresh}
                      className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all duration-200"
                      title="Refresh data"
                      disabled={isRefreshing}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>

                    {/* User Info Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="hidden md:flex items-center space-x-2 py-1 px-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <div className="h-6 w-6 rounded-full bg-primary-800 flex items-center justify-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-primary-300"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-300">
                          {shortenAddress(publicKey.toString())}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Dropdown Content */}
                      {showDropdown && (
                        <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                          <div className="p-4 border-b border-gray-700">
                            <p className="text-sm text-gray-400">
                              Connected as
                            </p>
                            <p className="text-white font-medium truncate">
                              {publicKey.toString()}
                            </p>
                            {isAdmin && (
                              <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900 text-amber-400">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="p-4 border-b border-gray-700">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-400">
                                Balance:
                              </span>
                              <span className="text-white font-medium">
                                {formatTokenAmount(
                                  tokenBalance,
                                  TOKEN_DECIMALS
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-400">
                                Staked:
                              </span>
                              <span className="text-white font-medium">
                                {userStake
                                  ? formatTokenAmount(
                                      userStake.stakedAmount,
                                      TOKEN_DECIMALS
                                    )
                                  : "0"}
                              </span>
                            </div>
                          </div>
                          <div className="p-2">
                            <Link
                              href="/stake"
                              className="block px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md"
                              onClick={() => setShowDropdown(false)}
                            >
                              Manage Tokens
                            </Link>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  publicKey.toString()
                                );
                                alert("Address copied to clipboard!");
                                setShowDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md"
                            >
                              Copy Address
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Dynamic WalletMultiButton with ssr disabled */}
                <WalletMultiButton className="btn-primary" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content with scroll */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-pattern">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
