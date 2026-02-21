# 2-Path Vision Board Analysis Flow

## Context
Currently, uploading a vision board goes straight to a full deep analysis. Users need a faster option for quick feedback. Adding a path selection step after image upload: Quick Look (~5 sec) vs Full Analysis (current deep dive).

## Design

### User Flow
1. User uploads/drops image (existing behavior)
2. NEW: Path selection screen appears with two cards
3a. **Quick Look** → short analysis → results → save
3b. **Full Analysis** → full analysis → clarify → add goals → results → save

### Path Selection UI
Two glassmorphism cards side by side (stack on mobile):

**Quick Look card:**
- Title: "Quick look" / "Vista rapida"
- Description: "Your main themes and top goals in seconds" / "Tus temas y metas principales en segundos"
- Accent: lighter sage
- Time estimate: "~10 seconds"

**Full Analysis card:**
- Title: "Full analysis" / "Analisis completo"
- Description: "Deep dive with patterns, action steps, and blind spots" / "Analisis profundo con patrones, pasos y mas"
- Accent: gold (#D4BE8C)
- Time estimate: "~30 seconds"

### API Changes
`POST /api/analyze` accepts new optional `mode` field:
- `mode: "quick"` — uses QUICK_ANALYSIS_PROMPT, returns fewer fields
- `mode: "full"` (default) — current behavior

**QUICK_ANALYSIS_PROMPT returns:**
```json
{
  "summary": "1-2 sentence overview",
  "themes": ["2-3 themes"],
  "goalsWithSteps": [
    { "goal": "...", "area": "...", "steps": ["1 actionable step"], "emotionalWhy": "..." }
  ],
  "insight": "1 sentence connecting the goals"
}
```
Max 3 goals, 1 step each. No patterns, blindSpots, connections, or actionSteps.

### Upload Page Changes
- After image compression, show path selection instead of auto-analyzing
- `analysisMode` state: `"quick" | "full" | null`
- Quick path skips clarifying step (no "add goals" flow)
- Quick path goes straight: analyze → results → save
- Full path: current behavior unchanged

### Files Modified
1. `app/upload/page.tsx` — path selection UI, mode state, conditional flow
2. `app/api/analyze/route.ts` — mode parameter, QUICK_ANALYSIS_PROMPT
3. `lib/analyze-types.ts` — no changes (same type, fields optional)

### Loading Screen
Quick mode uses a simpler loading message: "Taking a quick look..." instead of the rotating messages.

## Verification
1. Upload board → see two cards → pick Quick → get results in ~5-10 sec
2. Upload board → pick Full → current flow works unchanged
3. Quick results have themes + 3 goals max
4. Full results have everything (patterns, blind spots, etc.)
5. Both modes save correctly to database
6. `npm run build` passes
7. Deploy to Vercel
