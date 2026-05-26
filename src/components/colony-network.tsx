'use client'

/* CageSync background — vivarium cage rack schematic.
   Renders rows of identical cage cells (the physical object researchers
   actually see every day). A scan-beam sweeps the rack; random cells
   briefly highlight as "just scanned". */

import { useEffect, useRef, useState, useMemo } from 'react'

const mulberry32 = (a: number) => () => {
  a |= 0
  a = (a + 0x6d2b79f5) | 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/* ─── rack geometry ─── */
const COLS = 5
const ROWS = 8
const VBW = 100
const VBH = 140
const PAD_X = 5
const PAD_Y = 4

interface Cell {
  r: number
  c: number
  x: number
  y: number
  w: number
  h: number
  qr: boolean[]
  id: string
  occupied: boolean
  scanOffset: number
  scanFreq: number
}

function buildRack(seed: number): Cell[] {
  const rand = mulberry32(seed)
  const cellW = (VBW - PAD_X * 2) / COLS
  const cellH = (VBH - PAD_Y * 2) / ROWS
  const cells: Cell[] = []

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({
        r, c,
        x: PAD_X + c * cellW,
        y: PAD_Y + r * cellH,
        w: cellW - 1.4,
        h: cellH - 1.4,
        // pseudo-QR cells per cage
        qr: Array.from({ length: 9 }, () => rand() > 0.45),
        id: `${String.fromCharCode(65 + (c % 6))}${r + 1}-${String(Math.floor(rand() * 90) + 10)}`,
        // ~85% occupied
        occupied: rand() > 0.15,
        // staggered scan time so highlights happen at different moments
        scanOffset: rand() * 8,
        scanFreq: 7 + rand() * 8,
      })
    }
  }
  return cells
}

interface ColonyNetworkProps {
  speed?: number
  accent?: string
  opacity?: number
  seed?: number
}

export default function ColonyNetwork({
  speed = 1,
  accent = "#7FE7B5",
  opacity = 0.08,
  seed = 7
}: ColonyNetworkProps) {
  const cells = useMemo(() => buildRack(seed), [seed])
  const [tick, setTick] = useState(0)
  const rafRef = useRef<number>()
  const startRef = useRef(performance.now())

  useEffect(() => {
    let mounted = true
    const loop = () => {
      if (!mounted) return
      setTick(performance.now() - startRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      mounted = false
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const t = (tick / 1000) * speed
  // scan beam — sweeps top→bottom every ~14s
  const sweepPeriod = 14
  const beamY = ((t % sweepPeriod) / sweepPeriod) * VBH
  const beamRow = Math.floor(((beamY - PAD_Y) / ((VBH - PAD_Y * 2) / ROWS)))

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        zIndex: 2
      }}
    >
      <defs>
        <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0"/>
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* rack vertical supports */}
      <line x1={PAD_X - 1.4} y1="0" x2={PAD_X - 1.4} y2={VBH} stroke="var(--ink)" strokeWidth="0.4" opacity="0.4"/>
      <line x1={VBW - PAD_X + 1.4} y1="0" x2={VBW - PAD_X + 1.4} y2={VBH} stroke="var(--ink)" strokeWidth="0.4" opacity="0.4"/>

      {/* shelves */}
      {Array.from({ length: ROWS + 1 }).map((_, i) => (
        <line key={i}
              x1={PAD_X - 1.4} y1={PAD_Y + i * ((VBH - PAD_Y * 2) / ROWS) - 0.7}
              x2={VBW - PAD_X + 1.4} y2={PAD_Y + i * ((VBH - PAD_Y * 2) / ROWS) - 0.7}
              stroke="var(--ink)" strokeWidth="0.25" opacity="0.25"/>
      ))}

      {/* cells */}
      {cells.map((cell, i) => {
        // is this cell "just scanned"?
        const scanT = (t + cell.scanOffset) % cell.scanFreq
        const justScanned = scanT < 1.2
        const scanAlpha = justScanned ? (scanT < 0.6 ? scanT / 0.6 : (1.2 - scanT) / 0.6) : 0
        const beamHit = cell.r === beamRow ? 0.5 : 0
        const glow = Math.max(scanAlpha, beamHit)

        return (
          <g key={i} transform={`translate(${cell.x} ${cell.y})`}>
            <CellComponent cell={cell} glow={glow} />
          </g>
        )
      })}

      {/* scan beam */}
      <rect
        x={PAD_X - 1.4}
        y={beamY - 4}
        width={VBW - PAD_X * 2 + 2.8}
        height="8"
        fill="url(#beamGrad)"
      />
    </svg>
  )
}

interface CellComponentProps {
  cell: Cell
  glow: number
}

function CellComponent({ cell, glow }: CellComponentProps) {
  const ink = "var(--ink)"
  const accent = "var(--accent)"
  const w = cell.w
  const h = cell.h

  // QR sub-grid (3x3)
  const qrSize = Math.min(h * 0.5, 4.5)
  const qrX = 1.2
  const qrY = (h - qrSize) / 2

  return (
    <g>
      {/* cage rect */}
      <rect x="0" y="0" width={w} height={h} rx="0.6"
            fill="none" stroke={ink} strokeWidth="0.3" opacity="0.55"/>

      {/* cage bars hint — vertical lines (subtle) */}
      {[0.25, 0.5, 0.75].map((p, i) => (
        <line key={i} x1={w * 0.55 + p * w * 0.35} y1="1.2" x2={w * 0.55 + p * w * 0.35} y2={h - 1.2}
              stroke={ink} strokeWidth="0.18" opacity="0.3"/>
      ))}

      {/* glow overlay when scanned */}
      {glow > 0 && (
        <rect x="0" y="0" width={w} height={h} rx="0.6"
              fill={accent} opacity={glow * 0.35}/>
      )}

      {/* QR card on the left */}
      <rect x={qrX} y={qrY} width={qrSize} height={qrSize} rx="0.2"
            fill={ink} opacity="0.12"/>
      {cell.qr.map((on, k) => {
        if (!on) return null
        const r = Math.floor(k / 3), c = k % 3
        const sz = qrSize / 3 - 0.2
        return (
          <rect key={k}
                x={qrX + 0.1 + c * (qrSize / 3)}
                y={qrY + 0.1 + r * (qrSize / 3)}
                width={sz} height={sz}
                fill={ink} opacity="0.8"/>
        )
      })}

      {/* ID label */}
      <text x={qrX + qrSize + 1.2} y={h / 2 - 0.5}
            fontSize="2.2" fontFamily="var(--mono)" fill={ink}
            opacity="0.7" letterSpacing="0.1">
        {cell.id}
      </text>

      {/* occupancy dot */}
      <circle cx={w - 1.4} cy={1.4} r="0.5"
              fill={cell.occupied ? accent : ink}
              opacity={cell.occupied ? 0.85 : 0.3}/>
    </g>
  )
}