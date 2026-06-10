import Matter from 'matter-js'

const { Bodies, Constraint } = Matter

/**
 * Creates a Jansen linkage - a planar mechanism that walks
 * Returns an object with joints array and rods array
 */
export function createJansenLinkage(world, startX, startY, scale = 1) {
  // Jansen linkage proportions (scaled)
  const dims = {
    crank: 7.8 * scale,
    link1: 39 * scale,
    link2: 50 * scale,
    link3: 50 * scale,
    link4: 61.9 * scale,
    link5: 55 * scale,
    link6: 40 * scale,
    link7: 39.3 * scale,
    link8: 36.7 * scale,
    link9: 65.7 * scale,
  }

  // Joint radius
  const jointRadius = 4

  // Create joints (circular bodies)
  const joints = []
  let jointId = 0

  // Fixed pivot point A (at center)
  const A = Bodies.circle(startX, startY, jointRadius, { isStatic: true })
  joints.push({ id: jointId++, body: A, label: 'A' })

  // Crank joint (will rotate)
  const B = Bodies.circle(startX + dims.crank, startY, jointRadius, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.2,
  })
  Matter.World.addBody(world, B)
  joints.push({ id: jointId++, body: B, label: 'B' })

  // Intermediate joints
  const C = Bodies.circle(startX, startY - dims.link1, jointRadius, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.2,
  })
  Matter.World.addBody(world, C)
  joints.push({ id: jointId++, body: C, label: 'C' })

  const D = Bodies.circle(startX + dims.crank * 1.5, startY - dims.link2 * 0.8, jointRadius, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.2,
  })
  Matter.World.addBody(world, D)
  joints.push({ id: jointId++, body: D, label: 'D' })

  const E = Bodies.circle(startX - dims.crank * 0.8, startY - dims.link3, jointRadius, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.2,
  })
  Matter.World.addBody(world, E)
  joints.push({ id: jointId++, body: E, label: 'E' })

  const F = Bodies.circle(startX + dims.crank * 2, startY - dims.link4 * 0.7, jointRadius, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.2,
  })
  Matter.World.addBody(world, F)
  joints.push({ id: jointId++, body: F, label: 'F' })

  const G = Bodies.circle(startX + dims.crank * 2.5, startY + dims.link5 * 0.3, jointRadius, {
    friction: 0.5,
    frictionAir: 0.01,
    restitution: 0.2,
  })
  Matter.World.addBody(world, G)
  joints.push({ id: jointId++, body: G, label: 'G' })

  // Foot (connects to ground)
  const H = Bodies.circle(startX + dims.crank * 2.2, startY + dims.link6, jointRadius, {
    friction: 0.8,
    frictionAir: 0.02,
    restitution: 0.1,
  })
  Matter.World.addBody(world, H)
  joints.push({ id: jointId++, body: H, label: 'H' })

  // Create rigid constraints (rods)
  const rods = []
  const constraints = [
    { bodyA: A, bodyB: B, len: dims.crank, label: 'Crank (AB)' },
    { bodyA: A, bodyB: C, len: dims.link1, label: 'AC' },
    { bodyA: B, bodyB: D, len: dims.link2, label: 'BD' },
    { bodyA: C, bodyB: D, len: dims.link3, label: 'CD' },
    { bodyA: D, bodyB: E, len: dims.link4, label: 'DE' },
    { bodyA: E, bodyB: F, len: dims.link5, label: 'EF' },
    { bodyA: F, bodyB: G, len: dims.link6, label: 'FG' },
    { bodyA: G, bodyB: H, len: dims.link7, label: 'GH' },
    { bodyA: F, bodyB: H, len: dims.link8, label: 'FH' },
  ]

  constraints.forEach((c, idx) => {
    const constraint = Constraint.create({
      bodyA: c.bodyA,
      bodyB: c.bodyB,
      length: c.len,
      stiffness: 1,
    })
    Matter.World.addConstraint(world, constraint)
    rods.push({ id: idx, constraint, label: c.label })
  })

  return { joints, rods, anchor: joints[0] }
}
