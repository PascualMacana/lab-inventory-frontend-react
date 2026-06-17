import { useEffect, useRef } from "react"

// Red neuronal 3D del panel del login: malla de ~42 nodos en esfera que rota con
// perspectiva + pulsos sinápticos que viajan por las aristas y "encienden" nodos.
// Portado del handoff "Login Red Neuronal" (vizCloud) a canvas + requestAnimation
// Frame, sin librerías (proyección 3D hecha a mano). Respeta prefers-reduced-
// motion (pinta un frame estático). Se usa en el overlay de login (LandingShell)
// y en la pantalla de cambio de contraseña (LoginPage → ConstellationPanel).
export function NeuralCanvas({ className = "nn-canvas" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext("2d")!

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const AC = [90, 150, 173]
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const N = 42
    const gold = Math.PI * (3 - Math.sqrt(5))
    const names = ["α", "β", "γ", "δ", "ε"]
    const brightIdx = [3, 12, 21, 30, 39]
    const Md = 36

    type Nodo = { x: number; y: number; z: number; bright: number }
    type Punto3D = { x: number; y: number; z: number }
    type Proy = { sx: number; sy: number; depth: number; scale: number }
    type Pulso = { a: number; b: number; p: number; spd: number }

    let W = 0
    let H = 0
    let cx = 0
    let cy = 0
    let R = 0
    let FOC = 0
    let pts: Nodo[] = []
    let edges: [number, number][] = []
    let adj: number[][] = []
    let dust: Punto3D[] = []
    let pulses: Pulso[] = []
    let fire: number[] = []
    let ay = 0.4
    let t = 0
    let raf = 0
    let prevW = -1
    let prevH = -1

    // Rotación alrededor de Y (a) y X (b) + perspectiva por FOC.
    function rot(p: Punto3D, sa: number, ca: number, sb: number, cb: number): Proy {
      const x = p.x * ca - p.z * sa
      let z = p.x * sa + p.z * ca
      const y = p.y * cb - z * sb
      z = p.y * sb + z * cb
      const scale = FOC / (FOC + z + R)
      return { sx: cx + x * scale, sy: cy + y * scale, depth: (z + R) / (2 * R), scale }
    }

    function buildGeometry() {
      // Nodos en una esfera por fibonacci sphere + jitter radial determinista.
      pts = []
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2
        const rr = Math.sqrt(1 - y * y)
        const th = gold * i
        const rad = R * (0.74 + (((i * 53) % 100) / 100) * 0.34)
        pts.push({ x: Math.cos(th) * rr * rad, y: y * rad, z: Math.sin(th) * rr * rad, bright: ((i * 37) % 100) / 100 })
      }
      // Aristas: 3 vecinos más cercanos en 3D + 7 enlaces largos al azar.
      edges = []
      adj = Array.from({ length: N }, () => [] as number[])
      const seen = new Set<string>()
      const addEdge = (i: number, j: number) => {
        if (i === j) {
          return
        }
        const key = i < j ? `${i}_${j}` : `${j}_${i}`
        if (seen.has(key)) {
          return
        }
        seen.add(key)
        edges.push([i, j])
        adj[i].push(j)
        adj[j].push(i)
      }
      for (let i = 0; i < N; i++) {
        const ds: [number, number][] = []
        for (let j = 0; j < N; j++) {
          if (i !== j) {
            const dx = pts[i].x - pts[j].x
            const dy = pts[i].y - pts[j].y
            const dz = pts[i].z - pts[j].z
            ds.push([dx * dx + dy * dy + dz * dz, j])
          }
        }
        ds.sort((a, b) => a[0] - b[0])
        for (let n = 0; n < 3; n++) {
          addEdge(i, ds[n][1])
        }
      }
      for (let k = 0; k < 7; k++) {
        addEdge((Math.random() * N) | 0, (Math.random() * N) | 0)
      }
      // Polvo estelar: cáscara exterior que rota más lento (parallax).
      dust = []
      for (let i = 0; i < Md; i++) {
        const y = 1 - (i / (Md - 1)) * 2
        const rr = Math.sqrt(1 - y * y)
        const th = gold * i * 1.7 + 0.5
        const rad = R * (1.25 + (((i * 41) % 100) / 100) * 0.5)
        dust.push({ x: Math.cos(th) * rr * rad, y: y * rad, z: Math.sin(th) * rr * rad })
      }
      fire = new Array(N).fill(-1e9)
    }

    const spawnPulse = (from: number | null) => {
      let a = from
      if (a == null) {
        a = (Math.random() * N) | 0
      }
      const nb = adj[a]
      if (!nb || !nb.length) {
        return
      }
      const b = nb[(Math.random() * nb.length) | 0]
      pulses.push({ a, b, p: 0, spd: 0.013 + Math.random() * 0.012 })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const ax = 0.16 + Math.sin(ay * 0.5) * 0.14
      const sa = Math.sin(ay)
      const ca = Math.cos(ay)
      const sb = Math.sin(ax)
      const cb = Math.cos(ax)
      const da = ay * 0.45
      const dsa = Math.sin(da)
      const dca = Math.cos(da)
      for (const p of dust) {
        const proy = rot(p, dsa, dca, sb * 0.6, Math.cos(ax * 0.6))
        ctx.fillStyle = `rgba(${AC[0]},${AC[1]},${AC[2]},${(0.05 + proy.depth * 0.14).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(proy.sx, proy.sy, (0.5 + proy.depth * 0.8) * DPR, 0, Math.PI * 2)
        ctx.fill()
      }
      const proyectados = pts.map((p) => rot(p, sa, ca, sb, cb))
      for (const [i, j] of edges) {
        const a = proyectados[i]
        const b = proyectados[j]
        const d = (a.depth + b.depth) / 2
        ctx.strokeStyle = `rgba(${AC[0] + 25},${AC[1] + 28},${AC[2] + 22},${(0.08 + d * 0.34).toFixed(3)})`
        ctx.lineWidth = (0.5 + d * 1.1) * DPR
        ctx.beginPath()
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
        ctx.stroke()
      }
      const order = proyectados.map((_, i) => i).sort((i, j) => proyectados[i].depth - proyectados[j].depth)
      for (const i of order) {
        const p = proyectados[i]
        const d = p.depth
        const isB = brightIdx.indexOf(i) >= 0
        const ff = Math.max(0, 1 - (t - fire[i]) / 26)
        const r = (1.5 + d * 3.0) * DPR * (isB ? 1.55 : 1) * (1 + ff * 0.9)
        const gA = (isB ? 0.36 : 0.18) * (0.4 + d * 0.6) + ff * 0.5
        const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 5)
        grad.addColorStop(0, `rgba(${AC[0] + 50},${AC[1] + 45},${AC[2] + 40},${Math.min(0.9, gA).toFixed(3)})`)
        grad.addColorStop(1, "rgba(90,150,173,0)")
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, r * 5, 0, Math.PI * 2)
        ctx.fill()
        const coreA = Math.min(1, 0.45 + d * 0.5 + ff * 0.5)
        ctx.fillStyle =
          isB || ff > 0.4
            ? `rgba(255,255,255,${coreA.toFixed(3)})`
            : `rgba(${(185 + d * 60) | 0},${(210 + d * 40) | 0},225,${coreA.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
        ctx.fill()
        const bi = brightIdx.indexOf(i)
        // Letra griega del hub: aparece cuando el nodo mira al frente (centro de
        // la rotación) y gana tamaño/opacidad cuanto más cerca está.
        if (bi >= 0 && d > 0.45) {
          const fs = 22 * DPR
          ctx.fillStyle = `rgba(214,224,232,${Math.min(0.95, 0.4 + (d - 0.45) * 1.3).toFixed(3)})`
          ctx.font = `italic ${fs}px 'IBM Plex Serif', serif`
          ctx.fillText(names[bi], p.sx + 0.5 * fs, p.sy + 0.32 * fs)
        }
      }
      if (!reduce) {
        const next: Pulso[] = []
        for (const s of pulses) {
          s.p += s.spd
          const a = proyectados[s.a]
          const b = proyectados[s.b]
          const x = a.sx + (b.sx - a.sx) * s.p
          const y = a.sy + (b.sy - a.sy) * s.p
          const d = a.depth + (b.depth - a.depth) * s.p
          const r = (1.6 + d * 2.2) * DPR
          const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
          grad.addColorStop(0, `rgba(210,235,245,${(0.85 * (0.5 + d * 0.5)).toFixed(3)})`)
          grad.addColorStop(1, "rgba(150,200,220,0)")
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(x, y, r * 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = `rgba(255,255,255,${(0.7 * (0.5 + d * 0.5)).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(x, y, r * 0.7, 0, Math.PI * 2)
          ctx.fill()
          if (s.p >= 1) {
            fire[s.b] = t
            if (Math.random() < 0.62 && pulses.length + next.length < 7) {
              spawnPulse(s.b)
            }
          } else {
            next.push(s)
          }
        }
        pulses = next
        if (t % 26 === 0 && pulses.length < 5) {
          spawnPulse(null)
        }
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const cw = Math.max(1, Math.round(rect.width))
      const ch = Math.max(1, Math.round(rect.height))
      if (cw === prevW && ch === prevH) {
        return
      }
      prevW = cw
      prevH = ch
      canvas!.width = cw * DPR
      canvas!.height = ch * DPR
      W = canvas!.width
      H = canvas!.height
      cx = W / 2
      cy = H * 0.5
      R = Math.min(W, H) * 0.5
      FOC = W
      buildGeometry()
      if (reduce) {
        ay = 0.7
        draw()
      }
    }

    resize()
    if (reduce) {
      ay = 0.7
      draw()
    } else {
      spawnPulse(null)
      spawnPulse(null)
      const loop = () => {
        ay += 0.0017
        t++
        draw()
        raf = requestAnimationFrame(loop)
      }
      loop()
    }

    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
