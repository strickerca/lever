# Push Up Animation Biomechanics Fix

## Problem Analysis
The user reported that the push-up animation looked incorrect:
1.  **Bottom Position (Phase 3)**: The hips and body positioning were unnatural. "Bad" images showed excessive sagging or piking.
2.  **Top Position**: The pose looked like the "Superman" extension (hands too far forward).
3.  **Reference**: "Perfect" form (Image 1) shows a vertical forearm at the bottom and a rigid body line.

## Root Cause
The previous algorithm calculated the **Bottom Position** by forcing an elbow angle of 90° and determining the shoulder position from that.
However, it placed the shoulder **BEHIND** the wrist (`wrist.x - distance`).
-   In a deep pushup (chest to floor), forcing 90° elbows requires the shoulder to be very far away horizontally from the wrist.
-   Placing the shoulder behind the wrist meant the entire body was shifted backward relative to the hands.
-   This caused the "Superman" effect at the top (hands far forward) and likely strange body angles at the bottom to satisfy the IK constraints.

## The Fix: Backward Chaining from Vertical Forearms
We refactored `PushupPoseSolver.ts` to prioritize **Vertical Forearms** at the bottom, which is the gold standard for push-up mechanics.

### 1. Vertical Forearm Constraint
Instead of assuming an elbow angle, we assumed the geometry of a perfect bottom position:
-   **Wrist**: (0,0)
-   **Forearm**: Vertical. This places the **Elbow** at `(0, forearm_length)`.
-   **Shoulder Height**: Set to `0.15m` (approximate joint height when chest is touching floor).

### 2. Forward Shoulder Placement
Using the vertical elbow and the shoulder height, we calculated where the shoulder *must* be to connect to the elbow with the Upper Arm.
-   This places the shoulder **FORWARD** of the hands (`wrist.x + offset`), which is biomechanically correct for the bottom of a pushup.

### 3. Dynamic Elbow Angle
We then reverse-calculated the "Bottom Elbow Angle" that results from this perfect geometry. It is significantly more acute (tucked) than the arbitrary 90°, allowing for full depth without breaking alignment.

### 4. Corrected Ankle Pivot
The rest of the body (Ankle position) is derived from this perfect shoulder position.
-   Since the shoulder starts forward of the hands, the arc of motion as you push up moves the shoulder **UP and BACK**.
-   This naturally lands the shoulder directly over the wrist at the top position, creating a perfect Plank (Stack) instead of a "Superman" reach.

## Visualization of Changes

| Feature | Previous Logic | New Logic |
| :--- | :--- | :--- |
| **Forearm at Bottom** | Angled Back (Hands forward of Elbow) | **Vertical** (Stacked under Elbow) |
| **Shoulder vs Hand** | Shoulder BEHIND Hand | Shoulder **FORWARD** of Hand |
| **Top Position** | "Superman" (Hands forward of shoulders) | **Plank** (Shoulders stacked over hands) |
| **Elbow Angle** | Fixed at 90° (Too open for full depth) | **Dynamic** (~30-40° depending on limb length) |

This should result in an animation that matches the reference image, with smooth transition from a forward-leaning bottom position to a stacked top position.
