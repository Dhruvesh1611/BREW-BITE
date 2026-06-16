"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, TrendingUp, AlertTriangle, Clock, Calendar } from "lucide-react";

export default function CloseSessionModal({ session, onClose, onConfirm }) {
  const [closingCash, setClosingCash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shiftStats, setShiftStats] = useState({ totalOrders: 0, cashSales: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchShiftStats();
    return () => clearInterval(timer);
  }, []);

  const fetchShiftStats = async () => {
    try {
      if (!session?.id) return;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/orders?sessionId=${session.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const orders = await response.json();
        const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
        
        // Calculate cash sales - only PAID orders with CASH method
        const cashSales = activeOrders.reduce((sum, order) => {
          if (order.status === 'PAID') {
             const cashPayments = (order.payments || [])
               .filter(p => p.method === 'CASH' && p.status === 'CONFIRMED')
               .reduce((pSum, p) => pSum + Number(p.amount), 0);
             return sum + cashPayments;
          }
          return sum;
        }, 0);

        setShiftStats({
          totalOrders: activeOrders.length,
          cashSales
        });
      }
    } catch (error) {
      console.error("Failed to fetch shift stats", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (!session) return null;

  const openingCash = Number(session.openingCash || 0);
  const expectedCash = openingCash + shiftStats.cashSales;
  const actualCash = Number(closingCash || 0);
  const discrepancy = actualCash - expectedCash;

  const durationMs = currentTime - new Date(session.startAt);
  const durationHours = Math.floor(durationMs / 3600000);
  const durationMinutes = Math.floor((durationMs % 3600000) / 60000);
  const durationSeconds = Math.floor((durationMs % 60000) / 1000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onConfirm(closingCash);
    setIsSubmitting(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF9F6] rounded-[2.5rem] max-w-lg w-full max-h-[95vh] flex flex-col shadow-2xl border border-coffee-200/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 bg-gradient-to-r from-coffee-800 to-coffee-900 text-white relative shrink-0">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-3xl font-black tracking-tight">End Shift</h2>
              <p className="text-coffee-200/80 text-sm mt-1 font-medium">Reconcile cash and close session</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          {/* Status Badge */}
          <div className="mt-6 flex items-center gap-4">
             <div className="flex items-center gap-2 bg-sage-500/20 px-4 py-2 rounded-full border border-sage-500/30">
                <span className="h-2 w-2 rounded-full bg-sage-400 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-widest text-sage-100">Active Now</span>
             </div>
             <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                <Clock className="h-3.5 w-3.5 text-coffee-200" />
                <span className="text-xs font-bold text-coffee-100">
                  {durationHours}h {durationMinutes}m {durationSeconds}s
                </span>
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-coffee-200">
          {/* Time & Session Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-coffee-100 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                 </div>
                 <span className="text-xs font-bold text-coffee-400 uppercase tracking-wider">Started At</span>
               </div>
               <p className="text-lg font-black text-coffee-900">{new Date(session.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               <p className="text-[10px] text-coffee-400 font-bold mt-0.5">{new Date(session.startAt).toLocaleDateString()}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-coffee-100 shadow-sm">
               <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-orange-600" />
                 </div>
                 <span className="text-xs font-bold text-coffee-400 uppercase tracking-wider">Current Time</span>
               </div>
               <p className="text-lg font-black text-coffee-900">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               <p className="text-[10px] text-coffee-400 font-bold mt-0.5">{currentTime.toLocaleDateString()}</p>
            </div>
          </div>

          {/* Reconciliation Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
               <h3 className="text-sm font-black text-coffee-900 uppercase tracking-widest">Cash Reconciliation</h3>
               {isLoadingStats && <span className="text-[10px] font-bold text-coffee-400 animate-pulse">Syncing...</span>}
             </div>

             <div className="bg-white rounded-[2rem] border border-coffee-100 divide-y divide-coffee-50 overflow-hidden shadow-sm">
                <div className="p-5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-coffee-50 flex items-center justify-center text-coffee-600">
                         <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">Opening Cash</p>
                        <p className="text-base font-black text-coffee-900">₹{openingCash.toFixed(2)}</p>
                      </div>
                   </div>
                </div>
                <div className="p-5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-2xl bg-sage-50 flex items-center justify-center text-sage-600">
                         <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">Shift Cash Sales</p>
                        <p className="text-base font-black text-coffee-900">₹{shiftStats.cashSales.toFixed(2)}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-bold text-coffee-400 uppercase tracking-wider">Orders</p>
                      <p className="text-base font-black text-coffee-900">{shiftStats.totalOrders}</p>
                   </div>
                </div>
                <div className="p-5 bg-coffee-50/50 flex items-center justify-between">
                   <p className="text-sm font-black text-coffee-900">Expected in Drawer</p>
                   <p className="text-xl font-black text-coffee-900">₹{expectedCash.toFixed(2)}</p>
                </div>
             </div>
          </div>

          {/* Closing Cash Input */}
          <div className="space-y-3">
            <label className="block text-sm font-black text-coffee-900 uppercase tracking-widest ml-1">
              Actual Cash in Drawer
            </label>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-coffee-400 font-black text-xl">₹</span>
              <input
                type="number"
                step="0.01"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                required
                placeholder="0.00"
                autoFocus
                className="w-full pl-12 pr-6 py-5 rounded-[2rem] border-2 border-coffee-100 focus:border-coffee-800 focus:outline-none bg-white text-2xl font-black text-coffee-900 transition-all placeholder:text-coffee-200"
              />
            </div>
          </div>

          {/* Discrepancy Display */}
          {closingCash && (
            <div className={`p-6 rounded-[2rem] animate-in slide-in-from-top-2 duration-300 ${
              discrepancy >= -0.01 
                ? 'bg-sage-500/10 border border-sage-500/20' 
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  discrepancy >= -0.01 ? 'bg-sage-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {discrepancy >= -0.01 ? (
                    <TrendingUp className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-xs uppercase tracking-widest text-coffee-600">Reconciliation Result</p>
                  <p className={`text-2xl font-black ${
                    discrepancy >= -0.01 ? 'text-sage-700' : 'text-red-700'
                  }`}>
                    {discrepancy > 0 ? '+' : ''}{discrepancy.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-5 px-6 rounded-[2rem] font-black text-coffee-600 bg-coffee-50 hover:bg-coffee-100 transition-all border border-coffee-100"
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={!closingCash || isSubmitting || isLoadingStats}
              className="py-5 px-6 rounded-[2rem] font-black text-white bg-coffee-800 hover:bg-coffee-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-coffee-900/20 transform hover:-translate-y-1 active:translate-y-0"
            >
              {isSubmitting ? 'Closing...' : 'Close Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
