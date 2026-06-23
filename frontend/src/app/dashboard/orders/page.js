"use client";

import { jsPDF } from "jspdf";
import emailjs from '@emailjs/browser';

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Filter,
  Calendar,
  X,
  Eye,
  Printer,
  Download,
  Coffee,
  Activity,
  CheckCircle2,
  DollarSign,
  ChevronDown,
  Clock,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Mail,
  Phone,
  MapPin,
  Hash,
  ShoppingBag,
  User,
} from "lucide-react";
import CoffeeLoader from "@/components/ui/CoffeeLoader";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [dateRange, setDateRange] = useState("today");
  const [exportData, setExportData] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    completedOrders: 0,
    periodRevenue: 0,
    SENT: 0,
    PREPARING: 0,
    COMPLETED: 0,
    PAID: 0,
    CANCELLED: 0,
    DRAFT: 0
  });

  const statusOptions = [
    "all",
    "SENT",
    "PREPARING",
    "COMPLETED",
    "PAID",
    "CANCELLED",
    "DRAFT",
  ];

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle clicking outside filter menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stats once on mount, or when status/search updates to keep metrics in sync
  const fetchStats = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/dashboard/stats?range=day`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalOrders: data.periodOrders || 0,
          pendingOrders: data.pendingOrders || 0,
          preparingOrders: data.preparingOrders || 0,
          completedOrders: data.completedOrders || 0,
          periodRevenue: data.periodRevenue || 0,
          SENT: data.pendingOrders || 0,
          PREPARING: data.preparingOrders || 0,
          COMPLETED: data.completedOrders || 0,
          PAID: data.completedOrders || 0,
          CANCELLED: 0, // Fallbacks as stats endpoints group paid/completed
          DRAFT: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchOrderStats = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(prev => ({
          ...prev,
          SENT: data.SENT || 0,
          PREPARING: data.PREPARING || 0,
          COMPLETED: data.COMPLETED || 0,
          PAID: data.PAID || 0,
          CANCELLED: data.CANCELLED || 0,
          DRAFT: data.DRAFT || 0,
          allTimeTotal: data.total || 0
        }));
      }
    } catch (error) {
      console.error('Failed to fetch order stats:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');

      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 20,
        status: statusFilter
      });

      if (dateRange !== 'all') {
        queryParams.append('range', dateRange);
      }

      if (sortBy !== 'recent') {
        queryParams.append('sort', sortBy);
      }

      if (debouncedSearchQuery) {
        queryParams.append('search', debouncedSearchQuery);
      }

      const response = await fetch(`${API_URL}/orders?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.pagination) {
          setOrders(result.data);
          setTotalPages(result.pagination.totalPages || 1);
          setTotalOrdersCount(result.pagination.total || 0);
        } else {
          setOrders(result);
          setTotalPages(1);
          setTotalOrdersCount(result.length || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchOrderStats();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter, debouncedSearchQuery, dateRange, sortBy]);

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleExportClick = async () => {
    setExporting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';
      const token = localStorage.getItem('token');
      
      const queryParams = new URLSearchParams({
        limit: 10000,
        status: statusFilter
      });
      if (debouncedSearchQuery) {
        queryParams.append('search', debouncedSearchQuery);
      }

      const response = await fetch(`${API_URL}/orders?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error("Failed to fetch orders for export");
      const result = await response.json();
      const data = result.data || result;

      if (!data.length) {
        alert("No orders to export!");
        return;
      }

      setExportData(data);
      setShowExportModal(true);
    } catch (error) {
      console.error('Export fetch failed:', error);
      alert('Failed to fetch orders for export');
    } finally {
      setExporting(false);
    }
  };

  const confirmExport = () => {
    if (!exportData) return;

    // Generate CSV
    const headers = ['Order Number', 'Date', 'Type', 'Table', 'Customer', 'Status', 'Payment', 'Total', 'Items'];
    const csvRows = [headers.join(',')];

    exportData.forEach(order => {
      const row = [
        order.orderNumber,
        new Date(order.createdAt).toLocaleString(),
        order.type,
        order.table?.name || '-',
        order.customerName || 'Walk-in',
        order.status,
        order.paymentStatus,
        Number(order.totalAmount).toFixed(2),
        order.items?.map(i => `${i.quantity}x ${i.productName}`).join('; ') || ''
      ];
      // Escape quotes and commas
      csvRows.push(row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportModal(false);
    setExportData(null);
  };

  const getStatusConfig = (status) => {
    const configs = {
      DRAFT: {
        bg: "bg-[#F5EFE6]",
        text: "text-[#8C7B6B]",
        border: "border-[#E8DFD3]",
        dot: "bg-[#8C7B6B]",
        label: "Draft",
      },
      SENT: {
        bg: "bg-[#E8F4FD]",
        text: "text-[#1E6FA0]",
        border: "border-[#B8DCF0]",
        dot: "bg-[#1E6FA0]",
        label: "Sent",
      },
      PREPARING: {
        bg: "bg-[#FFF4E5]",
        text: "text-[#B8700A]",
        border: "border-[#FFE0A3]",
        dot: "bg-[#E68A00]",
        label: "Preparing",
      },
      COMPLETED: {
        bg: "bg-[#E8F5E9]",
        text: "text-[#2E7D32]",
        border: "border-[#A5D6A7]",
        dot: "bg-[#2E7D32]",
        label: "Completed",
      },
      PAID: {
        bg: "bg-[#E0F2F1]",
        text: "text-[#00695C]",
        border: "border-[#80CBC4]",
        dot: "bg-[#00695C]",
        label: "Paid",
      },
      CANCELLED: {
        bg: "bg-[#FFEBEE]",
        text: "text-[#C62828]",
        border: "border-[#EF9A9A]",
        dot: "bg-[#C62828]",
        label: "Cancelled",
      },
    };
    return configs[status] || {
      bg: "bg-gray-50",
      text: "text-gray-600",
      border: "border-gray-200",
      dot: "bg-gray-400",
      label: status,
    };
  };

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }),
    []
  );

  const formatCurrency = (value = 0) => currencyFormatter.format(value || 0);

  const serviceDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    []
  );

  const statusSummary = useMemo(() => {
    return {
      total: stats.allTimeTotal || 0,
      SENT: stats.SENT,
      PREPARING: stats.PREPARING,
      COMPLETED: stats.COMPLETED,
      PAID: stats.PAID,
      CANCELLED: stats.CANCELLED,
      DRAFT: stats.DRAFT,
      revenue: stats.periodRevenue
    };
  }, [stats]);

  const progressOrders = stats.pendingOrders + stats.preparingOrders;
  const completedOrders = stats.completedOrders;

  const quickStats = [
    {
      id: "total",
      label: "Total Orders",
      value: stats.totalOrders || 0,
      hint: "All orders today",
      icon: Coffee,
      iconBg: "bg-[#F3EDE5]",
      iconColor: "text-[#6B4423]",
    },
    {
      id: "progress",
      label: "In Progress",
      value: progressOrders,
      hint: `${statusSummary.PREPARING || 0} preparing · ${statusSummary.SENT || 0} sent`,
      icon: Activity,
      iconBg: "bg-[#FFF4E5]",
      iconColor: "text-[#E68A00]",
    },
    {
      id: "completed",
      label: "Completed",
      value: completedOrders,
      hint: `${statusSummary.COMPLETED || 0} served · ${statusSummary.PAID || 0} paid`,
      icon: CheckCircle2,
      iconBg: "bg-[#E8F5E9]",
      iconColor: "text-[#2E7D32]",
    },
    {
      id: "revenue",
      label: "Revenue Today",
      value: formatCurrency(stats.periodRevenue),
      hint: "Gross sales generated today",
      icon: DollarSign,
      iconBg: "bg-[#FFF8E1]",
      iconColor: "text-[#F9A825]",
    },
  ];


  // Order Details Modal
  const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const generateReceipt = () => {
      try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        let yPos = 20;

        // Header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("BREW & BITE", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Order Receipt: ${order.orderNumber}`, pageWidth / 2, yPos, { align: "center" });
        yPos += 10;
        doc.text("------------------------------------------------", pageWidth / 2, yPos, { align: "center" });
        yPos += 10;

        // Info
        doc.setFontSize(10);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`, 20, yPos);
        yPos += 6;
        if (order.table) {
          doc.text(`Table: ${order.table.name}`, 20, yPos);
          yPos += 6;
        }
        if (order.customerName) {
          doc.text(`Customer: ${order.customerName}`, 20, yPos);
          yPos += 6;
        }
        yPos += 4;

        // Items
        doc.setFont("helvetica", "bold");
        doc.text("Item", 20, yPos);
        doc.text("Qty", 140, yPos, { align: "right" });
        doc.text("Price", 180, yPos, { align: "right" });
        yPos += 6;
        doc.setFont("helvetica", "normal");

        let subtotal = 0;
        order.items?.forEach(item => {
          const itemTotal = Number(item.price) * item.quantity;
          subtotal += itemTotal;

          // Handle long product names
          const splitTitle = doc.splitTextToSize(item.productName, 110);
          doc.text(splitTitle, 20, yPos);
          doc.text(String(item.quantity), 140, yPos, { align: "right" });
          doc.text(`₹${itemTotal.toFixed(2)}`, 180, yPos, { align: "right" });

          yPos += (6 * splitTitle.length);
        });

        yPos += 4;
        doc.text("------------------------------------------------", pageWidth / 2, yPos, { align: "center" });
        yPos += 8;

        // Totals
        const tax = subtotal * 0.09;
        const total = Number(order.totalAmount);

        doc.text(`Subtotal:`, 120, yPos);
        doc.text(`₹${subtotal.toFixed(2)}`, 180, yPos, { align: "right" });
        yPos += 6;
        doc.text(`Tax (9%):`, 120, yPos);
        doc.text(`₹${tax.toFixed(2)}`, 180, yPos, { align: "right" });
        yPos += 8;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(`Total:`, 120, yPos);
        doc.text(`₹${total.toFixed(2)}`, 180, yPos, { align: "right" });

        // Save
        doc.save(`Receipt-${order.orderNumber}.pdf`);
      } catch (err) {
        console.error("PDF Generation Error", err);
        alert("Failed to generate PDF");
      }
    };

    const handleEmailReceipt = async () => {
      let recipient = order.customerEmail;

      if (!recipient) {
        recipient = prompt("No email on file. Please enter customer email:");
        if (!recipient) return;
      }

      // EmailJS Configuration
      const SERVICE_ID = "service_gb48lwj";
      const PUBLIC_KEY = "W0595iJ-qNi2bVbxR";
      const TEMPLATE_ID = "template_u4syz79";

      const templateParams = {
        email: recipient,
        order_id: order.orderNumber,
        orders: order.items.map(item => ({
          name: item.productName,
          price: Number(item.price).toFixed(2),
          price_formatted: `₹${Number(item.price).toFixed(2)}`,
          units: item.quantity
        })),
        cost: {
          shipping: "0.00",
          tax: (Number(order.totalAmount) - order.items.reduce((s, i) => s + (Number(i.price) * i.quantity), 0)).toFixed(2),
          total: Number(order.totalAmount).toFixed(2)
        },
        message: `Receipt for Order ${order.orderNumber}. Total: ₹${Number(order.totalAmount).toFixed(2)}`
      };

      try {
        console.log("Sending via EmailJS...", templateParams);
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('SUCCESS!', response.status, response.text);
        alert(`Receipt sent successfully to ${recipient}!`);
      } catch (error) {
        console.error('FAILED...', error);
        alert(`Failed to send email: ${error.text || 'Unknown Error'}`);
      }
    };

    const statusConfig = getStatusConfig(order.status);
    const subtotal = order.items?.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0) || 0;
    const tax = subtotal * 0.09;

    return (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-[32px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_25px_80px_rgba(62,43,33,0.18)]"
          onClick={(e) => e.stopPropagation()}
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Header */}
          <div className="p-8 pb-6 border-b border-[#EBE4D5]/60 sticky top-0 bg-white rounded-t-[32px] z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#F3EDE5] flex items-center justify-center">
                    <Package className="h-5 w-5 text-[#6B4423]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#3E2B21]">Order Details</h2>
                    <p className="text-sm text-[#3E2B21]/50 font-medium">#{order.orderNumber}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-[#F5EFE6] hover:bg-[#EBE4D5] flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-[#6B4423]" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-8 space-y-8">
            {/* Meta Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[20px] bg-[#FDFCF7] border border-[#EBE4D5]/60 p-4">
                <p className="text-[11px] font-bold text-[#3E2B21]/40 tracking-wider uppercase mb-2">Status</p>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              {order.table && (
                <div className="rounded-[20px] bg-[#FDFCF7] border border-[#EBE4D5]/60 p-4">
                  <p className="text-[11px] font-bold text-[#3E2B21]/40 tracking-wider uppercase mb-2">Table</p>
                  <p className="text-lg font-black text-[#3E2B21]">{order.table.name}</p>
                </div>
              )}
              {order.customerName && (
                <div className="rounded-[20px] bg-[#FDFCF7] border border-[#EBE4D5]/60 p-4 col-span-2">
                  <p className="text-[11px] font-bold text-[#3E2B21]/40 tracking-wider uppercase mb-2">Customer</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#3E2B21] flex items-center justify-center text-white text-sm font-bold">
                      {order.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#3E2B21]">{order.customerName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {order.customerEmail && (
                          <span className="flex items-center gap-1 text-xs text-[#3E2B21]/50">
                            <Mail className="h-3 w-3" /> {order.customerEmail}
                          </span>
                        )}
                        {order.customerMobile && (
                          <span className="flex items-center gap-1 text-xs text-[#3E2B21]/50">
                            <Phone className="h-3 w-3" /> {order.customerMobile}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-[13px] font-bold text-[#3E2B21]/50 tracking-wider uppercase mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-[20px] bg-[#FDFCF7] border border-[#EBE4D5]/60 hover:border-[#EBE4D5] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 bg-[#F3EDE5] rounded-[14px] flex items-center justify-center">
                        <span className="text-sm font-black text-[#6B4423]">{item.quantity}×</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#3E2B21] text-[15px]">{item.productName}</p>
                        {item.variantName && (
                          <p className="text-xs text-[#3E2B21]/40 font-medium mt-0.5">{item.variantName}</p>
                        )}
                      </div>
                    </div>
                    <p className="font-black text-[#3E2B21] text-[15px]">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-[24px] bg-[#FDFCF7] border border-[#EBE4D5]/60 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3E2B21]/50 font-medium">Subtotal</span>
                <span className="font-bold text-[#3E2B21]">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#3E2B21]/50 font-medium">Tax (9%)</span>
                <span className="font-bold text-[#3E2B21]">₹{tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-[#EBE4D5]/60 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-[#3E2B21]">Total</span>
                  <span className="text-xl font-black text-[#3E2B21]">
                    {formatCurrency(Number(order.totalAmount))}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={generateReceipt}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[18px] bg-[#3E2B21] text-white font-bold text-sm hover:bg-[#2C1810] transition-colors shadow-[0_4px_12px_rgba(62,43,33,0.2)]"
              >
                <Printer className="h-4.5 w-4.5" />
                Print Receipt
              </button>
              <button
                onClick={handleEmailReceipt}
                className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[18px] border-2 border-[#3E2B21] text-[#3E2B21] font-bold text-sm hover:bg-[#3E2B21]/5 transition-colors"
              >
                <Mail className="h-4.5 w-4.5" />
                Email Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <CoffeeLoader size="lg" text="Loading Orders..." />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  HERO SECTION — warm cream with coffee illustration   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="flex flex-col xl:flex-row gap-6">
        {/* Left — Hero Text */}
        <div className="relative flex-1 bg-[#FDFCF7] rounded-[24px] sm:rounded-[40px] p-6 sm:p-8 lg:p-12 shadow-[0_4px_20px_rgba(62,43,33,0.02)] border border-[#EBE4D5]/60 overflow-hidden flex flex-col justify-center min-h-[180px] sm:min-h-[220px]">
          <div className="relative z-10 max-w-lg space-y-5">
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#FCF8F2] text-[#3E2B21] text-sm font-semibold border border-[#EBE4D5]">
              <ShoppingBag className="h-4 w-4" /> Orders Management
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[44px] font-black leading-[1.15] text-[#3E2B21] font-serif tracking-tight">
                Keep every order flowing smoothly.
              </h1>
              <p className="text-[#3E2B21]/60 text-base mt-3 font-medium leading-relaxed max-w-md">
                Monitor dine-in, takeaway, and online orders in real time. Every table, every ticket.
              </p>
            </div>
          </div>

          {/* Decorative coffee image */}
          <img
            src="/orders_hero_1781584318907.png"
            alt="Coffee"
            className="absolute -right-16 -bottom-10 h-[130%] object-contain opacity-30 pointer-events-none hidden md:block"
          />
        </div>

        {/* Right — Date + Quick Actions */}
        <div className="w-full xl:w-[380px] flex flex-col gap-4 sm:gap-5">
          <div className="bg-[#FDFCF7] rounded-[32px] p-6 shadow-[0_4px_20px_rgba(62,43,33,0.02)] border border-[#EBE4D5]/60 flex items-center justify-between text-sm text-[#3E2B21] font-semibold">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#3E2B21]/70" />
              <span>{serviceDate}</span>
            </div>
            <button 
              onClick={handleExportClick}
              disabled={exporting}
              className="px-4 py-2 rounded-full bg-[#3E2B21] text-white text-xs font-bold shadow-md flex items-center gap-2 hover:bg-[#2C1810] transition-colors disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> {exporting ? 'Loading...' : 'Export'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="rounded-[28px] bg-white border border-[#EBE4D5] p-5 shadow-[0_4px_20px_rgba(62,43,33,0.02)] flex flex-col justify-center">
              <p className="text-[#3E2B21]/50 text-[12px] font-bold tracking-wide">Live Orders</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-[28px] font-black text-[#3E2B21] leading-none">{progressOrders}</p>
                <div className="h-9 w-9 rounded-full bg-[#FFF4E5] flex items-center justify-center text-[#E68A00]">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[10px] text-[#3E2B21]/40 font-medium mt-2">Brewing & on the way</p>
            </div>
            <div className="rounded-[28px] bg-white border border-[#EBE4D5] p-5 shadow-[0_4px_20px_rgba(62,43,33,0.02)] flex flex-col justify-center">
              <p className="text-[#3E2B21]/50 text-[12px] font-bold tracking-wide">Completed</p>
              <div className="flex items-end justify-between mt-2">
                <p className="text-[28px] font-black text-[#3E2B21] leading-none">{completedOrders}</p>
                <div className="h-9 w-9 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <p className="text-[10px] text-[#3E2B21]/40 font-medium mt-2">Served with a smile</p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white border border-[#EBE4D5] p-5 shadow-[0_4px_20px_rgba(62,43,33,0.02)]">
            <p className="text-[#3E2B21]/50 text-[12px] font-bold tracking-wide">Revenue Today</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-[28px] font-black text-[#3E2B21] leading-none">{formatCurrency(statusSummary.revenue)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  EXPORT PREVIEW MODAL                                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showExportModal && exportData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_25px_80px_rgba(62,43,33,0.18)] flex flex-col">
            <div className="p-8 pb-6 border-b border-[#EBE4D5]/60 bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-[#3E2B21]">Export Preview</h2>
                <p className="text-sm text-[#3E2B21]/50 font-medium">You are about to export {exportData.length} records</p>
              </div>
              <button
                onClick={() => { setShowExportModal(false); setExportData(null); }}
                className="h-10 w-10 rounded-full bg-[#F5EFE6] hover:bg-[#EBE4D5] flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-[#6B4423]" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto bg-[#FDFCF7]">
              <div className="border border-[#EBE4D5]/60 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-sm text-left text-[#3E2B21]">
                  <thead className="bg-[#F5EFE6] text-[#6B4423] font-bold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 border-b border-[#EBE4D5]/60">Order No</th>
                      <th className="px-4 py-3 border-b border-[#EBE4D5]/60">Customer</th>
                      <th className="px-4 py-3 border-b border-[#EBE4D5]/60">Table</th>
                      <th className="px-4 py-3 border-b border-[#EBE4D5]/60">Status</th>
                      <th className="px-4 py-3 border-b border-[#EBE4D5]/60">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBE4D5]/60">
                    {exportData.slice(0, 100).map((row, i) => (
                      <tr key={row.id || i} className="hover:bg-[#FDFCF7] transition-colors">
                        <td className="px-4 py-3 font-semibold">{row.orderNumber}</td>
                        <td className="px-4 py-3">{row.customerName || 'Walk-in'}</td>
                        <td className="px-4 py-3">{row.table?.name || '-'}</td>
                        <td className="px-4 py-3">{row.status}</td>
                        <td className="px-4 py-3 font-bold">₹{Number(row.totalAmount).toFixed(2)}</td>
                      </tr>
                    ))}
                    {exportData.length > 100 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-center text-[#8C8775] font-medium italic">
                          ... and {exportData.length - 100} more rows not shown in preview
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-[#EBE4D5]/60 bg-white flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setShowExportModal(false); setExportData(null); }}
                className="px-6 py-3 rounded-full text-[#3E2B21] font-bold hover:bg-[#F5EFE6] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmExport}
                className="px-6 py-3 rounded-full bg-[#3E2B21] text-white font-bold flex items-center gap-2 hover:bg-[#2C1810] transition-colors shadow-lg"
              >
                <Download className="h-4 w-4" />
                Confirm & Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  QUICK STATS — horizontal cards                       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          const displayValue =
            typeof stat.value === "number"
              ? stat.value.toLocaleString()
              : stat.value;

          return (
            <div
              key={stat.id}
              className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(62,43,33,0.02)] border border-[#EBE4D5]/60 hover:shadow-[0_8px_30px_rgba(62,43,33,0.06)] transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-[#3E2B21]/50 tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-black text-[#3E2B21] mt-1">{displayValue}</p>
                  <p className="text-[11px] text-[#3E2B21]/40 font-medium mt-1.5">{stat.hint}</p>
                </div>
                <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              {stat.trend && (
                <div className="flex items-center gap-1.5 mt-3">
                  {stat.trendUp ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={`text-[11px] font-bold ${stat.trendUp ? "text-green-600" : "text-red-500"}`}>
                    {stat.trend}
                  </span>
                  <span className="text-[11px] text-[#3E2B21]/40 font-medium">vs yesterday</span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  FILTERS & SEARCH                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-[#EBE4D5]/60 shadow-[0_4px_20px_rgba(62,43,33,0.02)] p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative shrink-0" ref={filterMenuRef}>
            <button 
              onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-[18px] border text-sm font-bold transition-all outline-none ${
                isFilterMenuOpen || (sortBy !== 'recent' || dateRange !== 'today')
                  ? 'bg-[#3E2B21] text-white border-[#3E2B21] shadow-md'
                  : 'bg-[#FDFCF7] text-[#3E2B21]/60 border-[#EBE4D5] hover:border-[#3E2B21]/30 hover:text-[#3E2B21]'
              }`}
            >
              <Filter className="h-4 w-4" /> 
              Filters
              {(sortBy !== 'recent' || dateRange !== 'today' || statusFilter !== 'all') && (
                <span className="flex h-2 w-2 rounded-full bg-orange-400"></span>
              )}
            </button>

            {isFilterMenuOpen && (
              <div className="absolute top-full left-0 mt-3 w-72 bg-white rounded-[24px] shadow-[0_20px_60px_rgba(62,43,33,0.15)] border border-[#EBE4D5]/60 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-5 border-b border-[#EBE4D5]/60 bg-[#FDFCF7]">
                  <h3 className="font-bold text-[#3E2B21] flex items-center justify-between">
                    Advanced Filters
                    <button onClick={() => setIsFilterMenuOpen(false)} className="text-[#3E2B21]/40 hover:text-[#3E2B21] outline-none">
                      <X className="h-4 w-4" />
                    </button>
                  </h3>
                </div>

                <div className="p-5 space-y-6">
                  {/* Date Range Option */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#3E2B21]/40">Date Range</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setDateRange('today'); setCurrentPage(1); }}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors outline-none ${dateRange === 'today' ? 'bg-[#3E2B21] text-white border-[#3E2B21]' : 'bg-white text-[#3E2B21]/60 border-[#EBE4D5] hover:border-[#3E2B21]/30'}`}
                      >
                        Today
                      </button>
                      <button 
                        onClick={() => { setDateRange('all'); setCurrentPage(1); }}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors outline-none ${dateRange === 'all' ? 'bg-[#3E2B21] text-white border-[#3E2B21]' : 'bg-white text-[#3E2B21]/60 border-[#EBE4D5] hover:border-[#3E2B21]/30'}`}
                      >
                        All-Time
                      </button>
                    </div>
                  </div>

                  {/* Sort By Option */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#3E2B21]/40">Sort Order</p>
                    <div className="space-y-2">
                      {[
                        { id: 'recent', label: 'Recent First' },
                        { id: 'oldest', label: 'Oldest First' },
                        { id: 'highest', label: 'Highest Total' },
                        { id: 'lowest', label: 'Lowest Total' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => { setSortBy(opt.id); setCurrentPage(1); }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors outline-none ${
                            sortBy === opt.id 
                              ? 'bg-[#F5EFE6] text-[#3E2B21]' 
                              : 'text-[#3E2B21]/60 hover:bg-[#FDFCF7] hover:text-[#3E2B21]'
                          }`}
                        >
                          {opt.label}
                          {sortBy === opt.id && <CheckCircle2 className="h-4 w-4 text-[#6B4423]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-[#EBE4D5]/60 bg-white">
                  <button 
                    onClick={() => {
                      setSearchQuery("");
                      setDebouncedSearchQuery("");
                      setStatusFilter("all");
                      setDateRange("today");
                      setSortBy("recent");
                      setCurrentPage(1);
                      setIsFilterMenuOpen(false);
                    }}
                    className="w-full py-3 rounded-[14px] bg-[#FDFCF7] border border-[#EBE4D5] text-[#3E2B21] text-sm font-bold hover:bg-[#F5EFE6] transition-colors outline-none"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#3E2B21]/30 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number, table, or customer..."
              className="w-full pl-12 pr-4 py-3.5 rounded-[20px] border border-[#EBE4D5] focus:border-[#3E2B21]/30 focus:outline-none focus:ring-2 focus:ring-[#3E2B21]/10 transition-all bg-[#FDFCF7] text-sm font-medium text-[#3E2B21] placeholder:text-[#3E2B21]/30"
            />
          </div>
          <button
            onClick={() => {
              setDateRange(prev => prev === 'today' ? 'all' : 'today');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-[18px] border px-5 py-3.5 text-sm font-bold transition-all ${
              dateRange === 'today'
                ? 'bg-[#3E2B21] text-white border-[#3E2B21] shadow-md'
                : 'bg-[#FDFCF7] text-[#3E2B21]/60 border-[#EBE4D5] hover:border-[#3E2B21]/30 hover:text-[#3E2B21]'
            }`}
          >
            <Calendar className="h-4 w-4" /> {dateRange === 'today' ? 'Today' : 'All-Time'}
          </button>
        </div>

        {/* Status Pill Filters */}
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => {
            const isActive = statusFilter === status;
            const label = status === "all" ? "All" : getStatusConfig(status).label;
            const count = status === "all" ? statusSummary.total : statusSummary[status] || 0;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-[13px] font-bold flex items-center gap-2 transition-all duration-200 ${isActive
                  ? "bg-[#3E2B21] text-white shadow-[0_4px_12px_rgba(62,43,33,0.2)]"
                  : "bg-[#FDFCF7] text-[#3E2B21]/70 border border-[#EBE4D5] hover:border-[#3E2B21]/20 hover:text-[#3E2B21]"
                  }`}
              >
                {label}
                <span
                  className={`h-5 min-w-5 rounded-full text-[10px] flex items-center justify-center px-1.5 font-bold ${isActive ? "bg-white/20 text-white" : "bg-[#F3EDE5] text-[#3E2B21]/50"
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EBE4D5]/60 pt-4 text-sm text-[#3E2B21]/50 font-medium">
          <p>
            Showing <span className="font-bold text-[#3E2B21]">{orders.length}</span> of
            <span className="font-bold text-[#3E2B21]"> {totalOrdersCount}</span> orders
          </p>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5EFE6] text-[#3E2B21] text-xs font-bold">
            {statusFilter === "all" ? "All orders" : `${getStatusConfig(statusFilter).label} queue`}
          </span>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  ORDERS TABLE                                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <section className="rounded-[24px] sm:rounded-[32px] bg-white border border-[#EBE4D5]/60 shadow-[0_4px_20px_rgba(62,43,33,0.02)] overflow-hidden relative min-h-[300px]">
        {loading && !isInitialLoad && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <CoffeeLoader size="md" text="Updating..." />
          </div>
        )}
        
        {orders.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="h-16 w-16 rounded-full bg-[#F5EFE6] flex items-center justify-center mx-auto">
              <Coffee className="h-8 w-8 text-[#3E2B21]/30" />
            </div>
            <p className="text-[#3E2B21]/60 text-lg font-bold">No orders match this view</p>
            <p className="text-sm text-[#3E2B21]/40 font-medium">Try changing the filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FDFCF7] border-b border-[#EBE4D5]/60">
                  {[
                    "Order",
                    "Customer",
                    "Table",
                    "Status",
                    "Items",
                    "Total",
                    "Time",
                    "",
                  ].map((head) => (
                    <th key={head} className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-[#3E2B21]/40">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const statusConfig = getStatusConfig(order.status);
                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors duration-200 hover:bg-[#FDFCF7] ${idx !== orders.length - 1 ? "border-b border-[#EBE4D5]/40" : ""
                        }`}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-[#F3EDE5] flex items-center justify-center">
                            <Hash className="h-3.5 w-3.5 text-[#6B4423]" />
                          </div>
                          <span className="font-bold text-[#3E2B21] text-sm">
                            {order.orderNumber?.slice(-6) || order.id.slice(0, 6)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#F5EFE6] flex items-center justify-center text-[11px] font-bold text-[#6B4423]">
                            {(order.customerName || "W")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#3E2B21]/80">
                            {order.customerName || "Walk-in"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-[#3E2B21]/60">
                        {order.table?.name || "—"}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-[#3E2B21]/60">
                          {order.items?.length || 0} items
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-bold text-[#3E2B21] text-sm">
                          {formatCurrency(Number(order.totalAmount))}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[12px] text-[#3E2B21]/40 font-medium">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="h-9 w-9 rounded-full border border-[#EBE4D5] hover:border-[#3E2B21]/20 hover:bg-[#F5EFE6] flex items-center justify-center transition-all"
                        >
                          <Eye className="h-4 w-4 text-[#6B4423]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}

