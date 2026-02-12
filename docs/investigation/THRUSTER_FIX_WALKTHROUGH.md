# Thruster Animation Fix Walkthrough

## Overview
The Thruster animation utilizes an **Asymmetric Cycle** to satisfy two competing constraints:
1.  **Straight Start**: The animation must start and end with the lifter standing fully tall (Straight legs).
2.  **Fluid Upward Motion**: The transition from Squat to Press must use a **Kinematic Blend** (legs finishing extension *during* the press) to avoid a velocity pause.

## Implementation: Asymmetric Cycle

The animation cycle defines different "Top/Standing" poses depending on the *direction* of movement:

### Phase 1: Squat Down
*   **Start**: **Straight Legs** (Rack Position, fully extended).
*   **End**: Bottom of Squat.
*   *Note*: This ensures the animation loop begins in a visually clean, standing starting posture.

### Phase 2: Squat Up (Drive)
*   **Start**: Bottom of Squat.
*   **End**: **Bent Legs** (High Squat, ~11° knee bend).
*   *Note*: The squat phase deliberately *stops short* of full lockout. This maintains upward velocity at the transition point.

### Phase 3: Press Up (Push)
*   **Start**: **Bent Legs** (High Squat).
*   **End**: Overhead Lockout (Fully Extended).
*   *Note*: The kinematic blend happens here. The legs finish extending from "Bent" to "Straight" *while* the arms press. This creates the continuous "Pop" effect.

### Phase 4: Pause Top
*   Hold Lockout.

### Phase 5: Press Down (Return)
*   **Start**: Overhead Lockout.
*   **End**: **Straight Legs** (Rack Position).
*   *Note*: The return phase resets the body to the fully straight posture, ready to begin Phase 1 again.

## Technical Details (`ThrusterPoseSolver.ts`)
*   **`generateSquatPose`**: Checks `phase.phase`. If `squat_up`, targets the Bent/Blended poses. Else (for `squat_down`), targets the standard Straight/Vertical poses.
*   **`generatePressPose`**: Checks `phase.phase`. If `press_up`, interpolates from Bent $\to$ Straight. If `press_down`, interpolates from Straight $\to$ Straight (or whatever logic returns to start).

## Result
*   **Start**: Standing Tall.
*   **Motion**: Fluid, explosive upward drive.
*   **Loop**: Seamless return to standing.
