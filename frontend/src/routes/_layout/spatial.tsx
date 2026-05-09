import { createFileRoute } from "@tanstack/react-router"
import L from "leaflet"
import {
  Layers,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Route as RouteIcon,
  CloudLightning,
  Map as MapIcon,
  Milestone,
  X // Đã bổ sung import icon X bị thiếu
} from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { toast } from "sonner"
import {
  type NearbySearchResponse,
  type RoutePlanResponse,
  SpatialAPI,
} from "@/client/aegis-api"

export const Route = createFileRoute("/_layout/spatial")({
  component: SpatialOperations,
})

// Custom Icons Factory
const createDivIcon = (html: string, size: number) => L.divIcon({
  className: "bg-transparent",
  html,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
})

const defaultIcon = createDivIcon(`<div class="w-3 h-3 bg-cyan-400 rounded-full border-2 border-black shadow-[0_0_10px_rgba(34,211,238,0.8)] transition-transform hover:scale-125"></div>`, 12)
const selectedIcon = createDivIcon(`<div class="w-4 h-4 bg-purple-500 rounded-full border-2 border-black shadow-[0_0_15px_rgba(168,85,247,0.9)] animate-pulse"></div>`, 16)
const userIcon = createDivIcon(`<div class="w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-black shadow-[0_0_20px_rgba(16,185,129,1)]"></div>`, 20)

const getNumberedIcon = (num: number) => createDivIcon(`
  <div class="w-7 h-7 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[12px] shadow-[0_0_15px_rgba(168,85,247,0.9)] scale-110">
    ${num}
  </div>
`, 28)

// Recenter Map Component
function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], map.getZoom(), { animate: true })
  }, [lat, lon, map])
  return null
}

function SpatialOperations() {
  const [lat, setLat] = useState(21.0285)
  const [lon, setLon] = useState(105.8542)
  const [radius, setRadius] = useState(2000)

  const [nearbyData, setNearbyData] = useState<NearbySearchResponse | null>(null)
  const [routeData, setRouteData] = useState<RoutePlanResponse | null>(null)

  const [isLoadingNearby, setIsLoadingNearby] = useState(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  const [selectedNodes, setSelectedNodes] = useState<any[]>([])
  const [mapCenter, setMapCenter] = useState<[number, number]>([21.0285, 105.8542])

  const handleFindNearby = async () => {
    setIsLoadingNearby(true)
    setRouteData(null)
    setSelectedNodes([]) // Reset selections on new scan
    try {
      const res = await SpatialAPI.nearbyPlaces(lat, lon, radius)
      setNearbyData(res.data)
      setMapCenter([lat, lon])
      toast.success(`Đã tìm thấy ${res.data.total_found} địa điểm trong khu vực!`)
    } catch (e) {
      toast.error("Lỗi khi tìm kiếm địa điểm xung quanh. Vui lòng thử lại.")
      setNearbyData(null)
    } finally {
      setIsLoadingNearby(false)
    }
  }

  const toggleNodeSelection = (place: any) => {
    setSelectedNodes((prev) => {
      const isSelected = prev.some((p) => p.id === place.id)
      if (isSelected) {
        return prev.filter((p) => p.id !== place.id)
      } else {
        return [...prev, place]
      }
    })
    // Reset route result when modifying selection
    if (routeData) setRouteData(null)
  }

  const handlePlanRoute = async () => {
    if (selectedNodes.length === 0) {
      toast.error("Vui lòng chọn ít nhất một địa điểm để lập tuyến đường!")
      return
    }
    setIsLoadingRoute(true)
    try {
      const storeIds = selectedNodes.map(n => n.id)
      const res = await SpatialAPI.routePlan(lat, lon, storeIds)
      setRouteData(res.data)
      toast.success("Tối ưu hóa tuyến đường (TSP) thành công!")
    } catch (e) {
      toast.error("Lỗi 500: Server không thể tính toán tuyến đường. Vui lòng kiểm tra lại data.")
      setRouteData(null)
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude)
          setLon(pos.coords.longitude)
          setMapCenter([pos.coords.latitude, pos.coords.longitude])
          toast.success("Đã cập nhật vị trí GPS của bạn")
        },
        () => {
          toast.error("Không thể lấy vị trí GPS")
        },
      )
    }
  }

  const routePolyline: [number, number][] = useMemo(() => {
    if (!routeData || !routeData.waypoints) return []
    const coords: [number, number][] = [[lat, lon]]
    routeData.waypoints.forEach((w) => coords.push([w.lat, w.lon]))
    return coords
  }, [routeData, lat, lon])

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] lg:h-screen overflow-hidden bg-zinc-950">

      {/* FULL SCREEN MAP */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={14}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap lat={mapCenter[0]} lon={mapCenter[1]} />

          {/* User Location */}
          <Marker position={[lat, lon]} icon={userIcon}>
            <Popup className="custom-popup">
              <div className="text-xs font-mono p-1">
                <strong className="text-emerald-500">📍 Vị trí của bạn</strong>
                <br />
                {lat.toFixed(5)}, {lon.toFixed(5)}
              </div>
            </Popup>
          </Marker>

          {/* Search Radius Circle */}
          {nearbyData && (
            <Circle
              center={[lat, lon]}
              radius={radius}
              pathOptions={{
                color: "#22d3ee",
                fillColor: "#22d3ee",
                fillOpacity: 0.05,
                weight: 1,
                dashArray: "5, 10"
              }}
            />
          )}

          {/* Nearby Places Markers */}
          {nearbyData?.places.map((p) => {
            const isSelected = selectedNodes.some((n) => n.id === p.id);
            let orderIndex = -1;

            if (routeData?.optimized_order) {
              orderIndex = routeData.optimized_order.indexOf(p.id);
            }

            let icon = defaultIcon;
            if (orderIndex !== -1) {
              icon = getNumberedIcon(orderIndex + 1);
            } else if (isSelected) {
              icon = selectedIcon;
            }

            return (
              <Marker
                key={p.id}
                position={[p.lat, p.lon]}
                icon={icon}
                eventHandlers={{
                  click: () => !routeData && toggleNodeSelection(p)
                }}
              >
                <Popup>
                  <div className="text-xs font-mono p-1 min-w-[150px]">
                    <strong className="text-cyan-400 text-sm block mb-1 truncate">{p.name}</strong>
                    <div className="text-zinc-400 mb-2">
                      {p.category && <span>{p.category}</span>}
                      {p.distance_meters && <span className="block mt-0.5">{Math.round(p.distance_meters)}m away</span>}
                    </div>

                    {!routeData && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeSelection(p);
                        }}
                        className={`w-full py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-colors ${isSelected ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'}`}
                      >
                        {isSelected ? <><Minus className="w-3 h-3" /> Bỏ chọn</> : <><Plus className="w-3 h-3" /> Chọn điểm</>}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route Polyline connecting the sequence */}
          {routePolyline.length > 1 && (
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: "#a855f7",
                weight: 4,
                opacity: 0.8,
                dashArray: "10, 10",
                lineCap: "round"
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* FLOATING GLASS PANEL - Single Flow UX */}
      <div className="absolute top-4 left-4 z-[1000] w-[380px] max-h-[calc(100vh-2rem)] flex flex-col bg-zinc-950/70 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-2.5 tracking-wide font-mono">
            <MapIcon className="w-6 h-6 text-cyan-400" />
            SPATIAL_OPS
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1 font-mono tracking-widest uppercase">
            Intelligent Routing System
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

          {/* STEP 1: Define Origin */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <LocateFixed className="w-3 h-3 text-emerald-400" /> Điểm Bắt Đầu
              </label>
              <button
                onClick={handleLocateMe}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors bg-emerald-500/10 px-2 py-1 rounded-full"
              >
                Auto GPS
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Latitude"
              />
              <input
                type="number"
                step="any"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                placeholder="Longitude"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-1.5 block">
                Bán kính tìm kiếm (m)
              </label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>

            <button
              onClick={handleFindNearby}
              disabled={isLoadingNearby}
              className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-mono uppercase tracking-wider text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {isLoadingNearby ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoadingNearby ? "Scanning..." : "Quét Khu Vực"}
            </button>
          </div>

          {/* STEP 2: Selected Nodes & Route Plan */}
          {selectedNodes.length > 0 && (
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2">
              <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Milestone className="w-3.5 h-3.5" /> Điểm Dừng Đã Chọn ({selectedNodes.length})
              </h3>

              <div className="space-y-1.5 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedNodes.map(node => (
                  <div key={node.id} className="flex items-center justify-between bg-black/40 border border-white/5 p-2 rounded-lg group">
                    <span className="text-xs text-zinc-300 font-mono truncate mr-2">{node.name}</span>
                    <button
                      onClick={() => toggleNodeSelection(node)}
                      className="text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {!routeData && (
                <button
                  onClick={handlePlanRoute}
                  disabled={isLoadingRoute}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-mono uppercase tracking-wider text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
                >
                  {isLoadingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {isLoadingRoute ? "Processing TSP..." : "Tối Ưu Tuyến Đường"}
                </button>
              )}

              {/* TSP Result Box */}
              {routeData && (
                <div className="mt-4 pt-4 border-t border-purple-500/20">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-xl font-bold text-cyan-400 font-mono">
                        {(routeData.total_distance_meters / 1000).toFixed(1)}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-1">KM Lộ Trình</p>
                    </div>
                    <div className="bg-black/40 rounded-xl p-3 text-center border border-white/5">
                      <p className="text-xl font-bold text-purple-400 font-mono">
                        {routeData.optimized_order.length}
                      </p>
                      <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Điểm Dừng</p>
                    </div>
                  </div>

                  {routeData.weather_context && routeData.weather_context.condition !== "Unknown" && (
                    <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-mono bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      <CloudLightning className="w-3.5 h-3.5" />
                      Thời tiết: {routeData.weather_context.condition} ({routeData.weather_context.temperature}°C)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Nearby Results List */}
          {nearbyData && nearbyData.places.length > 0 && !routeData && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-500" /> Kết quả truy vấn</span>
                <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{nearbyData.total_found}</span>
              </h3>

              <div className="space-y-2">
                {nearbyData.places.slice(0, 30).map((p) => {
                  const isSelected = selectedNodes.some(n => n.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected
                        ? "border-purple-500/50 bg-purple-500/10"
                        : "border-white/5 bg-black/40 hover:border-white/10"
                        }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            {Math.round(p.distance_meters || 0)}m
                          </span>
                          {p.category && <span className="text-[10px] text-zinc-500 truncate">{p.category}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => toggleNodeSelection(p)}
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                          }`}
                      >
                        {isSelected ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}