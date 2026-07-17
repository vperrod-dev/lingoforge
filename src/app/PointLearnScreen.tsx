import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Loader2, WifiOff, RotateCcw, Volume2, Plus, Check, Dumbbell, X } from 'lucide-react'
import { ClayButton } from '../ui/ClayButton'
import { isOllamaOnline } from '../services/ollama'
import { identifyObjects, captureFrame, type DetectedObject } from '../services/vision'
import { speak } from '../audio/tts'
import { useProgress } from '../state/progress'
import { useSettings } from '../state/settings'
import { AiOptIn } from '../ui/AiOptIn'
import { courses } from '../content'

type Phase = 'camera' | 'scanning' | 'results' | 'offline' | 'error' | 'no-camera'

export function PointLearnScreen() {
  const aiEnabled = useSettings((s) => s.aiEnabled)
  const data = useProgress((s) => s.data)
  const { reviewVocab } = useProgress()
  const course = courses[data.activeCourse]

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('camera')
  const [errorMsg, setErrorMsg] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [objects, setObjects] = useState<DetectedObject[]>([])
  const [selected, setSelected] = useState<DetectedObject | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setPhase('camera')
    } catch {
      setPhase('no-camera')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    if (!aiEnabled) return
    startCamera()
    return stopCamera
  }, [aiEnabled, startCamera, stopCamera])

  const snap = async () => {
    if (!videoRef.current) return

    const online = await isOllamaOnline()
    if (!online) {
      setPhase('offline')
      return
    }

    const base64 = captureFrame(videoRef.current)
    setImageUrl(`data:image/jpeg;base64,${base64}`)
    stopCamera()
    setPhase('scanning')

    try {
      const detected = await identifyObjects(base64, course.ttsLang)
      if (detected.length === 0) throw new Error('No objects detected — try a different angle')
      setObjects(detected)
      setPhase('results')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Detection failed')
      setPhase('error')
    }
  }

  const reset = () => {
    setImageUrl(null)
    setObjects([])
    setSelected(null)
    setAdded(new Set())
    setErrorMsg('')
    startCamera()
  }

  const addToReview = (obj: DetectedObject) => {
    reviewVocab(data.activeCourse, `pointlearn:${obj.nameTarget}`, true)
    setAdded((prev) => new Set(prev).add(obj.nameTarget))
  }

  if (!aiEnabled) {
    return (
      <div className="flex min-h-dvh flex-col justify-center p-6">
        <AiOptIn detail="Point & Learn also sends your camera frames to that local server for object detection." />
      </div>
    )
  }

  if (phase === 'no-camera') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <Camera className="size-12 text-fg-muted" />
        <p className="text-center font-bold">Camera access denied</p>
        <p className="text-center text-sm text-fg-muted">
          Allow camera access in your browser settings to use Point &amp; Learn
        </p>
      </div>
    )
  }

  if (phase === 'offline') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
        <WifiOff className="size-12 text-red-500" />
        <p className="font-bold text-red-800">Ollama is not running</p>
        <p className="text-sm text-fg-muted">
          Start it with <code className="rounded bg-red-100 px-1">ollama serve</code>
        </p>
        <ClayButton variant="primary" onClick={reset}>Try again</ClayButton>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-black">
      {/* Camera / Image view */}
      <div className="relative flex-1">
        {phase === 'camera' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-cover"
          />
        )}

        {(phase === 'scanning' || phase === 'results' || phase === 'error') && imageUrl && (
          <div className="relative size-full">
            <img src={imageUrl} alt="Captured" className="size-full object-cover" />

            {phase === 'results' && objects.map((obj, i) => {
              const [x1, y1, x2, y2] = obj.bbox
              const isAdded = added.has(obj.nameTarget)
              return (
                <motion.button
                  key={i}
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelected(obj)}
                  style={{
                    position: 'absolute',
                    left: `${x1}%`,
                    top: `${y1}%`,
                    width: `${x2 - x1}%`,
                    height: `${y2 - y1}%`,
                  }}
                  className="group"
                >
                  <div className={`size-full rounded-lg border-2 ${isAdded ? 'border-green-400' : 'border-indigo-400'} bg-white/10`} />
                  <span className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold shadow-lg ${isAdded ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white'}`}>
                    {obj.nameTarget}
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}

        {phase === 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <Loader2 className="size-12 animate-spin text-white" />
            <p className="mt-3 font-bold text-white">Identifying objects...</p>
            <p className="text-sm text-white/70">This can take 20-40 seconds</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-6">
            <p className="font-bold text-red-400">{errorMsg}</p>
            <ClayButton variant="primary" onClick={reset} className="mt-4">Try again</ClayButton>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="safe-bottom shrink-0 bg-bg p-4">
        {phase === 'camera' && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={snap}
              className="flex size-16 items-center justify-center rounded-full border-4 border-primary bg-white shadow-lg active:scale-95"
              aria-label="Take photo"
            >
              <Camera className="size-7 text-primary" />
            </button>
          </div>
        )}

        {phase === 'results' && (
          <div className="flex items-center justify-between gap-3">
            <ClayButton variant="neutral" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> New photo
            </ClayButton>
            <span className="text-sm text-fg-muted">
              {objects.length} object{objects.length !== 1 ? 's' : ''} found
            </span>
          </div>
        )}
      </div>

      {/* Detail popup */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-bg p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 text-fg-muted"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3">
              <h3 className="font-display text-2xl font-bold">{selected.nameTarget}</h3>
              <button
                type="button"
                onClick={() => speak(selected.nameTarget, course.ttsLang)}
                className="text-primary"
                aria-label="Play pronunciation"
              >
                <Volume2 className="size-5" />
              </button>
            </div>
            <p className="text-fg-muted">{selected.nameEn}</p>
            <p className="mt-1 text-sm italic text-fg-muted">{selected.pronunciation}</p>

            <div className="clay mt-4 bg-bg/60 p-3">
              <p className="font-semibold">{selected.example}</p>
              <p className="text-sm text-fg-muted">{selected.exampleTranslation}</p>
            </div>

            <div className="mt-4 flex gap-3">
              {added.has(selected.nameTarget) ? (
                <ClayButton variant="neutral" disabled>
                  <Check className="size-4" aria-hidden /> Added to review
                </ClayButton>
              ) : (
                <ClayButton variant="primary" onClick={() => addToReview(selected)}>
                  <Plus className="size-4" aria-hidden /> Add to review
                </ClayButton>
              )}
              <ClayButton
                variant="neutral"
                onClick={() => speak(selected.example, course.ttsLang)}
              >
                <Dumbbell className="size-4" aria-hidden /> Hear example
              </ClayButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
