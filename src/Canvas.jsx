import { useEffect, useRef, useState, useCallback } from 'react'
import Matter from 'matter-js'
import { createJansenLinkage } from './jansenLinkage'

const JOINT_RADIUS = 8
const WORLD_WIDTH  = 1200
const WORLD_HEIGHT = 600
const GROUND_HEIGHT = 60

const Canvas = () => {
  // ── Refs (readable inside animation loop without stale closures) ─────────────
  const canvasRef      = useRef(null)
  const engineRef      = useRef(null)
  const rafRef         = useRef(null)
  const isPlayingRef   = useRef(false)
  const jointsRef      = useRef([])
  const rodsRef        = useRef([])
  const selectedRef    = useRef(null)   // selected joint id
  const crankBodyRef   = useRef(null)
  const crankSpeedRef  = useRef(0.025)
  const groundRef      = useRef(null)
  const nextIdRef      = useRef(0)

  // ── State (UI only — not read inside animation loop) ─────────────────────────
  const [isPlaying,  setIsPlaying]  = useState(false)
  const [crankSpeed, setCrankSpeed] = useState(0.025)
  const [counts,     setCounts]     = useState({ joints: 0, rods: 0 })

  // ── Single animation loop — runs once on mount ────────────────────────────────
  useEffect(() => {
    const engine = Matter.Engine.create()
    engine.world.gravity.y = 1
    engineRef.current = engine

    const canvas = canvasRef.current
    canvas.width  = WORLD_WIDTH
    canvas.height = WORLD_HEIGHT

    // Ground plane
    const ground = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - GROUND_HEIGHT / 2,
      WORLD_WIDTH * 3,
      GROUND_HEIGHT,
      { isStatic: true, friction: 0.9, frictionStatic: 1 }
    )
    Matter.World.addBody(engine.world, ground)
    groundRef.current = ground

    const animate = () => {
      const ctx = canvas.getContext('2d')

      // ── Physics step ────────────────────────────────────────────────────────
      if (isPlayingRef.current) {
        // Drive the crank by setting angular velocity
        if (crankBodyRef.current) {
          Matter.Body.setAngularVelocity(crankBodyRef.current, crankSpeedRef.current * 8)
        }
        Matter.Engine.update(engine, 1000 / 60)
      }

      // ── Clear ───────────────────────────────────────────────────────────────
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT)

      // ── Ground ──────────────────────────────────────────────────────────────
      ctx.fillStyle = '#d1d5db'
      ctx.fillRect(0, WORLD_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, GROUND_HEIGHT)
      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, WORLD_HEIGHT - GROUND_HEIGHT)
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT - GROUND_HEIGHT)
      ctx.stroke()

      // ── Rods ────────────────────────────────────────────────────────────────
      ctx.strokeStyle = '#4b5563'
      ctx.lineWidth = 3
      rodsRef.current.forEach(rod => {
        ctx.beginPath()
        if (rod.constraint) {
          // Jansen rod — bodyA/bodyB are direct Matter.js body references
          const { x: ax, y: ay } = rod.constraint.bodyA.position
          const { x: bx, y: by } = rod.constraint.bodyB.position
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
        } else {
          // Manually drawn rod — uses joint ids
          const j1 = jointsRef.current.find(j => j.id === rod.joint1)
          const j2 = jointsRef.current.find(j => j.id === rod.joint2)
          if (j1 && j2) {
            ctx.moveTo(j1.body.position.x, j1.body.position.y)
            ctx.lineTo(j2.body.position.x, j2.body.position.y)
          }
        }
        ctx.stroke()
      })

      // ── Joints ──────────────────────────────────────────────────────────────
      jointsRef.current.forEach(joint => {
        const { x, y } = joint.body.position
        const isSelected = selectedRef.current === joint.id
        ctx.beginPath()
        ctx.arc(x, y, JOINT_RADIUS, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? '#f59e0b' : '#8b5cf6'
        ctx.fill()
        if (joint.label) {
          ctx.fillStyle = '#1f2937'
          ctx.font = 'bold 11px monospace'
          ctx.fillText(joint.label, x + 10, y - 6)
        }
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, []) // ← empty deps — loop starts once and never restarts

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleTogglePlay = () => {
    isPlayingRef.current = !isPlayingRef.current
    setIsPlaying(isPlayingRef.current)
  }

  const handleSpeedChange = (e) => {
    const val = parseFloat(e.target.value)
    crankSpeedRef.current = val
    setCrankSpeed(val)
  }

  const handleClear = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    
    // Nuclear clear — removes everything from the world
    Matter.World.clear(engine.world, false)
    Matter.Engine.clear(engine)
    
    // Re-add ground since we wiped everything
    Matter.World.addBody(engine.world, groundRef.current)
    
    jointsRef.current = []
    rodsRef.current = []
    selectedRef.current = null
    crankBodyRef.current = null
    setCounts({ joints: 0, rods: 0 })
  }, [])

  const handleLoadJansen = useCallback(() => {
    handleClear()
    const engine = engineRef.current
    const result = createJansenLinkage(
      engine.world,
      300,
      WORLD_HEIGHT - GROUND_HEIGHT - 100,
      2
    )
    const mappedJoints = result.joints.map(j => ({
      id: nextIdRef.current++,
      body: j.body,
      label: j.label,
    }))
    const mappedRods = result.rods.map(r => ({
      id: nextIdRef.current++,
      constraint: r.constraint,
      label: r.label,
    }))

    // Store crank body reference for driving
    crankBodyRef.current = result.crankBody

    jointsRef.current = mappedJoints
    rodsRef.current   = mappedRods
    setCounts({ joints: mappedJoints.length, rods: mappedRods.length })
  }, [handleClear])

  const handleCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    // Scale click coords to canvas resolution
    const scaleX = WORLD_WIDTH  / rect.width
    const scaleY = WORLD_HEIGHT / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top)  * scaleY

    if (y > WORLD_HEIGHT - GROUND_HEIGHT) return

    const joints = jointsRef.current
    const hit = joints.find(j =>
      Math.hypot(j.body.position.x - x, j.body.position.y - y) <= JOINT_RADIUS * 2
    )

    if (hit) {
      const sel = selectedRef.current
      if (sel === null) {
        selectedRef.current = hit.id
      } else if (sel === hit.id) {
        selectedRef.current = null
      } else {
        // Connect sel → hit with a rigid rod
        const j1 = joints.find(j => j.id === sel)
        const length = Math.hypot(
          j1.body.position.x - hit.body.position.x,
          j1.body.position.y - hit.body.position.y
        )
        const constraint = Matter.Constraint.create({
          bodyA: j1.body, bodyB: hit.body,
          length, stiffness: 1,
        })
        Matter.World.addConstraint(engineRef.current.world, constraint)
        rodsRef.current = [...rodsRef.current, {
          id: nextIdRef.current++,
          joint1: sel, joint2: hit.id,
          constraint,
        }]
        selectedRef.current = null
        setCounts(c => ({ ...c, rods: rodsRef.current.length }))
      }
    } else {
      // Place new joint
      const body = Matter.Bodies.circle(x, y, JOINT_RADIUS, {
        friction: 0.5, frictionAir: 0.02, restitution: 0.3,
      })
      Matter.World.addBody(engineRef.current.world, body)
      jointsRef.current = [...jointsRef.current, { id: nextIdRef.current++, body }]
      selectedRef.current = null
      setCounts(c => ({ ...c, joints: jointsRef.current.length }))
    }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb' }}>

      {/* Controls */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>

          <button onClick={handleTogglePlay} style={{
            padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '700',
            border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.9rem',
            background: isPlaying ? '#ef4444' : '#22c55e',
          }}>
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <button onClick={handleClear} style={{
            padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600',
            border: 'none', cursor: 'pointer', color: '#fff', background: '#6366f1',
          }}>
            🧹 Clear
          </button>

          <button onClick={handleLoadJansen} style={{
            padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: '600',
            border: 'none', cursor: 'pointer', color: '#fff', background: '#8b5cf6',
          }}>
            🦾 Load Jansen Leg
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>Speed:</label>
            <input
              type="range" min="0.005" max="0.08" step="0.005"
              value={crankSpeed} onChange={handleSpeedChange}
              style={{ width: '110px' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#6b7280', minWidth: '38px' }}>
              {crankSpeed.toFixed(3)}
            </span>
          </div>

          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Joints: {counts.joints} · Rods: {counts.rods}
          </span>

          <span style={{ fontSize: '0.8rem', color: '#9ca3af', marginLeft: 'auto' }}>
            Click canvas to place joints · Click two joints to connect
          </span>

        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            border: '2px solid #4b5563',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            cursor: 'crosshair',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>

    </div>
  )
}

export default Canvas