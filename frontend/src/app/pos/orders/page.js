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
        DRAFT: "bg-[#FBFBF2] text-[#1A4D2E] border border-[#E8F5E9]",
        SENT: "bg-[#E8F5E9] text-[#1A4D2E] border border-[#4ADE80]",
        PREPARING: "bg-[#FBFBF2] text-[#5F6F65] border border-[#E8F5E9]",
        COMPLETED: "bg-[#E8F5E9] text-[#1A4D2E] border border-[#4ADE80]",
        PAID: "bg-[#E8F5E9] text-[#1A4D2E] border border-[#4ADE80]",
        CANCELLED: "bg-red-50 text-red-600 border border-red-100",
      };
      return statusClasses[status] || "bg-[#FBFBF2] text-[#5F6F65] border border-[#E8F5E9]";
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
          className="bg-white rounded-[2.5rem] max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col border border-[#E8F5E9]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-[#E8F5E9] flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-bold text-[#1A4D2E]">Order Details</h2>
              <p className="text-sm text-[#5F6F65]">{order.orderNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#FBFBF2] rounded-full text-[#5F6F65] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-6 overflow-y-auto flex-1">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
              <span className="text-sm text-[#5F6F65]">{new Date(order.createdAt).toLocaleString()}</span>
            </div>

            {/* Customer Info */}
            {(order.table || order.customerName) && (
              <div className="bg-[#FBFBF2] p-4 rounded-xl space-y-2 border border-[#E8F5E9]">
                {order.table && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6F65]">Table</span>
                    <span className="font-bold text-[#1A4D2E]">{order.table.name}</span>
                  </div>
                )}
                {order.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6F65]">Customer</span>
                    <span className="font-bold text-[#1A4D2E]">{order.customerName}</span>
                  </div>
                )}
                {order.customerEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6F65]">Email</span>
                    <span className="text-[#5F6F65]">{order.customerEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div>
              <h3 className="font-bold text-[#1A4D2E] mb-3">Items</h3>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 flex items-center justify-center bg-[#E8F5E9] text-[#1A4D2E] rounded text-xs font-bold">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-medium text-[#1A4D2E]">{item.productName}</p>
                        {item.variantName && <p className="text-xs text-[#5F6F65]">{item.variantName}</p>}
                      </div>
                    </div>
                    <p className="font-bold text-[#1A4D2E]">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-dashed border-[#E8F5E9] pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold text-[#1A4D2E]">
                <span>Total</span>
                <span>₹{Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-[#E8F5E9] bg-[#FBFBF2] space-y-3">
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1A4D2E] text-white font-bold hover:bg-[#143d24] transition-colors shadow-lg"
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
    <div className="h-full flex flex-col gap-6 bg-[#FBFBF2]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1A4D2E]">Recent Orders</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#5F6F65]" />
          <input
            placeholder="Search receipt #..."
            className="pl-12 pr-4 py-3 rounded-[2rem] border-2 border-[#E8F5E9] bg-white focus:border-[#1A4D2E] outline-none w-64 shadow-sm focus:shadow-lg transition-all"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl border border-[#E8F5E9] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#E8F5E9] flex items-center justify-between bg-[#FBFBF2]">
          <span className="font-bold text-[#1A4D2E]">History</span>
          <button className="text-[#1A4D2E] font-bold text-sm hover:text-[#143d24] transition-colors">View All</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {orders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="flex items-center justify-between p-4 hover:bg-[#FBFBF2] rounded-[2rem] transition-all duration-300 cursor-pointer border border-[#E8F5E9] hover:border-[#1A4D2E] group"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center text-[#1A4D2E]">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-[#1A4D2E]">{order.displayId}</p>
                  <div className="flex items-center gap-1 text-xs text-[#5F6F65]">
                    <Clock className="h-3 w-3" /> {order.time} • {order.itemCountString}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#1A4D2E]">₹{order.totalFormatted}</p>
                <span className={`text-xs px-2 py-1 rounded-full font-bold inline-block mt-1 ${order.status === 'COMPLETED' ? 'bg-[#E8F5E9] text-[#1A4D2E]' :
                  order.status === 'PREPARING' ? 'bg-[#FBFBF2] text-[#5F6F65] border border-[#E8F5E9]' :
                    'bg-[#FBFBF2] text-[#5F6F65] border border-[#E8F5E9]'
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
              <h2 className="text-2xl font-black text-[#1A4D2E]">Send Email Receipt</h2>
              <p className="text-[#5F6F65] mt-1">Please enter the customer's email address.</p>
            </div>

            <div className="mb-6">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="customer@example.com"
                autoFocus
                className="w-full px-5 py-4 rounded-[2rem] bg-white border-2 border-[#E8F5E9] focus:border-[#1A4D2E] focus:outline-none transition-all font-bold text-[#1A4D2E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setEmailOrder(null)}
                className="px-6 py-4 bg-[#FBFBF2] text-[#5F6F65] rounded-[2rem] font-bold hover:bg-gray-100 transition-colors border border-gray-200"
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
                className="px-6 py-4 bg-[#1A4D2E] text-white rounded-[2rem] font-bold hover:bg-[#143d24] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
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

