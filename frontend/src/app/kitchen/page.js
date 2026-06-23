// frontend/src/app/kitchen/page.js
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ChefHat, Clock, CheckCircle, LogOut, Flame, Package, Bell, RefreshCw, AlertCircle, Utensils, X, Coffee } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import CoffeeLoader from "@/components/ui/CoffeeLoader";
import { getSocket } from "@/lib/socket";
import { usePopup } from "@/context/PopupContext";

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(null);
  const { logout } = useAuthStore();
  const { showToast, showAlert } = usePopup();

  const fetchOrders = async () => {
    setLastError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/kitchen/active`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else if (response.status === 401) {
        logout();
        window.location.href = '/login';
      } else if (response.status === 403) {
        setLastError("Access Denied: You do not have permission (KITCHEN/ADMIN only).");
      } else {
        const text = await response.text();
        setLastError(`Server Error: ${response.status} ${text.slice(0, 50)}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setLastError(`Connection Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Socket.IO Integration
    const socket = getSocket();
    socket.emit('join', 'kitchen-room');

    socket.on('order_sent_to_kitchen', (newOrder) => {
      console.log('📶 New order received via socket in KDS:', newOrder);
      setOrders(prevOrders => {
        if (prevOrders.some(o => o.id === newOrder.id)) return prevOrders;
        return [...prevOrders, newOrder];
      });
      showToast(`New Order #${newOrder.orderNumber?.slice(-3) || 'POS'} sent to kitchen for ${newOrder.table ? newOrder.table.name : 'Takeaway'}!`, 'info');
      
      try {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch(e){}
    });

    const handleUpdate = (updatedOrder) => {
      console.log('📶 Kitchen status update via socket:', updatedOrder);
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o)
      );
    };

    socket.on('kitchen_preparing', handleUpdate);
    socket.on('kitchen_completed', handleUpdate);

    socket.on('table_released', (data) => {
      console.log('📶 Table released via socket, removing order:', data);
      setOrders(prevOrders => prevOrders.filter(o => o.id !== data.orderId));
    });

    // Fallback polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000);

    return () => {
      socket.off('order_sent_to_kitchen');
      socket.off('kitchen_preparing');
      socket.off('kitchen_completed');
      socket.off('table_released');
      clearInterval(interval);
    };
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/kitchen/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Local optimistic update
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
        showToast(`Order status updated to ${newStatus}`, "success");
      } else {
        showAlert('Failed to update order status', 'Kitchen Status', 'error');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      showAlert('Failed to update order status', 'Kitchen Status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FBFBF2]">
        <CoffeeLoader size="xl" text="Connecting to Kitchen..." />
      </div>
    );
  }

  const getElapsedTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / 60000);
    return Math.max(0, diffMinutes);
  };

  const getTimeColor = (minutes) => {
    if (minutes > 20) return 'text-red-700 bg-red-50 border-red-200';
    if (minutes > 10) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-[#3E2B21] bg-[#F3EDE5] border-[#EBE4D5]';
  };

  // Filter columns based on order status
  const toCookOrders = orders.filter(o => o.status === 'TO_COOK');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');

  const KitchenColumn = ({ title, activeOrders, icon: Icon, colorClass, textClass, dotClass, nextStatus, emptyText }) => (
    <div className="flex-1 flex flex-col min-w-[300px] sm:min-w-[340px] bg-white/40 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.02)] overflow-hidden h-full">
      {/* Column Header */}
      <div className={`p-4 sm:p-6 border-b border-white/50 ${colorClass}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${textClass}`} />
          </div>
          <div>
            <h2 className={`text-lg sm:text-xl font-black tracking-tight ${textClass}`}>{title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`h-2 w-2 rounded-full ${activeOrders.length > 0 ? `${dotClass} animate-pulse` : 'bg-gray-300'}`}></span>
              <p className="text-sm font-semibold text-gray-500">{activeOrders.length} ACTIVE</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {activeOrders.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center justify-center h-full opacity-60">
            <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Icon className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold">{emptyText}</p>
          </div>
        ) : (
          activeOrders.map((order) => {
            const elapsedTime = getElapsedTime(order.createdAt);

            return (
              <div
                key={order.id}
                onClick={() => nextStatus && updateOrderStatus(order.id, nextStatus)}
                className="bg-white rounded-[2rem] p-5 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer border border-transparent hover:border-[#3E2B21]/20 hover:-translate-y-1 group relative overflow-hidden"
              >
                {/* Status Bar */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${nextStatus === 'PREPARING' ? 'bg-orange-400' : 'bg-blue-400'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                {/* Order Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-dashed border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-black text-[#3E2B21]">
                      #{order.orderNumber?.slice(-3) || order.id.slice(0, 3)}
                    </span>
                    {order.table ? (
                      <span className="px-3 py-1 rounded-full bg-[#3E2B21]/5 text-[#3E2B21] text-xs font-bold uppercase tracking-wider border border-[#3E2B21]/10">
                        {order.table.name}
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider border border-orange-100">
                        Takeaway
                      </span>
                    )}
                  </div>

                  <div className={`px-3 py-1 rounded-full flex items-center gap-1.5 border leading-none ${getTimeColor(elapsedTime)}`}>
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-bold text-xs">{elapsedTime}m</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 p-2 rounded-xl group-hover:bg-[#FBFBF2] transition-colors"
                    >
                      <div className="h-8 w-8 bg-[#3E2B21] text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                        {item.quantity}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 leading-snug">{item.productName}</p>
                        {item.variantName && (
                          <p className="text-xs text-gray-500 font-medium">+ {item.variantName}</p>
                        )}
                        {item.notes && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wide rounded border border-amber-100">
                            <AlertCircle className="h-3 w-3" />
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Hint */}
                {nextStatus && (
                  <div className="mt-4 pt-3 flex items-center justify-center border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-xs font-bold text-[#3E2B21] uppercase tracking-widest flex items-center gap-2">
                      {nextStatus === 'PREPARING' ? (
                        <>Start Cooking <Flame className="h-4 w-4" /></>
                      ) : nextStatus === 'COMPLETED' ? (
                        <>Mark Ready <CheckCircle className="h-4 w-4" /></>
                      ) : (
                        <>Mark Served <Utensils className="h-4 w-4" /></>
                      )}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#FBFBF2] overflow-hidden font-sans">
      {lastError && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-bold flex items-center justify-center gap-2 shadow-lg z-50">
          <AlertCircle className="h-5 w-5" />
          {lastError}
        </div>
      )}

      {/* Notifications are now managed by global PopupProvider */}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-gray-100 z-20 px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto w-full">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="h-10 w-10 sm:h-16 sm:w-16 relative bg-white rounded-xl sm:rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-[#3E2B21]/10 transform hover:rotate-6 transition-transform duration-300 cursor-pointer overflow-hidden border border-gray-100 p-1 sm:p-2">
               <Image src="/brew_and_bite_logo.png" alt="Logo" width={48} height={48} className="object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#3E2B21] tracking-tight">
                Kitchen Display
              </h1>
              <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                <span className="h-2 w-2 rounded-full bg-[#D4A373] animate-pulse"></span>
                <p className="text-gray-500 font-medium text-sm">Live Feed • {toCookOrders.length + preparingOrders.length} Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Stats Pills */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-4 mr-2 sm:mr-8">
              <div className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-orange-50 rounded-xl sm:rounded-2xl border border-orange-100 flex flex-col items-center min-w-[70px] sm:min-w-[100px]">
                <span className="text-[9px] sm:text-[10px] font-bold text-orange-400 uppercase tracking-widest">Pending</span>
                <span className="text-lg sm:text-2xl font-black text-orange-600 leading-none mt-0.5 sm:mt-1">{toCookOrders.length}</span>
              </div>
              <div className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-100 flex flex-col items-center min-w-[70px] sm:min-w-[100px]">
                <span className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-widest">Cooking</span>
                <span className="text-lg sm:text-2xl font-black text-blue-600 leading-none mt-0.5 sm:mt-1">{preparingOrders.length}</span>
              </div>
            </div>

            <div className="h-10 w-px bg-gray-200 mx-0 sm:mx-2 hidden sm:block"></div>

            <button
              onClick={() => fetchOrders()}
              className="h-10 w-10 sm:h-12 sm:w-12 bg-white border-2 border-gray-100 text-gray-500 rounded-xl sm:rounded-2xl hover:border-[#3E2B21] hover:text-[#3E2B21] transition-all flex items-center justify-center group"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="px-3 sm:px-6 py-2 sm:py-3 bg-[#3E2B21] text-white rounded-xl sm:rounded-2xl font-bold hover:bg-[#2C1810] shadow-lg shadow-[#3E2B21]/20 hover:shadow-xl transition-all flex items-center gap-2 transform active:scale-95 text-sm sm:text-base"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Exit KDS</span>
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 p-3 sm:p-5 lg:p-8 overflow-hidden">
        <div className="flex gap-3 sm:gap-5 lg:gap-8 h-full max-w-[1920px] mx-auto w-full overflow-x-auto pb-2">
          <KitchenColumn
            title="To Cook"
            activeOrders={toCookOrders}
            icon={Package}
            colorClass="bg-gradient-to-r from-orange-50 to-transparent"
            textClass="text-orange-600"
            dotClass="bg-orange-600"
            nextStatus="PREPARING"
            emptyText="All caught up! No pending orders"
          />
          <KitchenColumn
            title="On The Grill"
            activeOrders={preparingOrders}
            icon={Flame}
            colorClass="bg-gradient-to-r from-blue-50 to-transparent"
            textClass="text-blue-600"
            dotClass="bg-blue-600"
            nextStatus="COMPLETED"
            emptyText="Kitchen is clear"
          />
          <KitchenColumn
            title="Ready to Serve"
            activeOrders={completedOrders}
            icon={CheckCircle}
            colorClass="bg-gradient-to-r from-emerald-50 to-transparent"
            textClass="text-emerald-600"
            dotClass="bg-emerald-600"
            nextStatus="SERVED"
            emptyText="No orders waiting for pickup"
          />
        </div>
      </div>
    </div>
  );
}