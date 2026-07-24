import { useState } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#4f46e5', '#16a34a', '#f59e0b', '#ef4444', '#818cf8']

/** Lightweight confetti burst — pure framer-motion, no assets. */
export function Confetti({ count = 40 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.4,
      rotate: Math.random() * 720 - 360,
      color: COLORS[i % COLORS.length],
      size: 8 + Math.random() * 8,
      duration: 2.2 + Math.random(),
    })),
  )

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 block rounded-sm"
          style={{ left: `${p.x}%`, width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', opacity: [1, 1, 0.7], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}
