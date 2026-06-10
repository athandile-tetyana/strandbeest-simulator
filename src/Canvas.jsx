import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'

const Canvas = () => {
  const { Engine, World, Bodies, Body, Events, Constraint } = Matter
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const groundRef = useRef(null)
  const [joints, setJoints] = useState([])
  const [rods, setRods] = useState([])
  const [selectedJoint, setSelectedJoint] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const nextIdRef = useRef(0)

  const JOINT_RADIUS = 8
  const WORLD_WIDTH = 1200
  const WORLD_HEIGHT = 600
  const GROUND_HEIGHT = 60

  // Initialize Matter.js world
  useEffect(() => {
    const engine = Engine.create()
    const world = engine.world
    world.gravity.y = 1
    engineRef.current = engine

    const canvas = canvasRef.current
    canvas.width = WORLD_WIDTH
    canvas.height = WORLD_HEIGHT

    // Create ground plane
    const ground = Bodies.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT - GROUND_HEIGHT / 2, WORLD_WIDTH, GROUND_HEIGHT, {
      isStatic: true,
      friction: 0.8,
      frictionStatic: 1,
    })
    World.addBody(world, ground)
    groundRef.current = ground

    // Animation loop
    const animate = () => {
      if (isPlaying) {
        Engine.update(engine)
      }

      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#e5e4e7'
      ctx.lineWidth = 1
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      // Draw ground plane
      ctx.fillStyle = '#d1d5db'
      ctx.fillRect(0, WORLD_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, GROUND_HEIGHT)
      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, WORLD_HEIGHT - GROUND_HEIGHT)
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT - GROUND_HEIGHT)
      ctx.stroke()

      // Draw rods
      ctx.strokeStyle = '#6b6375'
      ctx.lineWidth = 2
      rods.forEach((rod) => {
        const joint1 = joints.find((j) => j.id === rod.joint1)
        const joint2 = joints.find((j) => j.id === rod.joint2)
        if (joint1 && joint2) {
          ctx.beginPath()
          ctx.moveTo(joint1.body.position.x, joint1.body.position.y)
          ctx.lineTo(joint2.body.position.x, joint2.body.position.y)
          ctx.stroke()
        }
      })

      // Draw joints
      ctx.fillStyle = '#aa3bff'
      ctx.strokeStyle = selectedJoint ? '#08060d' : 'transparent'
      ctx.lineWidth = 3
      joints.forEach((joint) => {
        ctx.beginPath()
        ctx.arc(joint.body.position.x, joint.body.position.y, JOINT_RADIUS, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      // Cleanup
    }
  }, [joints, rods, isPlaying])

  // Handle canvas click for joint placement or connection
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Don't allow joints in ground area
    if (y > WORLD_HEIGHT - GROUND_HEIGHT) {
      return
    }

    // Check if clicking on existing joint
    const clickedJoint = joints.find(
      (joint) =>
        Math.hypot(joint.body.position.x - x, joint.body.position.y - y) <=
        JOINT_RADIUS * 1.5
    )

    if (clickedJoint) {
      if (selectedJoint === null) {
        // First joint selected
        setSelectedJoint(clickedJoint.id)
      } else if (selectedJoint === clickedJoint.id) {
        // Deselect
        setSelectedJoint(null)
      } else {
        // Connect two joints with a rod
        const joint1 = selectedJoint
        const joint2 = clickedJoint.id
        const rod = {
          id: nextIdRef.current++,
          joint1,
          joint2,
          constraint: Constraint.create({
            bodyA: joints.find((j) => j.id === joint1).body,
            bodyB: joint2,
            length: Math.hypot(
              joints.find((j) => j.id === joint1).body.position.x - x,
              joints.find((j) => j.id === joint1).body.position.y - y
            ),
            stiffness: 1,
          }),
        }
        World.addConstraint(engineRef.current.world, rod.constraint)
        setRods([...rods, rod])
        setSelectedJoint(null)
      }
    } else {
      // Create new joint
      const body = Bodies.circle(x, y, JOINT_RADIUS, {
        friction: 0.5,
        frictionAir: 0.02,
        restitution: 0.3,
      })
      World.addBody(engineRef.current.world, body)

      const joint = {
        id: nextIdRef.current++,
        x,
        y,
        body,
        radius: JOINT_RADIUS,
      }
      setJoints([...joints, joint])
      setSelectedJoint(null)
    }
  }

  // Handle clear all
  const handleClear = () => {
    const engine = engineRef.current
    joints.forEach((joint) => {
      World.remove(engine.world, joint.body)
    })
    rods.forEach((rod) => {
      World.removeConstraint(engine.world, rod.constraint)
    })
    setJoints([])
    setRods([])
    setSelectedJoint(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Controls */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e4e7', padding: '1rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              transition: 'background-color 0.2s',
              backgroundColor: isPlaying ? '#ef4444' : '#22c55e',
              color: '#fff',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = isPlaying ? '#dc2626' : '#16a34a'}
            onMouseLeave={(e) => e.target.style.backgroundColor = isPlaying ? '#ef4444' : '#22c55e'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              fontWeight: '600',
              cursor: 'pointer',
              border: 'none',
              transition: 'background-color 0.2s',
              backgroundColor: '#6b7280',
              color: '#fff',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            Clear
          </button>
          <div style={{ fontSize: '0.875rem', color: '#4b5563', flex: 1 }}>
            <p style={{ fontWeight: '500', margin: 0 }}>Click to place joints • Click two joints to connect with a rod</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', margin: 0 }}>Joints: {joints.length} | Rods: {rods.length}</p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            border: '2px solid #4b5563',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            cursor: 'crosshair',
            backgroundColor: '#fff',
            maxWidth: '100%',
            height: 'auto',
          }}
        />
      </div>
    </div>
  )
}

export default Canvas
