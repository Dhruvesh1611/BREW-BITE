"use client";

import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cart-store";
import { Trash2, Minus, Plus, CreditCard, ChefHat, User, MapPin, Package, List } from "lucide-react";
import { usePopup } from "@/context/PopupContext";
import OrderTypeModal from "./OrderTypeModal";

export default function CartSidebar({ onAddCustomer }) {
  const { cart, removeItem, addItem, decreaseQuantity, clearCart, customer, orderId, coupon } = useCartStore();
  const { showToast, showAlert } = usePopup();
  const [selectedTable, setSelectedTable] = useState(null);
  const [sending, setSending] = useState(false);
  const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const latestState = useRef({ cart, customer, orderId, coupon });
  useEffect(() => {
    latestState.current = { cart, customer, orderId, coupon };
  }, [cart, customer, orderId, coupon]);

  useEffect(() => {
    const tableData = localStorage.getItem('selectedTable');
    if (tableData) {
      setSelectedTable(JSON.parse(tableData));
    }
  }, [cart]); // Refresh when cart changes to pick up table updates

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  };

  const getTax = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = Number(item.price) * item.quantity;
      const tax = (itemTotal * (Number(item.tax) || 0)) / 100;
      return sum + tax;
    }, 0);
  };

  const subtotal = getSubtotal();
  const tax = getTax();
  const total = subtotal + tax;

  const handleGoToCart = async () => {
    const { cart: currentCart, customer: currentCustomer } = latestState.current;
    
    if (currentCart.length === 0) return;

    const isTakeawayExplicit = localStorage.getItem('isTakeaway') === 'true';
    if (!selectedTable && !isTakeawayExplicit) {
      setPendingAction('GOTO_CART');
      setShowOrderTypeModal(true);
      return;
    }

    if (!currentCustomer || !currentCustomer.name || !currentCustomer.email || !currentCustomer.mobile) {
      onAddCustomer(() => handleGoToCart());
      return;
    }

    window.location.href = '/pos/cart';
  };

  const handleSendToKitchen = async () => {
    const { cart: currentCart, customer: currentCustomer } = latestState.current;
    if (currentCart.length === 0) return;

    const isTakeawayExplicit = localStorage.getItem('isTakeaway') === 'true';
    if (!selectedTable && !isTakeawayExplicit) {
      setPendingAction('KITCHEN');
      setShowOrderTypeModal(true);
      return;
    }

    if (!currentCustomer || !currentCustomer.name || !currentCustomer.email || !currentCustomer.mobile) {
      onAddCustomer(() => handleSendToKitchen());
      return;
    }
    setSending(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');
      const session = JSON.parse(localStorage.getItem('activeSession') || '{}');

      if (!session || !session.id) {
        throw new Error("No active session found. Please start a session first.");
      }

      // Create Order with status SENT in one go
      const orderPayload = {
        sessionId: session.id,
        tableId: selectedTable?.id || undefined,
        status: 'SENT',
        type: selectedTable ? "DINE_IN" : "TAKEAWAY",
        items: currentCart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        })),
        customer: currentCustomer || undefined
      };

      const orderResponse = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.text();
        throw new Error(`Failed to create order: ${errorData || orderResponse.statusText}`);
      }

      clearCart();
      localStorage.removeItem('pendingOrder');
      localStorage.removeItem('pendingCustomer');
      localStorage.removeItem('isTakeaway');
      localStorage.removeItem('selectedTable');
      
      showToast("Order sent to kitchen successfully!", "success");
      window.location.href = '/pos/tables';
    } catch (error) {
      console.error('Send to kitchen error:', error);
      showAlert(error.message, "Send to Kitchen Error", "error");
    } finally {
      setSending(false);
    }
  };

  const handleOrderTypeSelect = (type) => {
    setShowOrderTypeModal(false);
    if (type === 'TAKEAWAY') {
      localStorage.setItem('isTakeaway', 'true');
      localStorage.removeItem('selectedTable');
      setSelectedTable(null);
      if (pendingAction === 'GOTO_CART') {
        setTimeout(() => handleGoToCart(), 50);
      } else if (pendingAction === 'KITCHEN') {
        setTimeout(() => handleSendToKitchen(), 50);
      }
    } else if (type === 'DINE_IN') {
      localStorage.removeItem('isTakeaway');
      window.location.href = '/pos/tables';
    }
    setPendingAction(null);
  };

  return (
    <aside className="hidden lg:flex w-[360px] bg-[#FDFCF7] border-l border-[#EBE4D5] flex-col h-full min-h-0 shadow-[-20px_0_50px_rgba(62,43,33,0.03)] relative z-10">
      <OrderTypeModal 
        isOpen={showOrderTypeModal} 
        onClose={() => setShowOrderTypeModal(false)} 
        onSelect={handleOrderTypeSelect}
      />
      {/* Header */}
      <div className="p-6 border-b border-[#EBE4D5] bg-white shrink-0">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-black text-[#3E2B21] tracking-tight">Current Order</h2>
          {cart.length > 0 && (
            <button 
              onClick={clearCart} 
              className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-[0.1em] px-4 py-2 rounded-full hover:bg-red-50 transition-colors border border-red-100 shadow-sm"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Customer & Table Badges */}
        <div className="flex gap-3">
          {selectedTable ? (
            <button onClick={() => setShowOrderTypeModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F3EDE5] hover:bg-[#EBE4D5] text-[#3E2B21] text-xs font-bold border border-[#EBE4D5] shadow-sm transition-colors">
              <MapPin className="h-4 w-4 text-[#8C8775]" />
              <span>{selectedTable.name}</span>
            </button>
          ) : localStorage.getItem('isTakeaway') === 'true' ? (
            <button onClick={() => setShowOrderTypeModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold border border-orange-100 shadow-sm transition-colors">
              <Package className="h-4 w-4 text-orange-600" />
              <span>Takeaway</span>
            </button>
          ) : (
            <button onClick={() => setShowOrderTypeModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200 shadow-sm transition-colors">
              <span>Select Type</span>
            </button>
          )}

          <button
            onClick={onAddCustomer}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F3EDE5] text-[#3E2B21] text-xs font-bold border border-[#EBE4D5] shadow-sm transition-all cursor-pointer flex-1"
          >
            <User className="h-4 w-4 text-[#8C8775]" />
            <span className="truncate">{customer?.name || "Walk-in Customer"}</span>
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FDFCF7] scrollbar-thin scrollbar-thumb-[#EBE4D5] scrollbar-track-transparent">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-[#EBE4D5] shadow-sm">
              <List className="h-10 w-10 text-[#8C8775]/50" />
            </div>
            <p className="font-black text-[#3E2B21] text-xl">Order is empty</p>
            <p className="text-sm text-[#8C8775] max-w-[220px] mt-2 font-medium leading-relaxed">Select items from the menu to start building the order.</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex gap-4 p-4 bg-white rounded-[24px] border border-[#EBE4D5] shadow-sm hover:shadow-md transition-all group">
              <div className="h-20 w-20 bg-[#F3EDE5] rounded-[16px] overflow-hidden relative shrink-0">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-[#8C8775]/30" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-black text-[#3E2B21] truncate leading-tight pr-2 text-base">{item.name}</h4>
                    <p className="font-black text-[#3E2B21]">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                  <p className="text-[10px] font-bold text-[#8C8775] uppercase tracking-wider">
                    {item.category?.name || "Menu"}
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center bg-[#FDFCF7] border border-[#EBE4D5] rounded-full h-10 px-1 shadow-inner">
                    <button 
                      onClick={() => decreaseQuantity(item.id)}
                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white text-[#8C8775] hover:text-[#3E2B21] transition-all hover:shadow-sm"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-black w-8 text-center text-[#3E2B21]">{item.quantity}</span>
                    <button 
                      onClick={() => addItem(item)}
                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-white text-[#8C8775] hover:text-[#3E2B21] transition-all hover:shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Section */}
      <div className="p-7 bg-white border-t border-[#EBE4D5] shadow-[0_-10px_40px_rgba(62,43,33,0.04)] z-20 shrink-0">
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm text-[#8C8775] font-bold">
            <span>Subtotal</span>
            <span className="text-[#3E2B21]">₹{subtotal.toFixed(2)}</span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm text-[#8C8775] font-bold">
              <span>Tax</span>
              <span className="text-[#3E2B21]">₹{tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-dashed border-[#EBE4D5] mt-4">
            <span className="text-base font-bold text-[#8C8775] uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black text-[#3E2B21]">₹{total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleGoToCart}
            disabled={cart.length === 0}
            className="w-full h-16 bg-[#EBE4D5] text-[#3E2B21] rounded-[24px] font-black text-xl hover:bg-[#D4A373] hover:text-white transition-all duration-300 shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            <CreditCard className="h-6 w-6" />
            <span>Go to Cart</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
