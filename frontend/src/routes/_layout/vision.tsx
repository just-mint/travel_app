import { createFileRoute } from "@tanstack/react-router"
import {
  CheckCircle2,
  Eye,
  Image,
  Loader2,
  RefreshCw,
  ScanFace,
  Shirt,
  UploadCloud,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  type ClosetItemResponse,
  type TaskStatus,
  VisionAPI,
} from "@/client/aegis-api"

export const Route = createFileRoute("/_layout/vision")({
  component: VisionCloset,
})

function VisionCloset() {
  const [activeTab, setActiveTab] = useState<"scan" | "closet">("scan")
  // Scan
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [taskId, setTaskId] = useState("")
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  // Closet
  const [closetItems, setClosetItems] = useState<ClosetItemResponse[]>([])
  const [isLoadingCloset, setIsLoadingCloset] = useState(false)
  const [closetFile, setClosetFile] = useState<File | null>(null)
  const [isUploadingCloset, setIsUploadingCloset] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const closetFileRef = useRef<HTMLInputElement>(null)

  // Handle Scan Upload
  const handleScanUpload = async () => {
    if (!scanFile) return
    setIsUploading(true)
    setTaskStatus(null)
    try {
      const res = await VisionAPI.uploadScan(scanFile)
      setTaskId(res.data.task_id)
      setIsPolling(true)
    } catch {
      setTaskId("")
    } finally {
      setIsUploading(false)
    }
  }

  // Poll Task Status
  useEffect(() => {
    if (!isPolling || !taskId) return
    const interval = setInterval(async () => {
      try {
        const res = await VisionAPI.checkTask(taskId)
        setTaskStatus(res.data)
        if (res.data.status !== "processing") {
          setIsPolling(false)
          clearInterval(interval)
        }
      } catch {
        setIsPolling(false)
        clearInterval(interval)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isPolling, taskId])

  // Load Closet
  const loadCloset = useCallback(async () => {
    setIsLoadingCloset(true)
    try {
      const res = await VisionAPI.getMyCloset()
      setClosetItems(res.data)
    } catch {
      setClosetItems([])
    } finally {
      setIsLoadingCloset(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "closet") loadCloset()
  }, [activeTab, loadCloset])

  // Handle closet upload
  const handleClosetUpload = async () => {
    if (!closetFile) return
    setIsUploadingCloset(true)
    try {
      await VisionAPI.addToCloset(closetFile)
      setClosetFile(null)
      loadCloset()
    } catch {
      // silent
    } finally {
      setIsUploadingCloset(false)
    }
  }

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("image/")) {
      if (activeTab === "scan") {
        setScanFile(file)
        setScanPreview(URL.createObjectURL(file))
      } else {
        setClosetFile(file)
      }
    }
  }

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "scan" | "closet",
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (target === "scan") {
      setScanFile(file)
      setScanPreview(URL.createObjectURL(file))
    } else {
      setClosetFile(file)
    }
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-[1800px] mx-auto flex flex-col gap-6 animate-in fade-in duration-700 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 glow-emerald">
            <ScanFace className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Vision & Closet
            </h1>
            <p className="text-sm text-emerald-400/70 font-mono mt-0.5 tracking-widest uppercase">
              AI Scan · Vector Embedding · pgvector
            </p>
          </div>
        </div>

        <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setActiveTab("scan")}
            className={`px-5 py-2 text-xs font-mono tracking-wider uppercase transition-all flex items-center gap-2 ${activeTab === "scan" ? "bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Eye className="w-3.5 h-3.5" /> AI Scan
          </button>
          <button
            onClick={() => setActiveTab("closet")}
            className={`px-5 py-2 text-xs font-mono tracking-wider uppercase transition-all flex items-center gap-2 ${activeTab === "closet" ? "bg-purple-500/10 text-purple-400 border-b-2 border-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            <Shirt className="w-3.5 h-3.5" /> Virtual Closet
          </button>
        </div>
      </div>

      {activeTab === "scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Zone */}
          <div className="glass-card p-6 flex flex-col">
            <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UploadCloud className="w-4 h-4" /> Upload for AI Scan
            </h3>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex-1 min-h-[280px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-500/10 scale-[1.02]"
                  : scanPreview
                    ? "border-white/10 bg-transparent"
                    : "border-white/10 bg-white/[0.02] hover:border-emerald-400/30 hover:bg-white/[0.04]"
              }`}
            >
              {scanPreview ? (
                <img
                  src={scanPreview}
                  alt="Preview"
                  className="max-h-[260px] rounded-xl object-contain"
                />
              ) : (
                <>
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <UploadCloud className="w-8 h-8 text-emerald-400" />
                    </div>
                    {/* Scan animation */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[scanline_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mb-1">
                    Kéo thả ảnh hoặc click để chọn
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono">
                    JPEG, PNG, WebP • Max 10MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "scan")}
            />

            {scanFile && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Image className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">
                    {scanFile.name}
                  </span>
                  <span className="text-zinc-600">
                    ({(scanFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={handleScanUpload}
                  disabled={isUploading}
                  className="aegis-btn aegis-btn-primary text-xs"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ScanFace className="w-3.5 h-3.5" />
                  )}
                  {isUploading ? "Uploading..." : "Start AI Scan"}
                </button>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="glass-card p-6 flex flex-col">
            <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Scan Results
            </h3>

            {!taskId && !taskStatus && (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-[spin_4s_linear_infinite]" />
                  <div className="absolute inset-3 rounded-full border border-dashed border-emerald-500/30 animate-[spin_6s_linear_infinite_reverse]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScanFace className="w-8 h-8 text-emerald-500/30" />
                  </div>
                </div>
                <p className="text-sm font-mono">Awaiting image input...</p>
              </div>
            )}

            {isPolling && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/40 animate-ping" />
                  <div className="absolute inset-0 rounded-full border border-emerald-500/60 animate-[spin_2s_linear_infinite]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                </div>
                <p className="text-sm text-emerald-400 font-mono animate-pulse">
                  AI Processing...
                </p>
                <p className="text-[10px] text-zinc-600 font-mono mt-1">
                  Task: {taskId}
                </p>
              </div>
            )}

            {taskStatus && !isPolling && (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`status-badge ${taskStatus.status === "completed" ? "status-badge-active" : taskStatus.status === "failed" ? "status-badge-danger" : "status-badge-warning"}`}
                  >
                    {taskStatus.status === "completed" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {taskStatus.status}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    ID: {taskStatus.task_id}
                  </span>
                </div>

                {/* Detected Objects */}
                {taskStatus.detected_objects && (
                  <div className="glass-card p-4">
                    <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                      Detected Objects
                    </h4>
                    <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap bg-black/30 rounded-lg p-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                      {JSON.stringify(taskStatus.detected_objects, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Matched Products */}
                {taskStatus.matched_product_ids &&
                  taskStatus.matched_product_ids.length > 0 && (
                    <div className="glass-card p-4">
                      <h4 className="text-[10px] font-mono text-purple-400 uppercase tracking-wider mb-2">
                        Matched Products
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {taskStatus.matched_product_ids.map((pid) => (
                          <span
                            key={pid}
                            className="status-badge status-badge-info"
                          >
                            PID: {pid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "closet" && (
        <>
          {/* Upload to Closet */}
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="flex-1 flex items-center gap-3">
              <button
                onClick={() => closetFileRef.current?.click()}
                className="aegis-btn aegis-btn-ghost text-xs"
              >
                <UploadCloud className="w-4 h-4" /> Chọn ảnh
              </button>
              <input
                ref={closetFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "closet")}
              />
              {closetFile && (
                <span className="text-xs text-zinc-400 truncate">
                  {closetFile.name}
                </span>
              )}
            </div>
            <button
              onClick={handleClosetUpload}
              disabled={!closetFile || isUploadingCloset}
              className="aegis-btn aegis-btn-primary text-xs disabled:opacity-30"
            >
              {isUploadingCloset ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Shirt className="w-3.5 h-3.5" />
              )}
              Add to Closet
            </button>
            <button
              onClick={loadCloset}
              className="aegis-btn aegis-btn-ghost text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Closet Grid */}
          {isLoadingCloset ? (
            <div className="glass-card p-12 text-center">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            </div>
          ) : closetItems.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger-children">
              {closetItems.map((item) => (
                <div key={item.id} className="glass-card overflow-hidden group">
                  <div className="aspect-square bg-white/[0.02] relative overflow-hidden">
                    <img
                      src={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/${item.image_path}`}
                      alt={`Closet item ${item.id}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = "none"
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] text-zinc-500 font-mono">
                      ID: {item.id}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="glass-card p-12 text-center"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Shirt className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">
                Tủ đồ ảo trống. Kéo thả ảnh trang phục vào đây!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
