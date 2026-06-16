// frontend/src/app/pos/tables/page.js
"use client";

import { useState, useEffect } from "react";
import { Users, ArrowLeft, Coffee, Shuffle, Check, X, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import CoffeeLoader from "@/components/ui/CoffeeLoader";
import { useCartStore } from "@/stores/cart-store";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { usePopup } from "@/context/PopupContext";

export default function TablesPage() {
  const router = useRouter();
  const { loadOrder, clearCart } = useCartStore();

  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Table Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState("");
  const [transferDest, setTransferDest] = useState("");

  const { showToast, showAlert, showConfirm } = usePopup();

  // Free Table State
  const { user } = useAuthStore();
  const canFreeTable = user && ['ADMIN', 'EMPLOYEE'].includes(user.role);

  useEffect(() => {
    fetchFloors();

    // Socket.IO Integration
    const socket = getSocket();
    socket.emit('join', 'cashier-room');

    socket.on('table_status_changed', (data) => {
      console.log('📶 Table status updated via socket:', data);
      setFloors(prevFloors => 
        prevFloors.map(floor => ({
          ...floor,
          tables: floor.tables.map(table => 
            table.id === data.tableId ? { ...table, status: data.status } : table
          )
        }))
      );
    });

    socket.on('kitchen_completed', (order) => {
      console.log('📶 Kitchen completed via socket:', order);
      if (order.table) {
        showToast(`Order #${order.orderNumber?.slice(-3) || 'POS'} is READY for ${order.table.name}!`, 'info');
      }
    });

    return () => {
      socket.off('table_status_changed');
      socket.off('kitchen_completed');
    };
  }, [showToast]);

  const fetchFloors = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/floors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setFloors(data);
        if (data.length > 0 && !selectedFloor) {
          setSelectedFloor(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch floors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = async (table) => {
    localStorage.setItem('selectedTable', JSON.stringify(table));
    
    if (table.status === 'OCCUPIED') {
      // Fetch the active order for this table
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/orders?tableId=${table.id}&active=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const activeOrders = await res.json();
          if (activeOrders.length > 0) {
            loadOrder(activeOrders[0]);
            router.push(`/pos/terminal?table=${table.id}`);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load active order:", err);
      }
    }

    // Default: Clear cart and start new order
    clearCart();
    router.push(`/pos/terminal?table=${table.id}`);
  };

  // Process Table Transfer
  const handleTransfer = async () => {
    if (!transferSource || !transferDest) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/tables/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sourceTableId: transferSource,
          destTableId: transferDest
        })
      });

      if (response.ok) {
        showToast("Table transfer completed successfully!", "success");
        setShowTransferModal(false);
        setTransferSource("");
        setTransferDest("");
        fetchFloors();
      } else {
        const err = await response.json();
        showAlert(err.error || "Failed to transfer table", "Transfer Order", "error");
      }
    } catch (error) {
      console.error('Failed to transfer table:', error);
      showAlert('Error transferring table', "Transfer Order", "error");
    }
  };

  // Toggle Table Reserved status manually
  const toggleReservation = async (e, table) => {
    e.stopPropagation(); // Avoid triggering navigation
    const currentStatus = table.status;
    let newStatus = 'AVAILABLE';
    if (currentStatus === 'AVAILABLE') {
      newStatus = 'RESERVED';
    } else if (currentStatus === 'RESERVED') {
      newStatus = 'AVAILABLE';
    } else {
      showAlert("Occupied tables cannot be reserved directly.", "Reservation", "warning");
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/tables/${table.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: table.name,
          seats: table.seats,
          status: newStatus
        })
      });

      if (response.ok) {
        // Optimistic update
        setFloors(prevFloors => 
          prevFloors.map(floor => ({
            ...floor,
            tables: floor.tables.map(t => 
              t.id === table.id ? { ...t, status: newStatus } : t
            )
          }))
        );
        showToast(`Table status set to ${newStatus.toLowerCase()}`, "success");
      }
    } catch (error) {
      console.error('Failed to toggle reservation:', error);
    }
  };

  const handleFreeTableConfirm = async (table) => {
    const confirmed = await showConfirm(`Are you sure you want to free ${table.name}?`, "Free Table");
    if (!confirmed) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/tables/${table.id}/free`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast("Table has been freed successfully.", "success");
        
        // Close table session in frontend if currently selected
        const tableData = localStorage.getItem('selectedTable');
        if (tableData) {
          const selected = JSON.parse(tableData);
          if (selected.id === table.id) {
            localStorage.removeItem('selectedTable');
            localStorage.removeItem('payingOrderId');
            clearCart();
          }
        }

        fetchFloors();
      } else {
        const err = await response.json();
        if (err.error === 'UNPAID_ACTIVE_ORDER') {
          showAlert("Please complete or cancel the active order before freeing the table.", "Free Table", "error");
        } else {
          showAlert(err.message || err.error || "Failed to free table", "Free Table", "error");
        }
      }
    } catch (error) {
      console.error('Failed to free table:', error);
      showAlert('Error freeing table', "Free Table", "error");
    }
  };

  const currentFloor = floors.find(f => f.id === selectedFloor);

  // Helpers for table styling
  const getTableStatusColor = (status) => {
    switch(status) {
      case 'OCCUPIED':
        return 'border-[#EF4444] text-[#EF4444] bg-[#FEF2F2] hover:border-[#EF4444]/80 shadow-[0_15px_30px_rgba(239,68,68,0.1)]';
      case 'RESERVED':
        return 'border-[#F59E0B] text-[#F59E0B] bg-[#FFFBEB] hover:border-[#F59E0B]/80 shadow-[0_15px_30px_rgba(245,158,11,0.1)]';
      case 'AVAILABLE':
      default:
        return 'border-[#10B981] text-[#10B981] bg-[#ECFDF5] hover:border-[#10B981]/80 shadow-[0_15px_30px_rgba(16,185,129,0.1)]';
    }
  };

  const getTableBadge = (status) => {
    switch(status) {
      case 'OCCUPIED':
        return '🔴 Occupied';
      case 'RESERVED':
        return '🟡 Reserved';
      case 'AVAILABLE':
      default:
        return '🟢 Available';
    }
  };

  return (
    <div className="h-full bg-[#FDFCF7] relative p-6 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="mb-8 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-[#3E2B21] tracking-tight">
              Table Layout
            </h1>
            <p className="text-[#8C8775] mt-1">Select a table to manage its cart or start order</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-5 py-3 bg-white border-2 border-[#EBE4D5] text-[#3E2B21] rounded-2xl font-bold flex items-center gap-2 hover:bg-[#EBE4D5] hover:border-[#3E2B21] transition-all shadow-md"
            >
              <Shuffle className="h-5 w-5" />
              Transfer Order
            </button>
            <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-[#EBE4D5]">
              <Coffee className="h-8 w-8 text-[#3E2B21]" />
            </div>
          </div>
        </div>

        {/* Floor Tabs */}
        <div className="bg-white rounded-[2rem] p-2 shadow-lg inline-flex gap-2 border border-[#EBE4D5]">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setSelectedFloor(floor.id)}
              className={`px-8 py-4 rounded-[2rem] font-black transition-all duration-300 ${
                selectedFloor === floor.id
                  ? 'bg-[#3E2B21] text-white shadow-lg transform scale-105'
                  : 'text-[#8C8775] hover:bg-[#EBE4D5]'
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <CoffeeLoader size="lg" text="Setting Tables..." />
        </div>
      ) : (
        <div className="w-full flex-1 overflow-y-auto pr-4 pb-20 scrollbar-thin scrollbar-thumb-[#EBE4D5] scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentFloor?.tables?.map((table) => {
              const statusStyle = getTableStatusColor(table.status);
              const badgeText = getTableBadge(table.status);

              return (
                <div
                  key={table.id}
                  onClick={() => handleTableSelect(table)}
                  className={`group bg-white rounded-[3rem] p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 border-[3px] ${statusStyle} cursor-pointer flex flex-col items-center justify-center text-center aspect-square relative`}
                >
                  {/* Seats Indicator */}
                  <div className="absolute top-5 right-5 flex items-center gap-1.5 text-xs font-black opacity-80 bg-white/60 backdrop-blur px-2 py-1 rounded-full border border-inherit">
                    <Users className="h-3 w-3" />
                    <span>{table.seats}</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center w-full mt-4">
                    <h3 className="text-2xl font-black mb-2">{table.name}</h3>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 shadow-sm border border-inherit">
                      {badgeText}
                    </span>
                  </div>

                  <div className="w-full mt-auto">
                    {table.status === 'OCCUPIED' ? (
                      canFreeTable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFreeTableConfirm(table);
                          }}
                          className="w-full text-[11px] font-black uppercase tracking-wider py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-md"
                        >
                          Free Table
                        </button>
                      )
                    ) : (
                      <button
                        onClick={(e) => toggleReservation(e, table)}
                        className={`w-full text-[11px] font-black uppercase tracking-wider py-2.5 rounded-2xl border-2 transition-all ${
                          table.status === 'RESERVED'
                            ? 'bg-[#F59E0B] text-white border-transparent'
                            : 'bg-white text-[#8C8775] border-[#EBE4D5] hover:border-[#3E2B21] hover:text-[#3E2B21] hover:bg-[#FDFCF7]'
                        }`}
                      >
                        {table.status === 'RESERVED' ? 'Unreserve' : 'Reserve'}
                      </button>
                    )}
                    {table.status === 'OCCUPIED' && table.orders?.[0] && (
                      <span className="block text-sm font-black text-[#3E2B21] mt-2">
                        ₹{Number(table.orders[0].totalAmount).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {(!currentFloor?.tables || currentFloor.tables.length === 0) && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-[#8C8775] text-lg font-bold">No tables available on this floor</p>
            </div>
          )}
        </div>
      )}

      {/* Table Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 border border-[#EBE4D5]">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-[#EBE4D5] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shuffle className="h-8 w-8 text-[#3E2B21]" />
              </div>
              <h2 className="text-2xl font-black text-[#3E2B21]">Transfer Order</h2>
              <p className="text-[#8C8775]">Move active order to another table</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-[#3E2B21] mb-2">From Table (Occupied)</label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#3E2B21] focus:outline-none bg-white font-semibold"
                >
                  <option value="">Select source table</option>
                  {floors.flatMap(f => f.tables)
                    .filter(t => t.status === 'OCCUPIED')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Occupied)</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#3E2B21] mb-2">To Table (Available)</label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#3E2B21] focus:outline-none bg-white font-semibold"
                >
                  <option value="">Select target table</option>
                  {floors.flatMap(f => f.tables)
                    .filter(t => t.status === 'AVAILABLE')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name} (Available)</option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setShowTransferModal(false); setTransferSource(""); setTransferDest(""); }}
                className="px-6 py-4 bg-[#FDFCF7] text-[#8C8775] rounded-[2rem] font-bold hover:bg-[#EBE4D5] transition-colors border border-[#EBE4D5]"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferSource || !transferDest}
                className="px-6 py-4 bg-[#3E2B21] text-white rounded-[2rem] font-bold hover:bg-[#2C1810] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}