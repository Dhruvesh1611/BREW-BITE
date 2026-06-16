const statusClasses = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PREPARING: "bg-orange-50 text-orange-700 border border-orange-200",
  SENT: "bg-amber-50 text-amber-700 border border-amber-200",
  DRAFT: "bg-gray-50 text-gray-600 border border-gray-200",
  CANCELLED: "bg-red-50 text-red-600 border border-red-200",
};

export default function RecentOrders({ orders }) {
  return (
    <section className="rounded-[36px] bg-white/80 backdrop-blur-sm border border-white shadow-[0_35px_80px_rgba(62,43,33,0.08)] overflow-hidden">
      <div className="p-6 lg:p-8 border-b border-[#F0EBE1] flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#8C8775]/70">
            Recent Orders
          </p>
          <h3 className="text-2xl font-bold text-[#3E2B21]">Fresh off the bar</h3>
        </div>
        <button className="px-5 py-2 rounded-full bg-[#3E2B21] text-white text-sm font-semibold shadow-lg hover:-translate-y-0.5 transition-transform">
          View All Orders
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="text-xs uppercase tracking-[0.3em] text-[#8C8775]/60">
            <tr>
              {["Order", "Customer", "Table", "Status", "Amount"].map((head) => (
                <th key={head} className="px-6 py-4">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-[#3E2B21]/80">
            {orders && orders.length ? (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="group transition-all hover:bg-[#FDFCF7]/50"
                >
                  <td className="px-6 py-5 font-bold text-[#3E2B21]">
                    #{order.orderNumber?.slice(-5) || order.id.slice(0, 5)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-[#FDFCF7] flex items-center justify-center font-semibold text-[#3E2B21]">
                        {(order.customerName || order.user?.name || "G")[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-[#3E2B21]">
                          {order.customerName || order.user?.name || "Walk-in"}
                        </p>
                        <p className="text-xs text-[#8C8775]">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">{order.table?.name || "Takeaway"}</td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-4 py-1 rounded-full text-xs font-bold inline-flex items-center gap-2 ${statusClasses[order.status] ||
                        "bg-gray-50 text-gray-600 border border-gray-100"
                        }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 font-bold text-[#3E2B21]">
                    ₹{Number(order.totalAmount).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-16 text-center text-[#8C8775]/70"
                >
                  No recent orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
