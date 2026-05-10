import { createFileRoute } from "@tanstack/react-router"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Loader2,
  Lock,
  MapPin,
  Package,
  PackageOpen,
  ShoppingBag,
  ShoppingCart,
  Store,
  X,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  InventoryAPI,
  type LockResponseItem,
  type ProductResponse,
} from "@/client/aegis-api"

export const Route = createFileRoute("/_layout/inventory")({
  component: Inventory,
})

const CATEGORIES = ["All", "Apparel", "Souvenirs", "Tất cả", "Đặc sản", "Mỹ nghệ"]

const STORE_IMAGES = [
  "https://images.unsplash.com/photo-1550650222-6b94dbba2211?q=80&w=800",
  "https://images.unsplash.com/photo-1559592413-7ceecea18501?q=80&w=800",
  "https://images.unsplash.com/photo-1555921015-5532091f6026?q=80&w=800",
]

const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=600",
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=600",
  "https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=600",
  "https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=600",
]

interface StoreType {
  id: number
  name: string
  address: string
  image: string
  status: string
  isOpen: boolean
}

function CountdownTimer({ expiresAt, ttlSeconds }: { expiresAt: string; ttlSeconds: number }) {
  const [remaining, setRemaining] = useState(ttlSeconds)
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const exp = new Date(expiresAt).getTime()
      const diff = Math.max(0, Math.floor((exp - now) / 1000))
      setRemaining(diff)
      if (diff <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])
  
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const percentage = ttlSeconds > 0 ? (remaining / ttlSeconds) * 100 : 0
  const isUrgent = remaining < 120
  
  const colorClass = isUrgent ? "text-red-400" : "text-emerald-400"
  const strokeColor = isUrgent ? "#ef4444" : "#10b981"

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 0.94} 100`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Clock className={`w-3.5 h-3.5 ${colorClass}`} />
        </div>
      </div>
      <div>
        <span className={`text-sm font-mono font-bold ${colorClass}`}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">còn lại</p>
      </div>
    </div>
  )
}

function ProductCard({
  product,
  imageUrl,
  onLock,
  isLocking,
  onClick,
}: {
  product: ProductResponse & { stock?: number; category?: string }
  imageUrl: string
  onLock: (pid: number) => void
  isLocking: boolean
  onClick?: () => void
}) {
  const stock = product.stock ?? 0
  const stockLevel = stock === 0 ? "out" : stock <= 5 ? "low" : stock <= 15 ? "medium" : "high"
  const stockColor = stockLevel === "out" ? "bg-zinc-600" : stockLevel === "low" ? "bg-red-500" : stockLevel === "medium" ? "bg-yellow-400" : "bg-emerald-400"
  const stockPercent = Math.min((stock / 50) * 100, 100)

  return (
    <div onClick={onClick} className={`cursor-pointer group relative bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 flex flex-col h-[400px] ${stockLevel === "out" ? "opacity-60 grayscale-[50%]" : "hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:border-emerald-500/50"}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* Product Image (60% height) */}
      <div className="h-[60%] w-full overflow-hidden relative bg-zinc-800">
        <img src={product.image_url || imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />
        {product.category && (
          <div className="absolute top-3 left-3 bg-zinc-950/60 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-white uppercase tracking-widest border border-white/10">
            {product.category}
          </div>
        )}
      </div>

      <div className="relative p-4 flex flex-col h-[40%] justify-between">
        {/* Title & Price */}
        <div>
          <h3 className="font-bold text-white text-base leading-tight mb-1 line-clamp-1">{product.name}</h3>
          <div className="flex items-center gap-1 text-emerald-400">
            <DollarSign className="w-4 h-4" />
            <span className="text-lg font-bold font-mono tracking-tight">{product.price.toLocaleString()}</span>
          </div>
        </div>

        {/* Real-time Stock Bar */}
        <div className="mt-2 mb-3">
           <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Real-time Stock</span>
              <span className="text-xs font-mono text-zinc-300">{stock} left</span>
           </div>
           <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${stockColor}`} style={{ width: `${stockPercent}%` }} />
           </div>
        </div>

        {/* Reserve Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onLock(product.product_id); }}
          disabled={isLocking || stock === 0}
          className="w-full py-2.5 rounded-lg bg-white hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors duration-300 disabled:opacity-100 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {isLocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {isLocking ? "Reserving..." : stock === 0 ? "Out of Stock" : "Reserve"}
        </button>
      </div>
    </div>
  )
}

function Inventory() {
  const [stores, setStores] = useState<StoreType[]>([])
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null)
  const [products, setProducts] = useState<(ProductResponse & { stock?: number; category?: string; imageIndex?: number })[]>([])
  const [filteredProducts, setFilteredProducts] = useState<(ProductResponse & { stock?: number; category?: string; imageIndex?: number })[]>([])
  const [activeCategory, setActiveCategory] = useState("All")
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [locks, setLocks] = useState<LockResponseItem[]>([])
  const [isLoadingLocks, setIsLoadingLocks] = useState(false)
  const [lockingId, setLockingId] = useState<number | null>(null)
  const [selectedProductDetail, setSelectedProductDetail] = useState<(ProductResponse & { stock?: number; category?: string; imageIndex?: number }) | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [notification, setNotification] = useState("")
  const carouselRef = useRef<HTMLDivElement>(null)

  const earliestLock = locks.length > 0 ? locks.reduce((prev, curr) => {
     return (new Date(prev.expires_at) < new Date(curr.expires_at)) ? prev : curr;
  }) : null;

  const [headerTimer, setHeaderTimer] = useState<string | null>(null)
  
  useEffect(() => {
     if (!earliestLock) {
         setHeaderTimer(null);
         return;
     }
     const interval = setInterval(() => {
        const now = Date.now()
        const exp = new Date(earliestLock.expires_at).getTime()
        const diff = Math.max(0, Math.floor((exp - now) / 1000))
        if (diff <= 0) {
            setHeaderTimer("00:00");
            clearInterval(interval);
        } else {
            const m = Math.floor(diff / 60)
            const s = diff % 60
            setHeaderTimer(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        }
     }, 1000)
     return () => clearInterval(interval)
  }, [earliestLock])

  const loadProducts = useCallback(async (storeId: number) => {
    setIsLoadingProducts(true)
    try {
      const res = await InventoryAPI.getStoreProducts(storeId)
      const enhanced = res.data.map((p, idx) => ({
        ...p,
        category: p.category || CATEGORIES[(idx % 2) + 1], // Fallback if no category
        stock: p.stock ?? 0, // REAL stock from backend!
        imageIndex: idx
      }))
      setProducts(enhanced)
      setFilteredProducts(enhanced)
      setActiveCategory("All")
    } catch {
      setProducts([])
      setFilteredProducts([])
    } finally {
      setIsLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    if (activeCategory === "All" || activeCategory === "Tất cả") {
      setFilteredProducts(products)
    } else {
      setFilteredProducts(products.filter(p => p.category === activeCategory))
    }
  }, [activeCategory, products])

  const loadLocks = useCallback(async () => {
    setIsLoadingLocks(true)
    try {
      const res = await InventoryAPI.getMyLocks()
      setLocks(res.data)
    } catch {
      setLocks([])
    } finally {
      setIsLoadingLocks(false)
    }
  }, [])

  const handleLock = async (pid: number) => {
    setLockingId(pid)
    try {
      const res = await InventoryAPI.createLock(pid, 1)
      setNotification(res.data.message)
      loadLocks()
      setTimeout(() => setNotification(""), 4000)
    } catch (error) {
      setNotification("Failed to lock. Please try again.")
      setTimeout(() => setNotification(""), 4000)
    } finally {
      setLockingId(null)
    }
  }

  const handleReleaseExpired = async () => {
    try {
      const res = await InventoryAPI.triggerRelease()
      setNotification(res.data.message)
      loadLocks()
      setTimeout(() => setNotification(""), 4000)
    } catch {
      setNotification("Failed to release expired locks.")
    }
  }

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await InventoryAPI.getStores()
        if (res.data && res.data.length > 0) {
          const realStores: StoreType[] = res.data.map((s, idx) => ({
            id: s.store_id || idx,
            name: s.name,
            address: s.address || "Location pending",
            image: STORE_IMAGES[idx % STORE_IMAGES.length],
            status: "open",
            isOpen: true,
          }))
          setStores(realStores)
          setSelectedStore(realStores[0])
          loadProducts(realStores[0].id)
        } else {
          const fallbackStore: StoreType = {
            id: 1,
            name: "AEGIS Hub",
            address: "Waiting for database",
            image: STORE_IMAGES[0],
            status: "closed",
            isOpen: true,
          }
          setStores([fallbackStore])
          setSelectedStore(fallbackStore)
        }
      } catch (err) {
        console.error("Failed to fetch stores:", err)
      }
    }
    fetchStores()
  }, [loadProducts])

  useEffect(() => {
    if (isCartOpen) loadLocks()
  }, [isCartOpen, loadLocks])

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 350
      carouselRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" })
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-zinc-950 font-sans text-zinc-300">
      {/* Ambient background glow (Emerald/Cyan blur) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/15 rounded-full blur-[140px] mix-blend-screen" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[140px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 py-10 md:py-16 space-y-12">
        {/* Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-center shadow-inner">
              <PackageOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Redis Lock
              </h1>
              <p className="text-sm font-mono text-zinc-400 tracking-wide mt-1">Premium Shopping & Tourism</p>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="group relative flex items-center gap-4 px-5 py-3 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
             <div className="relative flex items-center gap-2 text-white">
                <ShoppingCart className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
                <span className="font-semibold tracking-wide">My Cart</span>
             </div>
             
             {locks.length > 0 && (
                 <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                     <span className="bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                         {locks.length}
                     </span>
                     {headerTimer && (
                         <span className="text-sm font-mono text-emerald-400 font-bold">{headerTimer}</span>
                     )}
                 </div>
             )}
          </button>
        </header>

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/50 rounded-full px-6 py-3 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-slide-down">
            <Zap className="w-4 h-4 text-emerald-400" />
            <p className="text-sm font-medium text-white">{notification}</p>
          </div>
        )}

        {/* 1. HUB LOCATOR */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-wider uppercase">Select Hub</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scrollCarousel("left")} className="p-2.5 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 text-white transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scrollCarousel("right")} className="p-2.5 rounded-full bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:border-emerald-500/50 text-white transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div
            ref={carouselRef}
            className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {stores.map((store) => {
              const isActive = selectedStore?.id === store.id;
              return (
                <div
                  key={store.id}
                  onClick={() => {
                    setSelectedStore(store)
                    loadProducts(store.id)
                  }}
                  className={`relative flex-shrink-0 w-[340px] h-[200px] snap-start rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden group bg-zinc-900/40 backdrop-blur-xl border
                    ${isActive ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]" : "border-white/10 hover:border-white/20"}`}
                >
                  <img src={store.image} alt={store.name} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isActive ? "scale-105" : "group-hover:scale-105"}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-90" />
                  
                  <div className="absolute bottom-0 w-full p-6">
                    <div className="flex justify-between items-end">
                       <div>
                          <h3 className="font-bold text-white text-xl tracking-wide mb-1">{store.name}</h3>
                          <p className="text-xs text-zinc-300 flex items-center gap-1.5 line-clamp-1"><MapPin className="w-3 h-3 text-emerald-400" /> {store.address}</p>
                       </div>
                       {store.isOpen && (
                          <div className="relative flex items-center justify-center w-3 h-3 mb-1 mr-1">
                             <span className="absolute w-full h-full rounded-full bg-emerald-500 animate-ping opacity-75"></span>
                             <span className="relative w-2 h-2 rounded-full bg-emerald-400"></span>
                          </div>
                       )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 2. PRODUCT GRID & FILTERS */}
        {selectedStore && (
          <section className="space-y-8 animate-fade-in-up">
            <div className="flex flex-wrap gap-3">
              {CATEGORIES.filter(c => ["All", "Apparel", "Souvenirs"].includes(c)).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 border
                    ${activeCategory === cat 
                      ? "bg-white text-zinc-950 border-white shadow-[0_4px_15px_rgba(255,255,255,0.15)]" 
                      : "bg-zinc-900/40 backdrop-blur-md text-zinc-400 border-white/10 hover:border-white/30 hover:text-white"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isLoadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-[400px] rounded-2xl bg-zinc-900/40 backdrop-blur-md animate-pulse border border-white/10" />)}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
                {filteredProducts.map((p) => {
                  const imageIdx = p.imageIndex !== undefined ? p.imageIndex : Math.floor(Math.random() * PRODUCT_IMAGES.length);
                  return (
                    <ProductCard
                      key={p.product_id}
                      product={p}
                      imageUrl={PRODUCT_IMAGES[imageIdx % PRODUCT_IMAGES.length]}
                      onLock={handleLock}
                      isLocking={lockingId === p.product_id}
                      onClick={() => setSelectedProductDetail(p)}
                    />
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-md">
                <Package className="w-12 h-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-sm">No items found in this category.</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 3. SIDEBAR CART */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md transition-opacity" onClick={() => setIsCartOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-zinc-950/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl animate-slide-in-right flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                   <Lock className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Active Locks</h2>
                <span className="bg-white/10 text-white text-xs px-2.5 py-1 rounded-full font-mono font-bold">{locks.length}</span>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingLocks ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
              ) : locks.length > 0 ? (
                locks.map(lock => (
                  <div key={lock.id} className="group relative p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:border-emerald-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-white font-semibold mb-1">Product #{lock.product_id}</p>
                        <p className="text-xs font-mono text-zinc-400">ID: {lock.id} • QTY: {lock.quantity}</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-md font-mono uppercase font-bold tracking-wider ${lock.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                        {lock.status}
                      </span>
                    </div>
                    <CountdownTimer expiresAt={lock.expires_at} ttlSeconds={lock.ttl_seconds} />
                  </div>
                ))
              ) : (
                <div className="text-center flex flex-col items-center justify-center h-full opacity-60">
                  <ShoppingBag className="w-20 h-20 text-zinc-600 mb-6" />
                  <p className="text-zinc-300 font-semibold mb-2">Your lock is empty</p>
                  <p className="text-sm text-zinc-500 max-w-[250px] text-center mx-auto">Items you reserve will appear here until their timer expires.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/10 bg-zinc-900/20">
              <button
                onClick={handleReleaseExpired}
                className="w-full py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/5 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <AlertTriangle className="w-4 h-4" /> Sweep Expired
              </button>
            </div>
          </div>
        </div>
      )}

            {/* 4. PRODUCT DETAIL MODAL */}
      <Dialog open={!!selectedProductDetail} onOpenChange={(open) => !open && setSelectedProductDetail(null)}>
        <DialogContent className="max-w-[800px] p-0 overflow-hidden bg-zinc-950/80 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          {selectedProductDetail && (() => {
            const product = selectedProductDetail;
            const imageUrl = product.image_url || PRODUCT_IMAGES[(product.imageIndex ?? 0) % PRODUCT_IMAGES.length];
            const stock = product.stock ?? 0;
            const stockLevel = stock === 0 ? "out" : stock <= 5 ? "low" : stock <= 15 ? "medium" : "high";
            const stockColor = stockLevel === "out" ? "bg-zinc-600" : stockLevel === "low" ? "bg-red-500" : stockLevel === "medium" ? "bg-yellow-400" : "bg-emerald-400";
            return (
              <div className="flex flex-col md:flex-row h-[500px]">
                {/* Left: Image */}
                <div className="w-full md:w-1/2 relative h-full bg-zinc-800">
                  <img src={imageUrl} alt={product.name} className={`w-full h-full object-cover ${stockLevel === 'out' ? 'grayscale-[50%]' : ''}`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950/90" />
                  {product.category && (
                    <div className="absolute top-4 left-4 bg-zinc-950/60 backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] font-mono text-white uppercase tracking-widest border border-white/10">
                      {product.category}
                    </div>
                  )}
                </div>
                {/* Right: Details */}
                <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
                    <div className="flex items-center gap-1 text-emerald-400 mb-6">
                      <DollarSign className="w-6 h-6" />
                      <span className="text-3xl font-bold font-mono tracking-tight">{product.price.toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-mono">
                      {product.description || "Một sản phẩm cao cấp độc quyền từ mạng lưới AEGIS O2O. Thiết kế tinh xảo, chất lượng vượt trội, phù hợp cho những bộ sưu tập đẳng cấp."}
                    </p>
                    
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                         <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Tồn kho trực tuyến (Real-time)</span>
                         <span className="text-sm font-mono font-bold text-zinc-200">{stock} items</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                         <div className={`h-full rounded-full transition-all duration-1000 ${stockColor} ${stock > 0 ? 'animate-pulse' : ''}`} style={{ width: `${Math.min((stock / 50) * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => { handleLock(product.product_id); setSelectedProductDetail(null); }}
                    disabled={lockingId === product.product_id || stock === 0}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:from-zinc-600 disabled:to-zinc-600 disabled:shadow-none"
                  >
                    {lockingId === product.product_id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                    {lockingId === product.product_id ? "ĐANG KHÓA HÀNG..." : "🔒 KHÓA HÀNG (REDIS)"}
                  </button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .stagger-children > * { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
        .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
        .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
        .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
        .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
        .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
        .stagger-children > *:nth-child(7) { animation-delay: 0.35s; }
        .stagger-children > *:nth-child(8) { animation-delay: 0.4s; }
      `}</style>
    </div>
  )
}