"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Coffee,
  Settings,
  LogOut,
  Menu,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";

/* ✅ Sidebar Items */
const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingBag, label: "Orders", href: "/dashboard/orders" },
  { icon: Coffee, label: "Products", href: "/dashboard/products" },
  { icon: Users, label: "Customers", href: "/dashboard/customers" },
  { icon: Ticket, label: "Coupons", href: "/dashboard/coupons" },
  { icon: Settings, label: "Manage Cafe", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const SidebarContent = ({ mobile = false }) => (
    <>
      {/* Logo + Toggle */}
      <div className="px-5 py-8 flex items-center justify-between relative z-10">
        {(mobile || isSidebarOpen) && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0 overflow-hidden p-1">
              <Image src="/brew_and_bite_logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div className="flex flex-col">
              <p className="text-[15px] font-bold tracking-wider uppercase text-white leading-tight">
                Brew & Bite
              </p>
              <p className="text-[10px] text-white/70 font-medium tracking-widest">
                Smart Point
              </p>
            </div>
          </div>
        )}

        {mobile ? (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-2xl border border-white/30 backdrop-blur bg-white/10 hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>
        ) : (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-2xl border border-white/30 backdrop-blur ${isSidebarOpen
              ? "bg-white/10 hover:bg-white/20"
              : "bg-white/20 hover:bg-white/30 mx-auto"
              }`}
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2 relative z-10">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setIsMobileMenuOpen(false)}
              className={`flex items-center p-3.5 rounded-[20px] transition-all duration-300 group ${isActive
                ? "bg-beige-100 text-coffee-dark shadow-sm"
                : "bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`}
            >
              <item.icon
                className={`h-5 w-5 ${isActive
                  ? "text-coffee-dark"
                  : "text-white/60 group-hover:text-white"
                  }`}
              />

              {(mobile || isSidebarOpen) && (
                <span className={`ml-4 text-[15px] ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-5 mt-auto relative z-10">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('activeSession');
            window.location.href = '/login';
          }}
          className="flex items-center w-full p-3.5 rounded-[20px] text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-white/10"
        >
          <LogOut className="h-5 w-5" />
          {(mobile || isSidebarOpen) && <span className="ml-4 font-medium text-[15px]">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-beige-50 font-sans">
      {/* ✅ Mobile Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-coffee-dark text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1">
            <Image src="/brew_and_bite_logo.png" alt="Logo" width={28} height={28} className="object-contain" />
          </div>
          <span className="font-bold text-sm tracking-wider uppercase">Brew & Bite</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* ✅ Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ✅ Mobile Slide-out Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-coffee-dark text-white z-50 lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent mobile={true} />
      </aside>

      {/* ✅ Desktop Sidebar */}
      <aside
        className={`${isSidebarOpen ? "w-64" : "w-20"
          } relative bg-coffee-dark text-white shadow-[10px_0_40px_rgba(62,43,33,0.1)] 
        transition-all duration-500 flex-col h-screen overflow-hidden shrink-0 hidden lg:flex`}
      >
        <SidebarContent />
      </aside>

      {/* ✅ Main Content */}
      <main className="flex-1 overflow-y-auto bg-beige-50 p-4 sm:p-6 lg:p-8 h-screen pt-16 lg:pt-8">
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
