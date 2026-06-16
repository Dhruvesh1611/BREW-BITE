"use client";

import { MapPin, Package, X } from "lucide-react";

export default function OrderTypeModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(62,43,33,0.12)] animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="p-6 border-b border-[#EBE4D5] flex items-center justify-between bg-[#FDFCF7]">
          <h2 className="text-xl font-black text-[#3E2B21]">Select Order Type</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#EBE4D5] rounded-full transition-colors">
            <X className="h-5 w-5 text-[#8C8775]" />
          </button>
        </div>

        <div className="p-8 flex flex-col sm:flex-row gap-6">
          <button
            onClick={() => onSelect('TAKEAWAY')}
            className="flex-1 p-8 rounded-[24px] border-2 border-orange-100 hover:border-orange-300 bg-orange-50 hover:bg-orange-100/50 transition-all group flex flex-col items-center gap-4 text-center hover:shadow-[0_8px_20px_rgba(234,88,12,0.1)] hover:-translate-y-1"
          >
            <div className="h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-black text-[#3E2B21] text-lg mb-1">Takeaway</h3>
              <p className="text-sm font-medium text-[#8C8775]">Customer will pick up the order</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('DINE_IN')}
            className="flex-1 p-8 rounded-[24px] border-2 border-[#EBE4D5] hover:border-[#3E2B21]/30 bg-[#F3EDE5] hover:bg-[#EBE4D5]/50 transition-all group flex flex-col items-center gap-4 text-center hover:shadow-[0_8px_20px_rgba(62,43,33,0.08)] hover:-translate-y-1"
          >
            <div className="h-16 w-16 bg-white text-[#3E2B21] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
              <MapPin className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-black text-[#3E2B21] text-lg mb-1">Dine In</h3>
              <p className="text-sm font-medium text-[#8C8775]">Serve to a specific table</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
