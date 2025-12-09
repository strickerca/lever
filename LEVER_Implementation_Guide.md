# LEVER Implementation Guide
## Step-by-Step Instructions for Claude Code

---

# Overview

This guide provides the exact steps and prompts to use with Claude Code to build LEVER from the Master Specification. Follow these phases in order.

---

# Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- npm or yarn
- A code editor (VS Code recommended)
- Claude Code access

---

# Phase 0: Project Setup

## Step 1: Create Next.js Project

```bash
npx create-next-app@latest lever --typescript --tailwind --eslint --app --src-dir
cd lever
```

## Step 2: Install Dependencies

```bash
npm install zustand @radix-ui/react-slider @radix-ui/react-select lucide-react
npm install -D @types/node
```

## Step 3: Configure TypeScript (tsconfig.json)

Ensure strict mode is enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

# Phase 1: Core Domain Layer

## Prompt for Claude Code:

```
I'm building LEVER, a biomechanical lift comparison app. 

Create the following files based on the attached specification:

1. src/types/index.ts - All TypeScript interfaces including:
   - Point2D, SegmentLengths, DerivedAnthropometry, MobilityProfile, Anthropometry
   - KinematicSolution, LiftMetrics, ComparisonResult
   - All enums (Sex, AnthropometryMode, LiftFamily, etc.)

2. src/lib/biomechanics/constants.ts - All constants including:
   - GRAVITY = 9.81
   - SEGMENT_RATIOS (male/female)
   - EFFECTIVE_MASS_FACTORS
   - BAR_POSITIONS (highBar, lowBar, front)
   - GRIP_FACTORS
   - DEFAULT_MOBILITY

Use the exact values from the specification. Export everything as named exports.
```

## Expected Output:
- `src/types/index.ts` (~150 lines)
- `src/lib/biomechanics/constants.ts` (~100 lines)

## Verification:
```bash
npx tsc --noEmit
```

---

# Phase 2: Anthropometry Service

## Prompt for Claude Code:

```
Create src/lib/biomechanics/anthropometry.ts with:

1. createSimpleProfile(height: number, mass: number, sex: Sex): Anthropometry
   - Apply standard segment ratios from SEGMENT_RATIOS
   - Compute derived values (totalArm, totalLeg, femurTorsoRatio, etc.)
   - Use DEFAULT_MOBILITY

2. createAdvancedProfile(height, mass, sex, sdModifiers): Anthropometry
   - Apply SD multiplier formula: 1 + (SD × 0.045)
   - Call normalizeToHeight after applying modifiers

3. normalizeToHeight(segments: SegmentLengths, targetHeight: number): SegmentLengths
   - If segments don't sum to height (within 2%), scale proportionally
   - Keep headNeck fixed, scale femur/tibia/footHeight/torso

4. computeDerivedAnthropometry(segments, height): DerivedAnthropometry
   - totalArm = upperArm + forearm + hand
   - totalLeg = femur + tibia + footHeight
   - cruralIndex = tibia / femur
   - femurTorsoRatio = femur / torso
   - apeIndex = (2 * totalArm + 0.36 * torso) / height  // 0.36 calibrated so average = 1.0
   - acromionHeight = femur + tibia + footHeight + torso
   - hipHeight = femur + tibia + footHeight

5. validateAnthropometry(profile): { valid: boolean; errors: string[] }
   - Check height 1.4-2.2m
   - Check mass 40-200kg
   - Check segments sum to height ±5%

Import types from '../types' and constants from './constants'.
```

## Verification Test:

```typescript
// Quick test
const profile = createSimpleProfile(1.80, 80, Sex.MALE);
console.log(profile.segments.femur); // Should be ~0.441m (0.245 × 1.80)
console.log(profile.derived.totalArm); // Should be ~0.792m
```

---

# Phase 3: Kinematic Solver (CRITICAL)

## Prompt for Claude Code:

```
Create src/lib/biomechanics/kinematics.ts with the squat kinematic solver.

This is the MOST CRITICAL component. The solver must:
1. Iterate to find trunk angle that satisfies bar-over-midfoot equilibrium
2. Start with max ankle dorsiflexion, reduce by 2° until valid solution
3. A valid solution has trunk angle between 20° and 80°

Function: solveSquatKinematics(anthropometry: Anthropometry, variant: 'highBar' | 'lowBar' | 'front'): KinematicSolution

Algorithm:
1. Get bar offset from BAR_POSITIONS[variant]
2. Set θ_femur = 0 (parallel depth)
3. Set α = maxAnkleDorsiflexion (from mobility profile)
4. While α >= 10 and no solution:
   a. Calculate knee position: x = L_tibia × sin(α), y = L_tibia × cos(α)
   b. Calculate hip position: x = knee.x - L_femur × cos(θ_femur), y = knee.y + L_femur × sin(θ_femur)
   c. Solve for trunk angle: sin(θ_trunk) = (-hip.x - barOffset.horizontal/100) / L_torso
   d. If |sin(θ_trunk)| <= 1 and 20 <= θ_trunk <= 80:
      - Calculate shoulder: x = hip.x + L_torso × sin(θ_trunk), y = hip.y + L_torso × cos(θ_trunk)
      - Calculate bar: x = shoulder.x + barOffset.horizontal/100, y = shoulder.y + barOffset.vertical/100
      - Calculate moment arms: hip = |bar.x - hip.x|, knee = |bar.x - knee.x|
      - Calculate displacement: Y_stand - bar.y (where Y_stand = hipHeight + L_torso + barOffset.vertical/100)
      - Return valid solution
   e. α -= 2

5. If no solution found, return fallback with displacement = 0.37 × height, valid = false

Helper functions needed:
- toRadians(degrees: number): number
- toDegrees(radians: number): number

Return KinematicSolution with all positions, angles, momentArms, displacement, valid flag, mobilityLimited flag.
```

## Verification Tests:

```typescript
// Test 1: Identity - same anthropometry should produce consistent results
const profile = createSimpleProfile(1.80, 80, Sex.MALE);
const kin1 = solveSquatKinematics(profile, 'highBar');
const kin2 = solveSquatKinematics(profile, 'highBar');
console.log(kin1.displacement === kin2.displacement); // true

// Test 2: Valid solution
console.log(kin1.valid); // true
console.log(kin1.angles.trunk > 20 && kin1.angles.trunk < 80); // true

// Test 3: Bar over midfoot
console.log(Math.abs(kin1.positions.bar.x) < 0.01); // true (close to 0)

// Test 4: Long femur = more forward lean
const shortFemur = createAdvancedProfile(1.80, 80, Sex.MALE, { legs: -2, torso: 2, arms: 0 });
const longFemur = createAdvancedProfile(1.80, 80, Sex.MALE, { legs: 2, torso: -2, arms: 0 });
const kinShort = solveSquatKinematics(shortFemur, 'highBar');
const kinLong = solveSquatKinematics(longFemur, 'highBar');
console.log(kinLong.angles.trunk < kinShort.angles.trunk); // true (more lean)
console.log(kinLong.momentArms.hip > kinShort.momentArms.hip); // true (larger moment arm)
```

---

# Phase 4: Physics Engine

## Prompt for Claude Code:

```
Create src/lib/biomechanics/physics.ts with work and displacement calculations.

Functions needed:

1. calculateEffectiveMass(load: number, bodyMass: number, family: LiftFamily, sex: Sex): number
   - Use EFFECTIVE_MASS_FACTORS
   - Squat: load + factor × bodyMass
   - Deadlift: load + factor × bodyMass  
   - Bench/OHP: load only
   - Pullup: bodyMass + load
   - Pushup: factor × bodyMass

2. calculateSquatWork(anthropometry, variant, load, reps): LiftMetrics
   - Get kinematics from solveSquatKinematics
   - M_eff = calculateEffectiveMass(...)
   - workPerRep = GRAVITY × displacement × M_eff
   - totalWork = workPerRep × reps
   - demandFactor = momentArms.hip × Math.sqrt(displacement)
   - scoreP4P = totalWork / Math.pow(bodyMass, 0.67)

3. calculateDeadliftDisplacement(anthropometry, variant: 'conventional' | 'sumo'): number
   - Conventional: acromionHeight - totalArm - 0.225 (plate radius)
   - Sumo: conventional × 0.85

4. calculateDeadliftWork(anthropometry, variant, load, reps): LiftMetrics

5. calculateBenchDisplacement(anthropometry, gripWidth, archStyle): number
   - totalArm × cos(gripAngle) - chestDepth - archHeight
   - gripAngles: narrow=5°, medium=15°, wide=25°
   - archHeights: flat=0.02, moderate=0.05, competitive=0.08, extreme=0.12
   - Clamp minimum to 0.05m

6. calculateBenchWork(anthropometry, gripWidth, archStyle, load, reps): LiftMetrics

7. calculatePullupDisplacement(anthropometry): number
   - totalArm × 0.95

8. calculatePullupWork(anthropometry, grip, addedLoad, reps): LiftMetrics
   - Include VPI calculation
   - gripFactors: supinated=1.0, neutral=1.08, pronated=1.15

9. calculatePushupWork(anthropometry, reps): LiftMetrics
   - displacement = upperArm + forearm
   - M_eff = 0.72 × bodyMass

10. calculateOHPDisplacement(anthropometry): number
    - (upperArm + forearm) × 0.95

11. calculateOHPWork(anthropometry, load, reps): LiftMetrics
    - M_eff = load only (body supported)

12. calculateThrusterWork(anthropometry, load, reps): LiftMetrics
    - displacement = squat_displacement + OHP_displacement
    - M_eff ≈ load + 0.50 × bodyMass (simplified)
```

## Verification:

```typescript
const profile = createSimpleProfile(1.80, 80, Sex.MALE);

// Squat
const squat = calculateSquatWork(profile, 'highBar', 100, 5);
console.log(squat.workPerRep > 500); // Should be ~600-700J
console.log(squat.totalWork === squat.workPerRep * 5); // true

// Deadlift - long arms = less work
const shortArms = createAdvancedProfile(1.80, 80, Sex.MALE, { arms: -2, legs: 0, torso: 0 });
const longArms = createAdvancedProfile(1.80, 80, Sex.MALE, { arms: 2, legs: 0, torso: 0 });
const dlShort = calculateDeadliftWork(shortArms, 'conventional', 100, 1);
const dlLong = calculateDeadliftWork(longArms, 'conventional', 100, 1);
console.log(dlLong.workPerRep < dlShort.workPerRep); // true (less ROM)
```

---

# Phase 5: Comparison Engine

## Prompt for Claude Code:

```
Create src/lib/biomechanics/comparison.ts with the comparison pipeline.

Main function:
compareLifts(
  lifterA: { anthropometry: Anthropometry; name?: string },
  lifterB: { anthropometry: Anthropometry; name?: string },
  liftFamily: LiftFamily,
  variantA: string,
  variantB: string,
  performanceA: { load: number; reps: number }
): ComparisonResult

Pipeline:
1. Compute metrics for Lifter A using appropriate calculate*Work function
2. Compute kinematics/displacement for Lifter B
3. Calculate demand factors:
   - For squat: demandFactor = momentArms.hip × sqrt(displacement)
   - For others: demandFactor = displacement
4. Solve for equivalent load: Load_A × (demandA / demandB)
5. Solve for equivalent reps: ceil(totalWork_A / workPerRep_B)
6. Generate comparison ratios

Helper function:
generateExplanations(anthroA, anthroB, family, comparison): string[]
- If displacement differs: "Lifter A/B moves the bar X% further"
- If moment arm differs (squat): "Lifter A/B has X% larger hip moment arm"
- If arm length differs (deadlift): "Lifter A/B has Xcm longer arms"
- Summary: "Overall, Lifter A/B has X% mechanical advantage"

Also create:
compareCrossLift(anthropometry, family, variantA, variantB, load): { conversionFactor: number; equivalentLoad: number }
- Compare same lifter doing different variants (e.g., high bar vs low bar)
```

## Verification:

```typescript
const lifterA = { anthropometry: createSimpleProfile(1.70, 70, Sex.MALE) };
const lifterB = { anthropometry: createSimpleProfile(1.90, 90, Sex.MALE) };

// Identity test
const result1 = compareLifts(lifterA, lifterA, LiftFamily.SQUAT, 'highBar', 'highBar', { load: 100, reps: 5 });
console.log(Math.abs(result1.comparison.demandRatio - 1.0) < 0.001); // true
console.log(Math.abs(result1.lifterB.equivalentLoad - 100) < 0.5); // true

// Taller lifter does more work
const result2 = compareLifts(lifterA, lifterB, LiftFamily.SQUAT, 'highBar', 'highBar', { load: 100, reps: 5 });
console.log(result2.lifterA.metrics.workPerRep < result2.lifterB.metrics?.workPerRep); // true
```

---

# Phase 6: UI Components

## Prompt for Claude Code:

```
Create React components for LEVER using Next.js App Router and Tailwind CSS.

1. src/components/anthropometry/HeightWeightInput.tsx
   - Height input with unit toggle (cm/inches)
   - Weight input with unit toggle (kg/lbs)
   - Sex dropdown
   - Controlled component with onChange callback

2. src/components/anthropometry/SDSliders.tsx
   - Three sliders for Arms, Legs, Torso (-3 to +3)
   - Labels at each position (e.g., "T-Rex" for -3 Arms, "Average" for 0)
   - Slider from @radix-ui/react-slider
   - Shows multiplier value (e.g., "0.865×" for -3)

3. src/components/comparison/LiftSelector.tsx
   - Dropdown for lift family (Squat, Deadlift, Bench, etc.)
   - Conditional variant selector based on family
   - Load and reps inputs

4. src/components/comparison/ResultsDisplay.tsx
   Props: { result: ComparisonResult }
   Shows:
   - Work comparison (two horizontal bars)
   - P4P scores
   - Equivalent load: "Your 100kg = Their 115kg"
   - Advantage percentage with color coding

5. src/components/comparison/ExplanationCards.tsx
   - Map over explanations array
   - Color code by impact (advantage_A = blue, advantage_B = orange)

Style with Tailwind. Use a clean, modern design with:
- Rounded corners (rounded-lg)
- Subtle shadows (shadow-sm)
- Blue (#2563EB) for Lifter A, Orange (#EA580C) for Lifter B
- Proper spacing (space-y-4, p-4)
```

---

# Phase 7: Stick Figure Visualization

## Prompt for Claude Code:

```
Create src/components/visualization/StickFigure.tsx

A canvas-based component that visualizes the squat position using kinematics data.

Props:
interface StickFigureProps {
  kinematicsA: KinematicSolution;
  kinematicsB?: KinematicSolution;
  heightA: number;
  heightB?: number;
  showMomentArms?: boolean;
}

Implementation:
1. Use useRef for canvas element
2. Use useEffect to draw when kinematics change
3. Scale to fit canvas (calculate scale from max height)

Drawing function:
- Draw two figures side by side if kinematicsB provided
- Convert positions to canvas coords: x = offsetX + pos.x × scale, y = offsetY - pos.y × scale

Draw for each figure:
1. Floor line (gray)
2. Midfoot reference (dashed green vertical)
3. Segments as thick lines:
   - Tibia: ankle to knee
   - Femur: knee to hip
   - Torso: hip to shoulder
4. Joints as circles at ankle, knee, hip, shoulder
5. Bar as filled circle
6. If showMomentArms: dashed red horizontal line from hip to bar.x

Colors:
- Lifter A: #2563EB (blue)
- Lifter B: #EA580C (orange)
- Moment arm: #DC2626 (red)
- Midfoot line: #22C55E (green)

Add labels above each figure ("Lifter A", "Lifter B")
Add angle annotation for trunk angle
```

---

# Phase 8: Main Pages

## Prompt for Claude Code:

```
Create the main pages for LEVER:

1. src/app/page.tsx (Landing Page)
   - Hero section with tagline: "Finally, Fair Lift Comparisons"
   - Brief explanation of the problem LEVER solves
   - CTA button to Quick Compare
   - Feature cards: Work Calculation, Moment Arm Analysis, Equivalent Load

2. src/app/compare/quick/page.tsx
   - Two-column layout for Lifter A and Lifter B
   - HeightWeightInput for each
   - Single LiftSelector (same lift for both)
   - Load/reps for Lifter A only
   - "Compare" button
   - ResultsDisplay below
   - StickFigure visualization

3. src/app/compare/detailed/page.tsx (can be placeholder for now)
   - Same as quick but with:
   - SDSliders for advanced anthropometry
   - Mobility inputs
   - Cross-lift comparison option

4. src/app/how-it-works/page.tsx
   - Explanation of the physics
   - Visual examples of the equilibrium constraint
   - Why moment arms matter
   - How equivalent load is calculated

Use a consistent layout with:
- Max width container (max-w-6xl mx-auto)
- Proper padding (px-4 py-8)
- Responsive grid (grid-cols-1 md:grid-cols-2)
```

---

# Phase 9: State Management & Polish

## Prompt for Claude Code:

```
Add state management and final polish:

1. src/store/index.ts (using Zustand)
   - currentProfile: UserProfile | null
   - comparisonHistory: ComparisonResult[]
   - unitPreference: 'metric' | 'imperial'
   - Actions: setProfile, addComparison, setUnits

2. Add localStorage persistence for:
   - User profile
   - Unit preference

3. Add loading states:
   - Skeleton loaders for results
   - Disabled state for Compare button while calculating

4. Add error handling:
   - Validation errors displayed inline
   - Toast notifications for calculation errors
   - Fallback UI for kinematic solver failures

5. Make responsive:
   - Stack columns on mobile
   - Adjust font sizes
   - Touch-friendly inputs

6. Add analytics events (console.log for now):
   - 'comparison_started'
   - 'comparison_completed'
   - 'profile_created'
```

---

# Phase 10: Testing

## Prompt for Claude Code:

```
Create test files:

1. src/lib/biomechanics/__tests__/anthropometry.test.ts
   - Test createSimpleProfile produces correct segment lengths
   - Test SD modifiers apply correctly (+2 SD = 1.09× multiplier)
   - Test normalizeToHeight fixes sum discrepancy

2. src/lib/biomechanics/__tests__/kinematics.test.ts
   - Identity test: same input = same output
   - Long femur test: more forward lean, larger moment arm
   - Mobility test: 0° dorsiflexion = mobilityLimited

3. src/lib/biomechanics/__tests__/comparison.test.ts
   - Identity: same lifter = ratio 1.0
   - Taller lifter does more work
   - Equivalent load scales correctly

4. src/lib/biomechanics/__tests__/golden.test.ts
   Golden tests from spec:
   - 170cm vs 190cm: taller does ~18% more work
   - Long femur: ~12% higher demand
   - Long arms: ~5% less deadlift ROM
   - Sumo vs Conv: ~15-20% less work

Use Jest or Vitest. Each test should be self-contained.
```

---

# Deployment

## Vercel Deployment

1. Push to GitHub
2. Connect to Vercel
3. Deploy

## Environment Variables (if needed)
- None required for core functionality

## Post-Deployment Checklist
- [ ] All calculations produce reasonable values
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Lighthouse score > 90

---

# Troubleshooting

## Common Issues

### Kinematic Solver Returns Invalid
- Check that ankle dorsiflexion is reasonable (15-35°)
- Verify segment lengths sum to height
- Check bar position offsets are in cm, not m

### NaN in Work Calculations
- Ensure all inputs are numbers, not strings
- Check for division by zero in P4P calculation
- Verify displacement is positive

### Stick Figure Not Drawing
- Check canvas ref is attached
- Verify scale is positive and reasonable
- Check that positions are in meters, not cm

---

# Summary

Follow these phases in order:
1. **Types & Constants** - Foundation
2. **Anthropometry** - User data
3. **Kinematics** - CRITICAL solver
4. **Physics** - Work calculations
5. **Comparison** - Core logic
6. **UI Components** - Interface
7. **Visualization** - Stick figure
8. **Pages** - App structure
9. **State & Polish** - Final touches
10. **Testing** - Verification

Each phase builds on the previous. Test thoroughly before moving on.

Good luck building LEVER! 🏋️
