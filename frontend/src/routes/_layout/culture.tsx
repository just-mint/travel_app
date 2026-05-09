import { createFileRoute } from "@tanstack/react-router"
import {
  BookOpen,
  Landmark,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Star,
  X,
  Command,
  TrendingUp,
  Navigation,
  Quote,
  Layers,
  Globe,
  Compass,
  Calendar,
  Users,
} from "lucide-react"
import { useRef, useState, useEffect } from "react"
import {
  CultureAPI,
  type PlaceDetailWithAI,
  type PlaceResponse,
  type ReviewResponse,
} from "@/client/aegis-api"

export const Route = createFileRoute("/_layout/culture")({
  component: CultureHeritage,
})

// Ảnh nền chất lượng cao, rõ nét
const BACKGROUND_IMAGE = "https://kinhtevadubao.vn/stores/news_dataimages/kinhtevadubaovn/092018/18/14/5-ve-dep-co-do-hue-tao-ne-su-hap-dan-dac-biet-khi-ghe-tham-07-.7434.jpg"

const TRENDING_HERITAGES = [
  {
    name: "Vịnh Hạ Long",
    subtitle: "Kỳ quan thiên nhiên thế giới",
    desc: "Hòn Trống Mái, Động Thiên Cung, vẻ đẹp huyền ảo",
    image: "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200",
    query: "Vịnh Hạ Long",
  },
  {
    name: "Cố đô Huế",
    subtitle: "Kiến trúc triều Nguyễn độc đáo",
    desc: "Sự giao thoa văn hóa lịch sử",
    image: "https://kinhtevadubao.vn/stores/news_dataimages/kinhtevadubaovn/092018/18/14/5-ve-dep-co-do-hue-tao-ne-su-hap-dan-dac-biet-khi-ghe-tham-08-.5606.jpg",
    query: "Huế",
  },
  {
    name: "Hà Nội",
    subtitle: "Thủ đô ngàn năm văn hiến",
    desc: "Hồ Gươm, 36 phố phường",
    image: "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200",
    query: "Hà Nội",
  },
  {
    name: "Phố cổ Hội An",
    subtitle: "Di sản văn hóa thế giới",
    desc: "Đèn lồng, cổ kính, thơ mộng",
    image: "https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1200",
    query: "Hội An",
  },
  {
    name: "Ninh Bình",
    subtitle: "Tràng An, Tam Cốc",
    desc: "Vịnh Hạ Long trên cạn",
    image: "https://images.pexels.com/photos/27356566/pexels-photo-27356566.jpeg",
    query: "Ninh Bình",
  },
  {
    name: "Sapa",
    subtitle: "Thành phố trong sương",
    desc: "Ruộng bậc thang, đỉnh Fansipan",
    image: "https://booking.muongthanh.com/upload_images/images/H%60/dinh-nui-fansipan.jpg",
    query: "Sapa",
  },
]

function CultureHeritage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [places, setPlaces] = useState<PlaceResponse[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetailWithAI | null>(null)
  const [reviews, setReviews] = useState<ReviewResponse[]>([])
  const [isLoadingStory, setIsLoadingStory] = useState(false)
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reviewAuthor, setReviewAuthor] = useState("")
  const [reviewText, setReviewText] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [typed, setTyped] = useState("")
  const phrases = ["tìm hiểu về Chùa Một Cột...", "khám phá Vịnh Hạ Long...", "kể chuyện Thánh địa Mỹ Sơn..."]

  useEffect(() => {
    let i = 0, j = 0, forward = true
    const interval = setInterval(() => {
      if (forward) {
        if (j <= phrases[i].length) {
          setTyped(phrases[i].slice(0, j))
          j++
        } else {
          forward = false
          setTimeout(() => { }, 2000)
        }
      } else {
        if (j >= 0) {
          setTyped(phrases[i].slice(0, j))
          j--
        } else {
          forward = true
          i = (i + 1) % phrases.length
          j = 0
        }
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const res = await CultureAPI.searchPlaces(searchQuery)
      setPlaces(res.data)
    } catch {
      setPlaces([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleOpenPlace = async (place: PlaceResponse) => {
    setShowModal(true)
    setIsLoadingStory(true)
    setIsLoadingReviews(true)
    setSelectedPlace(null)
    setReviews([])
    try {
      const [storyRes, reviewsRes] = await Promise.all([
        CultureAPI.getPlaceStory(place.id),
        CultureAPI.getPlaceReviews(place.id),
      ])
      setSelectedPlace(storyRes.data)
      setReviews(reviewsRes.data)
    } catch {
      setSelectedPlace({ ...place, ai_story: "Không thể tải câu chuyện AI." })
    } finally {
      setIsLoadingStory(false)
      setIsLoadingReviews(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedPlace || !reviewAuthor.trim() || !reviewText.trim()) return
    setIsSubmittingReview(true)
    try {
      const res = await CultureAPI.addPlaceReview(selectedPlace.id, {
        author_name: reviewAuthor,
        rating: reviewRating,
        text: reviewText,
      })
      setReviews(prev => [...prev, res.data])
      setReviewAuthor("")
      setReviewText("")
      setReviewRating(5)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleTrendingClick = (query: string) => {
    setSearchQuery(query)
    setTimeout(() => handleSearch(), 50)
  }

  const showEmptyState = places.length === 0 && !isSearching && searchQuery === ""

  return (
    <div className="relative min-h-screen w-full bg-black">
      {/* Background cố định, rõ nét, không bị che sidebar */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed bg-no-repeat"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80" />
        <div className="absolute inset-0 backdrop-blur-md" />
      </div>

      {/* Content - có padding để không đè sidebar */}
      <div className="relative z-10 w-full px-4 md:px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Hero + Omnibar */}
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span className="text-xs font-mono font-bold tracking-wider text-white/90 uppercase">AI Storytelling Engine</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
              <span className="text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                Văn hóa & Di sản
              </span>
            </h1>
            <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto">
              Khám phá chiều sâu lịch sử qua lăng kính trí tuệ nhân tạo
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="max-w-3xl mx-auto mt-8">
              <div className="relative group">
                <Sparkles className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80 drop-shadow-lg" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`${typed}`}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl py-5 pl-14 pr-44 text-white placeholder:text-white/60 text-lg focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 border border-white/20 text-white/60 text-xs font-mono">
                    <Command size={12} /> K
                  </kbd>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 hover:scale-105 transition-all px-5 py-2 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send size={16} />}
                    <span>Khám phá</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Kết quả tìm kiếm - card 3D */}
          {places.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children">
              {places.map((place, idx) => (
                <div
                  key={place.id}
                  onClick={() => handleOpenPlace(place)}
                  className="group relative bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 hover:border-cyan-400/80 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:-translate-y-2"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/20 group-hover:scale-110 transition-transform">
                          <Landmark className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white group-hover:text-cyan-300">{place.name}</h3>
                          {place.category && <p className="text-xs text-white/50">{place.category}</p>}
                        </div>
                      </div>
                      {place.rating && (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span className="text-sm">{place.rating}</span>
                        </div>
                      )}
                    </div>
                    {place.address && (
                      <p className="text-sm text-white/60 flex items-center gap-2">
                        <MapPin size={14} /> {place.address}
                      </p>
                    )}
                    <div className="pt-4 border-t border-white/10 flex justify-between text-xs text-white/40">
                      <span className="font-mono">{place.lat.toFixed(4)}°, {place.lon.toFixed(4)}°</span>
                      <span className="flex items-center gap-1 text-cyan-300">AI Story <Sparkles size={12} /></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isSearching && searchQuery !== "" && places.length === 0 && (
            <div className="text-center py-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 max-w-md mx-auto">
              <Search className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">Không tìm thấy "<span className="text-cyan-400">{searchQuery}</span>"</p>
            </div>
          )}

          {/* Empty State - Trending Cards 3D */}
          {showEmptyState && (
            <div className="space-y-10">
              <div className="text-center">
                <TrendingUp className="inline-block w-6 h-6 text-cyan-400 mr-2" />
                <span className="text-white/70 text-sm font-mono tracking-wider uppercase">Điểm đến được quan tâm nhất</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {TRENDING_HERITAGES.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleTrendingClick(item.query)}
                    className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:scale-105 hover:z-10 transform-gpu perspective-1000 border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.8)] hover:border-white/30 hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)]"
                  >
                    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
                    </div>
                    <div className="relative p-6 h-72 flex flex-col justify-end">
                      <h3 className="text-2xl font-bold text-white group-hover:text-amber-200 transition drop-shadow-md">
                        {item.name}
                      </h3>
                      <p className="text-white/90 text-sm mt-1 drop-shadow-md">{item.subtitle}</p>
                      <p className="text-white/70 text-xs mt-2 drop-shadow-md">{item.desc}</p>
                      <div className="mt-5 flex items-center gap-2 text-amber-300 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                        Khám phá ngay <Navigation size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thêm một số thống kê giả để tăng chiều dài */}
          {showEmptyState && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 text-center border border-white/10">
                <Globe className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">48</div>
                <div className="text-xs text-white/50">Di sản văn hóa</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 text-center border border-white/10">
                <Compass className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">120+</div>
                <div className="text-xs text-white/50">Điểm đến</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 text-center border border-white/10">
                <Calendar className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">2000+</div>
                <div className="text-xs text-white/50">Năm lịch sử</div>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 text-center border border-white/10">
                <Users className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">1M+</div>
                <div className="text-xs text-white/50">Lượt khám phá</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal chi tiết (giữ nguyên logic, style nâng cấp) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-black/95 border border-white/20 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto custom-scroll shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-black/90 backdrop-blur-xl p-5 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{selectedPlace?.name}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">Câu chuyện AI</h3>
                </div>
                {isLoadingStory ? (
                  <div className="flex gap-3 p-5 rounded-xl bg-white/5"><Loader2 className="animate-spin text-cyan-400" /> Đang sinh câu chuyện...</div>
                ) : (
                  <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/80 leading-relaxed">{selectedPlace?.ai_story || "Chưa có câu chuyện."}</p>
                    {selectedPlace && (
                      <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/40 font-mono">
                        📍 {selectedPlace.lat.toFixed(5)}, {selectedPlace.lon.toFixed(5)} | {selectedPlace.address}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white/80 uppercase">Đánh giá ({reviews.length})</h3>
                </div>
                {isLoadingReviews ? (
                  <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
                ) : reviews.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {reviews.map(r => (
                      <div key={r.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-white/90">{r.author_name}</span>
                          <div className="flex gap-0.5">
                            {Array(5).fill(0).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-white/30"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-white/70">{r.text}</p>
                        <span className="text-[10px] text-white/30 mt-2 block">{r.time_posted}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/50 text-sm">Chưa có đánh giá nào.</p>
                )}
                <div className="mt-6 p-5 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold text-white/60 mb-3 uppercase">Viết cảm nhận</h4>
                  <div className="space-y-3">
                    <input type="text" value={reviewAuthor} onChange={(e) => setReviewAuthor(e.target.value)} placeholder="Tên của bạn" className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">Đánh giá:</span>
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button" onClick={() => setReviewRating(s)}>
                          <Star className={`w-5 h-5 ${s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-white/30"}`} />
                        </button>
                      ))}
                    </div>
                    <textarea rows={3} value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Chia sẻ trải nghiệm..." className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 resize-none" />
                    <button onClick={handleSubmitReview} disabled={isSubmittingReview || !reviewAuthor.trim() || !reviewText.trim()} className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-medium py-2 rounded-lg transition disabled:opacity-30 flex items-center justify-center gap-2">
                      {isSubmittingReview ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={14} />} Gửi đánh giá
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
        }
        .custom-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: #06b6d4;
          border-radius: 10px;
        }
        .stagger-children > * {
          opacity: 0;
          animation: fadeInUp 0.5s ease-out forwards;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  )
}