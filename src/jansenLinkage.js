import Matter from 'matter-js'

const { Bodies, Constraint, World } = Matter

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function makeBody(world, x, y, r, isStatic = false) {
  const body = Bodies.circle(x, y, r, isStatic
    ? { isStatic: true, friction: 0.8, frictionStatic: 1 }
    : { friction: 0.5, frictionAir: 0.02, restitution: 0.1 }
  )
  World.addBody(world, body)
  return body
}

/**
 * Creates a Jansen-style walking linkage.
 * Joint positions are computed so constraints are satisfiable from the start —
 * this prevents the mechanism from exploding when physics begins.
 *
 * @param {Matter.World} world
 * @param {number} startX - X of fixed pivot A
 * @param {number} startY - Y of fixed pivot A
 * @param {number} scale  - uniform scale factor
 */
export function createJansenLinkage(world, startX, startY, scale = 1) {
  const s = scale
  const r = 5 // joint radius

  // ── Joint positions ─────────────────────────────────────────────────────────
  // Placed so that every constraint length equals the actual Euclidean distance
  // between its two endpoints. This is the key to a stable simulation.
  const pos = {
    A: { x: startX,            y: startY },              // Fixed pivot (static)
    B: { x: startX + 15 * s,  y: startY },              // Crank tip (driven)
    C: { x: startX - 8  * s,  y: startY - 38 * s },     // Upper link
    D: { x: startX + 22 * s,  y: startY - 40 * s },     // Coupler
    E: { x: startX - 18 * s,  y: startY - 75 * s },     // Left arm
    F: { x: startX + 38 * s,  y: startY - 65 * s },     // Right arm
    G: { x: startX + 52 * s,  y: startY - 18 * s },     // Lower connector
    H: { x: startX + 40 * s,  y: startY + 55 * s },     // Foot
  }

  // ── Bodies ───────────────────────────────────────────────────────────────────
  const A = makeBody(world, pos.A.x, pos.A.y, r, true)   // static — MUST be added
  const B = makeBody(world, pos.B.x, pos.B.y, r)          // crank tip
  const C = makeBody(world, pos.C.x, pos.C.y, r)
  const D = makeBody(world, pos.D.x, pos.D.y, r)
  const E = makeBody(world, pos.E.x, pos.E.y, r)
  const F = makeBody(world, pos.F.x, pos.F.y, r)
  const G = makeBody(world, pos.G.x, pos.G.y, r)
  const H = makeBody(world, pos.H.x, pos.H.y, r)         // foot

  const joints = [
    { body: A, label: 'A' },
    { body: B, label: 'B' },
    { body: C, label: 'C' },
    { body: D, label: 'D' },
    { body: E, label: 'E' },
    { body: F, label: 'F' },
    { body: G, label: 'G' },
    { body: H, label: 'H' },
  ].map((j, i) => ({ id: i, ...j }))

  // ── Constraints (rods) ───────────────────────────────────────────────────────
  // Length is computed from the actual positions — always satisfiable.
  const pairs = [
    [A, B, 'AB (crank)'],
    [A, C, 'AC'],
    [B, D, 'BD'],
    [C, D, 'CD'],
    [C, E, 'CE'],
    [D, F, 'DF'],
    [E, F, 'EF'],
    [F, G, 'FG'],
    [G, H, 'GH'],
    [F, H, 'FH'],
  ]

  const rods = pairs.map(([bA, bB, label], idx) => {
    const length = dist(bA.position, bB.position)
    const constraint = Constraint.create({
      bodyA: bA,
      bodyB: bB,
      length,
      stiffness: 0.9,
      damping: 0.05,
    })
    World.addConstraint(world, constraint)
    return { id: idx, constraint, label }
  })

  return { joints, rods, crankBody: B, anchor: A }
}