"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingCart, RefreshCw, Power, Coffee, User, Plus } from "lucide-react";
import CustomerModal from "@/components/pos/CustomerModal";
import CloseSessionModal from "@/components/pos/CloseSessionModal";
import CoffeeLoader from "@/components/ui/CoffeeLoader";
import { useCartStore } from "@/stores/cart-store";
import CartSidebar from "@/components/pos/cart-sidebar";
import { usePopup } from "@/context/PopupContext";

export default function POSTerminalPage() {
  const { showAlert } = usePopup();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const { cart, addItem, customer, setCustomer, orderId } = useCartStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [session, setSession] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [postCustomerAction, setPostCustomerAction] = useState(null);

  const handleOpenCustomerModal = (callback = null) => {
    if (callback && typeof callback === 'function') {
      setPostCustomerAction(() => callback);
    } else {
      setPostCustomerAction(null);
    }
    setIsCustomerModalOpen(true);
  };

  const handleCustomerSave = (cust) => {
    setCustomer(cust);
    if (postCustomerAction) {
      setTimeout(() => {
        postCustomerAction();
      }, 100);
      setPostCustomerAction(null);
    }
  };

  const formatErrorMessage = (err) => {
    if (!err) return "An unknown error occurred.";
    if (typeof err === "string") return err;
    if (typeof err.error === "string") return err.error;
    if (Array.isArray(err.error)) {
      return err.error.map(e => {
        const fieldName = e.path && e.path.length > 0 ? e.path[e.path.length - 1] : "";
        return `${fieldName ? fieldName + ": " : ""}${e.message}`;
      }).join("\n");
    }
    if (err.message) return err.message;
    return JSON.stringify(err);
  };

  useEffect(() => {
    const activeSession = localStorage.getItem('activeSession');
    if (!activeSession) {
      window.location.href = '/pos/session';
      return;
    }
    setSession(JSON.parse(activeSession));

    const tableData = localStorage.getItem('selectedTable');
    if (tableData) {
      setSelectedTable(JSON.parse(tableData));
    }

    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const json = await response.json();
        const productsList = json.data || json; // Handle both new { success, data } and old format
        setProducts(productsList);

        const uniqueCategories = [...new Set(productsList.map(p => p.category?.name).filter(Boolean))];
        setCategories(uniqueCategories.map((name, idx) => ({ id: idx, name })));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBorderColor = (categoryName) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('food')) return 'border-b-[#4A148C]';
    if (name.includes('beverage') || name.includes('coffee') || name.includes('drink')) return 'border-b-[#3E2723]';
    if (name.includes('dessert') || name.includes('cake') || name.includes('bakery')) return 'border-b-[#2E7D32]';
    return 'border-b-coffee-600';
  };

  const getCategoryColor = (categoryName) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('food')) return 'bg-purple-900';
    if (name.includes('beverage') || name.includes('coffee') || name.includes('drink')) return 'bg-coffee-800';
    if (name.includes('dessert') || name.includes('cake') || name.includes('pastry')) return 'bg-coffee-800';
    return 'bg-coffee-600';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    return matchesSearch && matchesCategory && p.isAvailable;
  });

  const getProductImageUrl = (product) => {
    if (product.imageUrl) return product.imageUrl;
    const query = encodeURIComponent(product?.name || "coffee");
    return `https://source.unsplash.com/collection/139386/800x600/?coffee,${query}`;
  };

  return (
    <div className="flex h-full gap-3 sm:gap-6 overflow-hidden">
      {/* Left Pane (Fixed header, scrollable cards) */}
      <div className="flex-1 flex flex-col gap-2 sm:gap-6 overflow-hidden">
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          onSave={handleCustomerSave}
          initialData={customer}
        />

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <CoffeeLoader size="xl" text="Loading Menu..." />
          </div>
        ) : (
          <>
            {/* Header — compact on mobile, full on desktop */}
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-xl px-3 py-2 sm:p-5 rounded-[16px] sm:rounded-[32px] shadow-[0_8px_30px_rgb(62,43,33,0.04)] border border-white shrink-0">
              <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0">
                <button
                  onClick={() => handleOpenCustomerModal()}
                  className="flex items-center gap-2 sm:gap-4 hover:bg-white px-2 sm:px-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-300 group shadow-sm border border-transparent hover:border-[#EBE4D5] hover:shadow-md min-w-0"
                >
                  <div className={`h-8 w-8 sm:h-12 sm:w-12 rounded-[10px] sm:rounded-[18px] flex items-center justify-center shrink-0 transition-colors ${customer ? 'bg-[#3E2B21] text-[#FDFCF7]' : 'bg-[#F3EDE5] text-[#8C8775] group-hover:bg-[#EBE4D5] group-hover:text-[#3E2B21]'}`}>
                    <User className="h-4 w-4 sm:h-6 sm:w-6" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="hidden sm:block text-[10px] text-[#8C8775] font-bold uppercase tracking-[0.15em] mb-0.5">Customer</p>
                    <p className={`text-xs sm:text-base font-black tracking-tight truncate ${customer ? 'text-[#3E2B21]' : 'text-[#8C8775]'}`}>
                      {customer ? customer.name : 'Select Customer'}
                    </p>
                  </div>
                </button>

                <div className="hidden md:block h-10 w-px bg-[#EBE4D5]"></div>

                <div className="hidden md:flex items-center gap-4 px-4">
                  <div className="h-12 w-12 bg-[#F3EDE5] rounded-[18px] flex items-center justify-center text-[#3E2B21]">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-[#8C8775] font-bold uppercase tracking-[0.15em] mb-0.5">Active Cart</p>
                    <p className="text-base font-black text-[#3E2B21]">{cart.length} items</p>
                  </div>
                </div>

                {orderId && (
                  <>
                    <div className="hidden sm:block h-10 w-px bg-[#EBE4D5]"></div>
                    <span className="hidden sm:flex px-4 py-2 rounded-full text-xs font-black bg-orange-50 text-[#3E2B21] uppercase tracking-[0.1em] border border-orange-100 items-center gap-2 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse"></span>
                      Editing Order
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                <button
                  onClick={() => window.location.href = '/pos/cart'}
                  className="hidden lg:flex px-8 py-3.5 bg-[#3E2B21] text-[#FDFCF7] rounded-[20px] font-black hover:bg-[#2C1810] transition-all shadow-[0_8px_20px_rgb(62,43,33,0.2)] hover:shadow-[0_12px_25px_rgb(62,43,33,0.3)] hover:-translate-y-0.5 items-center gap-2 text-sm"
                >
                  <ShoppingCart className="h-5 w-5" />
                  View Cart
                </button>
                <button
                  onClick={() => fetchProducts()}
                  className="h-8 w-8 sm:h-12 sm:w-12 flex items-center justify-center bg-white hover:bg-[#F3EDE5] rounded-[10px] sm:rounded-[20px] text-[#3E2B21] transition-all shadow-sm border border-[#EBE4D5]"
                >
                  <RefreshCw className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                </button>
                <button
                  onClick={() => setShowCloseSessionModal(true)}
                  className="h-8 sm:h-auto px-2.5 sm:px-6 py-1.5 sm:py-3.5 bg-red-50/50 text-red-600 rounded-[10px] sm:rounded-[20px] font-bold hover:bg-red-50 transition-colors flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm border border-red-100/50"
                >
                  <Power className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">End Shift</span>
                  <span className="sm:hidden">End</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-5 shrink-0">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-4 sm:left-5 top-1/2 transform -translate-y-1/2 text-[#8C8775] h-4 w-4 sm:h-5 sm:w-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 sm:pl-14 pr-4 sm:pr-5 py-2.5 sm:py-3.5 rounded-[12px] sm:rounded-[20px] border-2 border-white focus:border-[#3E2B21]/20 focus:outline-none transition-all bg-white shadow-[0_8px_30px_rgb(62,43,33,0.04)] font-semibold text-[#3E2B21] placeholder:text-[#8C8775]/60 text-sm sm:text-base"
                />
              </div>

              {/* Categories — horizontal scroll on mobile, wrap on desktop */}
              <div className="flex gap-2 sm:gap-3 pb-1 sm:pb-2 overflow-x-auto sm:flex-wrap scrollbar-none -mx-1 px-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3.5 sm:px-7 py-2 sm:py-3 rounded-[12px] sm:rounded-[20px] font-black text-[11px] sm:text-sm transition-all duration-300 shadow-sm whitespace-nowrap shrink-0 ${!selectedCategory ? 'bg-[#3E2B21] text-[#FDFCF7] shadow-[0_8px_20px_rgb(62,43,33,0.2)]' : 'bg-white text-[#8C8775] hover:bg-[#FDFCF7] border border-[#EBE4D5] hover:text-[#3E2B21]'
                    }`}
                >
                  All Menu
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.name)}
                    className={`px-3.5 sm:px-7 py-2 sm:py-3 rounded-[12px] sm:rounded-[20px] font-black text-[11px] sm:text-sm transition-all duration-300 shadow-sm whitespace-nowrap shrink-0 ${selectedCategory === category.name ? 'bg-[#3E2B21] text-[#FDFCF7] shadow-[0_8px_20px_rgb(62,43,33,0.2)]' : 'bg-white text-[#8C8775] hover:bg-[#FDFCF7] border border-[#EBE4D5] hover:text-[#3E2B21]'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Products Grid */}
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-[#3E2B21]/15 scrollbar-track-transparent pb-24 lg:pb-10">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-5 pb-6">
                {filteredProducts.map((product) => {
                  return (
                    <div
                      key={product.id}
                      className="group relative rounded-[20px] sm:rounded-[32px] bg-[#FDFCF7] border border-[#EBE4D5] shadow-[0_8px_30px_rgb(62,43,33,0.04)] hover:shadow-[0_20px_50px_rgb(62,43,33,0.12)] transition-all duration-500 overflow-hidden cursor-pointer flex flex-col justify-between transform hover:-translate-y-1"
                      onClick={() => addItem(product)}
                    >
                      {/* Image */}
                      <div className="relative h-28 sm:h-44 overflow-hidden bg-[#F3EDE5] rounded-t-[20px] sm:rounded-t-[32px]">
                        <img
                          src={getProductImageUrl(product)}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#3E2B21]/60 via-[#3E2B21]/20 to-transparent" />
                        
                        {/* Category Badge over image */}
                        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm">
                           <p className="text-[7px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[#3E2B21] font-bold">
                             {product.category?.name || "Menu"}
                           </p>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="relative p-3 sm:p-5 flex flex-col gap-1 sm:gap-2 flex-1 justify-between bg-gradient-to-b from-white to-[#FDFCF7]">
                        <div>
                          <h3 className="text-sm sm:text-lg font-black text-[#3E2B21] leading-snug line-clamp-1" title={product.name}>
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="hidden sm:block text-xs text-[#8C8775] line-clamp-2 mt-1 leading-relaxed">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-dashed border-[#EBE4D5]">
                          <div>
                            <p className="hidden sm:block text-[10px] uppercase tracking-wider text-[#8C8775] font-bold mb-0.5">Price</p>
                            <p className="text-base sm:text-xl font-black text-[#3E2B21]">
                              ₹{Number(product.price).toFixed(2)}
                            </p>
                          </div>
                          <button
                            className="h-9 w-9 sm:h-12 sm:w-12 bg-[#3E2B21] rounded-[12px] sm:rounded-[16px] flex items-center justify-center text-[#FDFCF7] shadow-[0_8px_20px_rgb(62,43,33,0.2)] group-hover:scale-105 group-hover:bg-[#2C1810] group-hover:rotate-3 transition-all duration-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              addItem(product);
                            }}
                          >
                            <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[2rem] border border-[#EBE4D5] shadow-sm">
                  <p className="text-lg font-bold text-[#3E2B21]">No products match search criteria.</p>
                  <p className="text-sm text-[#8C8775] mt-1">Try another keyword or category filter.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Cart Sidebar - Desktop only */}
      {!loading && (
        <CartSidebar onAddCustomer={handleOpenCustomerModal} />
      )}

      {/* Floating Cart Button - Mobile/Tablet only */}
      {!loading && cart.length > 0 && (
        <button
          onClick={() => window.location.href = '/pos/cart'}
          className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 bg-[#3E2B21] text-white rounded-full shadow-[0_8px_25px_rgba(62,43,33,0.35)] flex items-center justify-center hover:bg-[#2C1810] transition-all active:scale-95"
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
        </button>
      )}
      {showCloseSessionModal && session && (
        <CloseSessionModal
          session={session}
          onClose={() => setShowCloseSessionModal(false)}
          onConfirm={async (closingCash) => {
            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
              const token = localStorage.getItem('token');

              const response = await fetch(`${API_URL}/sessions/${session.id}/close`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ closingCash })
              });

              if (response.ok) {
                localStorage.removeItem('activeSession');
                localStorage.removeItem('selectedTable');
                window.location.href = '/pos/session';
              } else {
                const err = await response.json();
                showAlert(`Failed to close session: ${formatErrorMessage(err)}`, "Close Session", "error");
              }
            } catch (error) {
              console.error('Error closing session:', error);
              showAlert(`Failed to close session: ${formatErrorMessage(error)}`, "Close Session", "error");
            }
          }}
        />
      )}
    </div>
  );
}
