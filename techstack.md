# Tech Stack — Strandbeest Simulator

## Environment
- Platform: GitHub Codespaces
- Runtime: Node.js 20
- Package Manager: npm

## Frontend
- Framework: React + Vite
- Port: 5173 (bind: 0.0.0.0)
- Physics: Matter.js
- Canvas: HTML5 Canvas via react-konva or direct canvas API
- Styling: Tailwind CSS

## Backend (optional Phase 2)
- Framework: Express.js
- Port: 3000 (bind: 0.0.0.0)
- Purpose: Save/load designs

## Database (Phase 2)
- Provider: Supabase
- Table: designs (id, user_id, joints_json, created_at)

## Conventions
- Commit format: feat: / fix: / spec: / chore:
- No new dependencies without asking
- Env vars in .env.example