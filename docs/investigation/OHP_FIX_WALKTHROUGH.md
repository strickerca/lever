# Overhead Press (OHP) Animation Update

## Overview
The OHP animation was updated to implement a **rigid body mechanics** model with a **diagonal bar path**, as requested.
Additionally, the animation logic was updated to reflect a **Start from Bottom** (concentric-first) rep cycle, and the visual style was updated to a **strict profile view**.

## Changes Implemented

### 1. Inverse Kinematics (IK) Solver
Switched from Forward Kinematics (FK) to Inverse Kinematics (IK).
*   **Result**: This guarantees that limb lengths (`upperArm`, `forearm`) remain perfectly constant (Rigid) throughout the entire movement, regardless of the path the bar takes.

### 2. Diagonal Bar Path
Defined the movement based on the Bar positions relative to the Shoulder:
*   **Start Position (Rack)**: Defined as `(0.20m, ShoulderY + 0.05m)`. This places the bar forward of the neck/chin, resting on the front delts/clavicle area.
*   **End Position (Lockout)**: Defined as `(0, ShoulderY + ArmLength)`. This places the bar directly overhead with arms fully extended.
*   **Path**: Linear interpolation between Start and End. This creates a straight "Diagonal" line, representing the most efficient path for the bar to travel from the front rack to the overhead slot.

### 3. Elbow Positioning
Used the IK solver to find the standard "Front Rack" elbow position.
*   The solver automatically selects the solution where the **Elbow is most forward**, mimicking the "elbows forward" cue.

### 4. Phase Reversal (Concentric First)
Updated `Animator.ts` to switch OHP from `Eccentric-First` to `Concentric-First`.
*   **Old**: Start at Top -> Lower -> Press.
*   **New**: Start at Bottom (Rack) -> Press Up (Top) -> Lower (Bottom).
*   This matches the user's request for the motion to "start at the bottom then move to the top then back down".

### 5. Profile Barbell Rendering
Updated `UnifiedMovementAnimation.tsx` to render OHP as a "Profile View" movement.
*   **Previous**: Showed full barbell shaft.
*   **New**: Shows only a single weight plate (standard competition size) centered on the hand. This is accurate for a 2D side view.

## Verification Checklist

| Requirement | Status | Implementation Detail |
| :--- | :--- | :--- |
| **Rigid Segments** | ✅ | Guaranteed by IK solver using constant limb lengths. |
| **Diagonal Motion** | ✅ | Linear interpolation between Front Rack (X=0.20) and Overhead (X=0). |
| **Correct Start** | ✅ | Starts at Bottom/Rack position (Concentric-First). |
| **Correct End** | ✅ | Ends back at Bottom after full cycle. |
| **Visual Style** | ✅ | Profile view: Single plate shown, no bar shaft. |

## Visual Result
*   **0%**: Character in Front Rack (Bar at chin). 
*   **50%**: Character at Lockout (Bar overhead).
*   **100%**: Character back in Front Rack.
*   **Barbell**: Looks like a single circle (plate) traveling in a diagonal line.
