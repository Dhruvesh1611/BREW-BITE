"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  ShoppingBag,
  Map,
  LogOut,
  Menu,
  Timer,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingCart,
  Coffee,
  X
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import CloseSessionModal from "@/components/pos/CloseSessionModal";

const posSidebarItems = [
  { icon: ShoppingBag, label: "Register", href: "/pos/terminal" },
  { icon: ShoppingCart, label: "Cart", href: "/pos/cart" },
  { icon: Map, label: "Tables", href: "/pos/tables" },
  { icon: Receipt, label: "Orders", href: "/pos/orders" },
  { icon: Timer, label: "Session", href: "/pos/session" },
];

export default function POSSidebar() {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);

  // Use session from localStorage strictly for display if needed

  const [shiftSales, setShiftSales] = useState(0);

  useEffect(() => {
    fetchShiftStats();
    // Poll every minute
    const interval = setInterval(fetchShiftStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchShiftStats = async () => {
    try {
      const activeSession = JSON.parse(localStorage.getItem('activeSession') || '{}');
      if (!activeSession.id) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/orders?sessionId=${activeSession.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const orders = await response.json();
        const total = orders
          .filter(o => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + Number(o.totalAmount), 0);
        setShiftSales(total);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const handleCloseSession = (closingCash) => {
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════ */}
      {/*  MOBILE BOTTOM NAVIGATION BAR                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#3E2B21] border-t border-[#2C1810] safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {posSidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[56px] ${
                  isActive
                    ? "bg-[#FDFCF7] text-[#3E2B21]"
                    : "text-[#8C8775] active:text-white"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-[#3E2B21]" : ""}`} />
                <span className={`text-[10px] font-bold ${isActive ? "text-[#3E2B21]" : ""}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  DESKTOP SIDEBAR                                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"
          } relative bg-[#3E2B21] text-[#FDFCF7] shadow-[20px_0_40px_rgba(62,43,33,0.08)] transition-all duration-500 flex-col rounded-[26px] my-4 ml-4 h-[calc(100vh-2rem)] overflow-hidden shrink-0 z-50 hidden lg:flex`}
      >
        {/* Logo + Toggle */}
        <div className="px-5 py-6 flex items-center justify-between relative z-10 border-b border-[#2C1810]/50 mb-2">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-[16px] bg-[#FDFCF7] flex items-center justify-center shadow-sm overflow-hidden p-1.5">
                <Image src="/brew_and_bite_logo.png" alt="Logo" width={40} height={40} className="object-contain" />
              </div>
              <div>
                <p className="text-base font-black text-[#FDFCF7] leading-none">BREW & BITE</p>
                <p className="text-[10px] text-[#8C8775] font-bold tracking-wider uppercase mt-1">Smart Point</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl border border-transparent transition-all ${isSidebarOpen
                ? "hover:bg-[#2C1810] text-[#8C8775] hover:text-[#FDFCF7]"
                : "hover:bg-[#2C1810] text-[#8C8775] hover:text-[#FDFCF7] mx-auto"
              }`}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 relative z-10 mt-2">
          {posSidebarItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center p-4 rounded-full transition-all duration-300 group ${isActive
                    ? "bg-[#FDFCF7] text-[#3E2B21]"
                    : "text-[#8C8775] hover:text-[#FDFCF7] hover:bg-[#2C1810]"
                  }`}
              >
                <item.icon
                  className={`h-5 w-5 ${isActive
                    ? "text-[#3E2B21]"
                    : "text-[#8C8775] group-hover:text-[#FDFCF7]"
                    }`}
                />

                {isSidebarOpen && (
                  <span className="ml-4 text-sm font-bold">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Shift Summary Widget */}
        {isSidebarOpen && (
          <div className="mx-3 mb-2 p-4 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-sm relative z-10">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Shift Sales</p>
                <p className="text-2xl font-bold text-white">₹{shiftSales.toFixed(2)}</p>
              </div>
              <div className="h-8 w-8 bg-[#D4A373]/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-4 w-4 text-[#D4A373]" />
              </div>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#D4A373] w-3/4"></div>
            </div>
            <p className="text-[10px] text-white/50 mt-2 text-right">Target: ₹1,500</p>
          </div>
        )}

        {/* Identity */}
        <div className="p-4 border-t border-white/20 mx-3 mb-4 relative z-10">
          <div className={`flex items-center ${!isSidebarOpen && "justify-center"}`}>
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-[#D4A373] animate-pulse"></div>
            </div>
            {isSidebarOpen && (
              <div className="ml-3">
                <p className="text-sm font-bold text-white">Active Session</p>
                <p className="text-xs text-white/60">Online</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
