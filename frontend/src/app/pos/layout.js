import POSSidebar from "@/components/pos/POSSidebar";

export default function POSLayout({ children }) {
  return (
    <div className="flex h-screen bg-beige-100 overflow-hidden">
      <POSSidebar />
      <main className="flex-1 h-screen overflow-auto bg-beige-100 px-2.5 pt-2 sm:p-6 flex flex-col pb-16 lg:pb-6">
        <div className="w-full flex-1 min-h-0 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
