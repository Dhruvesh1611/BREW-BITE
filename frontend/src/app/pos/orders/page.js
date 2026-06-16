"use client";

import { useState, useEffect } from "react";
import { Clock, Receipt, Search, X, Download } from "lucide-react";
import emailjs from '@emailjs/browser';
import { usePopup } from "@/context/PopupContext";

export default function POSOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { showToast, showAlert } = usePopup();

  // Local state for Email Receipt Input Dialog
  const [emailOrder, setEmailOrder] = useState(null);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const activeSession = JSON.parse(localStorage.getItem('activeSession') || '{}');
      if (!activeSession.id) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/orders?sessionId=${activeSession.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Keep full data for modal, formatted for list
        const formatted = data.map(order => ({
          ...order,
          displayId: order.orderNumber || order.id.slice(0, 8),
          time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          totalFormatted: Number(order.totalAmount).toFixed(2),
          itemCountString: `${order.items?.length || 0} items`
        }));
        setOrders(formatted);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailReceipt = async (orderToEmail, recipient) => {
    // EmailJS Configuration
    const SERVICE_ID = process.env.NEXT_PUBLIC_SERVICE_ID;
    const PUBLIC_KEY = process.env.NEXT_PUBLIC_PUBLIC_KEY;
    const TEMPLATE_ID = process.env.NEXT_PUBLIC_TEMPLATE_ID;

    const templateParams = {
      email: recipient,
      order_id: orderToEmail.orderNumber,
      orders: orderToEmail.items.map(item => ({
        name: item.productName,
        price: Number(item.price).toFixed(2),
        price_formatted: `₹${Number(item.price).toFixed(2)}`,
        units: item.quantity
      })),
      cost: {
        shipping: "0.00",
        tax: (Number(orderToEmail.totalAmount) - orderToEmail.items.reduce((s, i) => s + (Number(i.price) * i.quantity), 0)).toFixed(2),
        total: Number(orderToEmail.totalAmount).toFixed(2)
      },
      message: `Receipt for Order ${orderToEmail.orderNumber}. Total: ₹${Number(orderToEmail.totalAmount).toFixed(2)}`
    };

    try {
      const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      console.log('SUCCESS!', response.status, response.text);
      showToast(`Receipt sent successfully to ${recipient}!`, "success");
    } catch (error) {
      console.error('FAILED...', error);
      showAlert(`Failed to send email: ${error.text || 'Unknown Error'}`, "Email Receipt", "error");
    }
  };

  const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const getStatusBadgeClass = (status) => {
      const statusClasses = {
        DRAFT: "bg-[#FDFCF7] text-[#3E2B21] border border-[#EBE4D5]",
        SENT: "bg-[#EBE4D5] text-[#3E2B21] border border-[#C4A882]",
        PREPARING: "bg-[#FDFCF7] text-[#8C8775] border border-[#EBE4D5]",
        COMPLETED: "bg-[#EBE4D5] text-[#3E2B21] border border-[#C4A882]",
        PAID: "bg-[#EBE4D5] text-[#3E2B21] border border-[#C4A882]",
        CANCELLED: "bg-red-50 text-red-600 border border-red-100",
      };
      return statusClasses[status] || "bg-[#FDFCF7] text-[#8C8775] border border-[#EBE4D5]";
    };

    const handleEmailReceipt = async () => {
      const recipient = order.customerEmail;
      if (!recipient) {
        setEmailInput("");
        setEmailOrder(order);
      } else {
        await sendEmailReceipt(order, recipient);
      }
    };

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-[2.5rem] max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-[#EBE4D5]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-[#EBE4D5] flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-bold text-[#3E2B21]">Order Details</h2>
              <p className="text-sm text-[#8C8775]">{order.orderNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#FDFCF7] rounded-full text-[#8C8775] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
              <span className="text-sm text-[#8C8775]">{new Date(order.createdAt).toLocaleString()}</span>
            </div>

            {/* Customer Info */}
            {(order.table || order.customerName) && (
              <div className="bg-[#FDFCF7] p-4 rounded-xl space-y-2 border border-[#EBE4D5]">
                {order.table && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8C8775]">Table</span>
                    <span className="font-bold text-[#3E2B21]">{order.table.name}</span>
                  </div>
                )}
                {order.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8C8775]">Customer</span>
                    <span className="font-bold text-[#3E2B21]">{order.customerName}</span>
                  </div>
                )}
                {order.customerEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8C8775]">Email</span>
                    <span className="text-[#8C8775]">{order.customerEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="font-bold text-[#3E2B21] mb-3">Items</h3>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 flex items-center justify-center bg-[#EBE4D5] text-[#3E2B21] rounded text-xs font-bold">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-[#3E2B21]">{item.productName}</p>
                        {item.variantName && <p className="text-xs text-[#8C8775]">{item.variantName}</p>}
                      </div>
                    </div>
                    <p className="font-bold text-[#3E2B21]">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-dashed border-[#EBE4D5] pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold text-[#3E2B21]">
                <span>Total</span>
                <span>₹{Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-[#EBE4D5] bg-[#FDFCF7] space-y-3">
            {order.status !== 'PAID' && order.status !== 'CANCELLED' && (
              <button
                onClick={() => window.location.href = `/pos/payment?orderId=${order.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F5A623] hover:bg-[#D48A14] text-white font-bold transition-all shadow-lg"
              >
                <Receipt className="h-5 w-5" />
                Pay Now
              </button>
            )}
            <button
              onClick={handleEmailReceipt}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3E2B21] text-white font-bold hover:bg-[#2C1810] transition-colors shadow-lg"
            >
              <Download className="h-5 w-5" />
              Send via Email
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-6 bg-[#FDFCF7] p-6 lg:p-8">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-3xl font-black text-[#3E2B21] tracking-tight">Recent Orders</h1>
        <div className="relative min-w-[320px]">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#8C8775]" />
          <input
            placeholder="Search receipt #..."
            className="w-full pl-14 pr-5 py-3.5 rounded-[20px] border-2 border-white focus:border-[#3E2B21]/20 focus:outline-none transition-all bg-white shadow-[0_8px_30px_rgb(62,43,33,0.04)] font-semibold text-[#3E2B21] placeholder:text-[#8C8775]/60"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(62,43,33,0.03)] border border-[#EBE4D5] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#EBE4D5] flex items-center justify-between bg-white z-10">
          <span className="font-black text-[#3E2B21] text-lg">Order History</span>
          <button className="text-[#8C8775] font-bold text-sm hover:text-[#3E2B21] transition-colors">View All</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-4 scrollbar-thin scrollbar-thumb-[#EBE4D5] scrollbar-track-transparent">
          {orders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="flex items-center justify-between p-5 bg-white hover:bg-[#FDFCF7] rounded-[24px] transition-all duration-300 cursor-pointer border border-[#EBE4D5] hover:border-[#3E2B21]/30 hover:shadow-md group"
            >
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 bg-[#F3EDE5] rounded-2xl flex items-center justify-center text-[#3E2B21] shadow-sm">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-[#3E2B21] text-lg">{order.displayId}</p>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C8775] font-bold mt-0.5">
                    <Clock className="h-3.5 w-3.5" /> {order.time} • {order.itemCountString}
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <p className="font-black text-[#3E2B21] text-lg">₹{order.totalFormatted}</p>
                <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full font-black inline-block mt-2 ${order.status === 'COMPLETED' ? 'bg-[#EBE4D5] text-[#3E2B21] border border-[#C4A882]' :
                  order.status === 'PREPARING' ? 'bg-[#FDFCF7] text-[#8C8775] border border-[#EBE4D5]' :
                    'bg-[#FDFCF7] text-[#8C8775] border border-[#EBE4D5]'
                  }`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Custom Email Input Modal */}
      {emailOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-[#FAF9F6] rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 border border-coffee-200/50">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-[#3E2B21]">Send Email Receipt</h2>
              <p className="text-[#8C8775] mt-1">Please enter the customer's email address.</p>
            </div>

            <div className="mb-6">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="customer@example.com"
                autoFocus
                className="w-full px-5 py-4 rounded-[2rem] bg-white border-2 border-[#EBE4D5] focus:border-[#3E2B21] focus:outline-none transition-all font-bold text-[#3E2B21]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setEmailOrder(null)}
                className="px-6 py-4 bg-[#FDFCF7] text-[#8C8775] rounded-[2rem] font-bold hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (emailInput.trim()) {
                    sendEmailReceipt(emailOrder, emailInput.trim());
                    setEmailOrder(null);
                  }
                }}
                disabled={!emailInput.trim()}
                className="px-6 py-4 bg-[#3E2B21] text-white rounded-[2rem] font-bold hover:bg-[#2C1810] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

