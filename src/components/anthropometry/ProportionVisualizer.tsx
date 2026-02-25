"use client";

import { useMemo } from "react";
import { Sex } from "@/types";
import { getArchetype } from "@/lib/archetypes";
import { SEGMENT_RATIOS } from "@/lib/biomechanics/constants";

export interface VisualizerLifterState {
    height: number; // meters
    sex: Sex;
    torsoLegRatio: string; // from local types
    armLength: string; // from local types
    isCustom: boolean;
    customSegments?: {
        torso: number;
        upperArm: number;
        forearm: number;
        femur: number;
        tibia: number;
    };
}

interface ProportionVisualizerProps {
    lifter: VisualizerLifterState;
    referenceMaxHeight?: number; // For scaling relative to another lifter
    hoveredSegment: string | string[] | null;
    color: "blue" | "orange";
    className?: string; // Allow custom sizing/positioning
}

export function ProportionVisualizer({
    lifter,
    referenceMaxHeight,
    hoveredSegment,
    color,
    className = "",
}: ProportionVisualizerProps) {

    // Helper to calculate segment lengths in meters
    const getSegments = (state: VisualizerLifterState) => {
        // 1. Custom Mode
        if (state.isCustom && state.customSegments) {
            return {
                torso: state.customSegments.torso,
                femur: state.customSegments.femur,
                tibia: state.customSegments.tibia,
                arm: state.customSegments.upperArm + state.customSegments.forearm,
                upperArm: state.customSegments.upperArm,
                forearm: state.customSegments.forearm,
                totalHeight: state.height,
            };
        }

        // 2. Archetype Mode
        const archetype = getArchetype(state.torsoLegRatio, state.armLength, state.sex);
        const base = SEGMENT_RATIOS[state.sex];

        // Archetype "ratios" for femur/torso are height fractions
        // Archetype "ratios" for arm is a MULTIPLIER on the base arm length

        // Calculate lengths
        // 1. Determine raw proportional lengths based on archetype
        // We want the tibia to scale proportionally with the femur change
        const femurScale = archetype.ratios.femur / base.femur;
        const rawTibia = state.height * base.tibia * femurScale;
        const rawFemur = state.height * archetype.ratios.femur;
        const rawTorso = state.height * archetype.ratios.torso;

        // Fixed vertical components (ratios of height)
        const headNeckH = state.height * 0.13;
        const footH = state.height * base.footHeight;

        // 2. Normalize to ensure total height is exact
        // The sum of all vertical segments must equal state.height
        const currentSum = rawTorso + rawFemur + rawTibia + headNeckH + footH;
        const normalization = state.height / currentSum;

        const torso = rawTorso * normalization;
        const femur = rawFemur * normalization;
        const tibia = rawTibia * normalization;

        // Arm
        const baseArm = (base.upperArm + base.forearm + base.hand); // Include hand in total ratio for scaling
        const totalArm = state.height * baseArm * archetype.ratios.arm;

        // Distribute scaled length back to segments
        const upperArm = totalArm * (base.upperArm / baseArm);
        const forearm = totalArm * (base.forearm / baseArm);
        const hand = totalArm * (base.hand / baseArm);

        return {
            torso,
            femur,
            tibia,
            arm: totalArm,
            upperArm,
            forearm,
            hand,
            totalHeight: state.height,
        };
    };

    const segments = useMemo(() => getSegments(lifter), [lifter]);

    // Viewport Scaling
    const padding = 0;
    // If referenceMaxHeight provided, use it. Otherwise use own height + 10%
    const maxMeters = referenceMaxHeight ? referenceMaxHeight * 1.02 : segments.totalHeight * 1.02;

    // SVG Coordinates (Local coordinate system)
    const VIEW_HEIGHT = 800; // Fixed aspect ratio
    const VIEW_WIDTH = 120; // Narrower width to allow taller scaling in narrow containers
    const FLOOR_Y = 750;

    const metersToPx = (m: number) => (m / maxMeters) * (FLOOR_Y - padding);

    // Draw Logic
    const renderFigure = () => {
        const footH = metersToPx(segments.totalHeight * 0.039);
        const ankleY = FLOOR_Y - footH;
        const offsetX = VIEW_WIDTH / 2;

        const tibiaLen = metersToPx(segments.tibia);
        const femurLen = metersToPx(segments.femur);
        const torsoLen = metersToPx(segments.torso);
        const upperArmLen = metersToPx(segments.upperArm);
        const forearmLen = metersToPx(segments.forearm);
        const handLen = metersToPx(segments.hand || 0);

        // Joints
        const kneeY = ankleY - tibiaLen;
        const hipY = kneeY - femurLen;
        const shoulderY = hipY - torsoLen;

        // Shoulder Width scaling (aesthetic only)
        // Men wider shoulders (trapezoid), Women slightly narrower
        const shoulderWidth = lifter.sex === "male" ? 34 : 28;
        const hipWidth = lifter.sex === "male" ? 22 : 24;

        // Front-view joint X positions (bilateral)
        const shoulderLX = offsetX - shoulderWidth / 2;
        const shoulderRX = offsetX + shoulderWidth / 2;
        const hipLX = offsetX - hipWidth / 2;
        const hipRX = offsetX + hipWidth / 2;
        const kneeLX = hipLX;
        const kneeRX = hipRX;
        const ankleLX = hipLX;
        const ankleRX = hipRX;

        // Head
        const neckLen = metersToPx(segments.totalHeight * 0.03);
        const headDiameter = metersToPx(segments.totalHeight * 0.13); // Slightly larger for style
        const headRadius = headDiameter / 2;
        const neckBottomY = shoulderY;
        const neckTopY = neckBottomY - neckLen;
        const headY = neckTopY - headRadius;

        // Arms (Slight angle, bilateral)
        const armAngle = 0.08;
        const computeArm = (shoulderX: number, angle: number) => {
            const elbowX = shoulderX + Math.sin(angle) * upperArmLen;
            const elbowY = shoulderY + Math.cos(angle) * upperArmLen;
            const wristX = elbowX + Math.sin(angle) * forearmLen;
            const wristY = elbowY + Math.cos(angle) * forearmLen;
            const handTipX = wristX + Math.sin(angle) * handLen;
            const handTipY = wristY + Math.cos(angle) * handLen;
            return { elbowX, elbowY, wristX, wristY, handTipX, handTipY };
        };
        const rightArm = computeArm(shoulderRX, armAngle);
        const leftArm = computeArm(shoulderLX, -armAngle);

        // Colors & Gradients
        const theme = color === "blue" ? "cyan" : "orange";
        // Match the main animation palette (cyan vs pink)
        const strokeColor = color === "blue" ? "#00E5FF" : "#FF4081";
        const boneStroke = "rgba(255, 255, 255, 0.9)";

        const isHovered = (s: string) => {
            if (!hoveredSegment) return false;
            if (Array.isArray(hoveredSegment)) return hoveredSegment.includes(s);
            return hoveredSegment === s;
        };

        const getOpacity = (seg: string) => (!hoveredSegment || isHovered(seg) ? 1 : 0.15);
        const getGlowFilter = (seg: string) =>
            !hoveredSegment || isHovered(seg) ? `url(#glow-${theme})` : undefined;
        const transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";

        // Helper: Draw Tech Joint
        const TechJoint = ({ x, y, r = 3.5 }: { x: number, y: number, r?: number }) => (
            <g>
                <circle
                    cx={x} cy={y} r={r + 2}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    filter={`url(#glow-${theme})`}
                    opacity={0.55}
                />
                <circle cx={x} cy={y} r={r} fill={boneStroke} stroke={strokeColor} strokeWidth={1.25} />
            </g>
        );

        // Helper: Draw Volumetric Limb (Capsule)
        const Limb = ({ x1, y1, x2, y2, name }: { x1: number, y1: number, x2: number, y2: number, name: string }) => {
            const baseWidth = isHovered(name) ? 8 : 5;
            const glowWidth = baseWidth + 3;
            const opacity = getOpacity(name);
            const glowFilter = getGlowFilter(name);

            return (
                <g opacity={opacity} style={{ transition }}>
                    <line
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={strokeColor}
                        strokeWidth={glowWidth}
                        strokeLinecap="round"
                        filter={glowFilter}
                        opacity={0.55}
                    />
                    <line
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={boneStroke}
                        strokeWidth={baseWidth}
                        strokeLinecap="round"
                    />
                </g>
            );
        };

        return (
            <g>
                {/* Torso (Trapezoid) */}
                {/* Torso (Skeletal Style) */}
                {/* Spine */}
                <line
                    x1={offsetX} y1={neckBottomY} x2={offsetX} y2={hipY}
                    stroke={strokeColor}
                    strokeWidth={4}
                    strokeLinecap="round"
                    filter={getGlowFilter("torso")}
                    opacity={getOpacity("torso") * 0.8}
                    style={{ transition }}
                />
                <line
                    x1={offsetX} y1={neckBottomY} x2={offsetX} y2={hipY}
                    stroke={boneStroke}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={getOpacity("torso")}
                    style={{ transition }}
                />

                {/* Ribcage (Ellipse) */}
                <ellipse
                    cx={offsetX} cy={shoulderY + torsoLen * 0.35}
                    rx={shoulderWidth * 0.45} ry={torsoLen * 0.35}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={5}
                    filter={getGlowFilter("torso")}
                    opacity={getOpacity("torso") * 0.7}
                    style={{ transition }}
                />
                <ellipse
                    cx={offsetX} cy={shoulderY + torsoLen * 0.35}
                    rx={shoulderWidth * 0.45} ry={torsoLen * 0.35}
                    fill="none"
                    stroke={boneStroke}
                    strokeWidth={2}
                    opacity={getOpacity("torso")}
                    style={{ transition }}
                />

                {/* Clavicle (Front View) */}
                <Limb x1={shoulderLX} y1={shoulderY} x2={shoulderRX} y2={shoulderY} name="torso" />

                {/* Pelvis (Front View) */}
                <Limb x1={hipLX} y1={hipY} x2={hipRX} y2={hipY} name="torso" />
                <Limb x1={hipLX} y1={hipY} x2={offsetX} y2={hipY + footH * 0.5} name="torso" />
                <Limb x1={hipRX} y1={hipY} x2={offsetX} y2={hipY + footH * 0.5} name="torso" />

                {/* Legs (Front View, Bilateral) */}
                <Limb x1={hipLX} y1={hipY} x2={kneeLX} y2={kneeY} name="femur" />
                <Limb x1={kneeLX} y1={kneeY} x2={ankleLX} y2={ankleY} name="tibia" />
                <Limb x1={hipRX} y1={hipY} x2={kneeRX} y2={kneeY} name="femur" />
                <Limb x1={kneeRX} y1={kneeY} x2={ankleRX} y2={ankleY} name="tibia" />

                {/* Arms (Front View, Bilateral) */}
                <Limb x1={shoulderLX} y1={shoulderY} x2={leftArm.elbowX} y2={leftArm.elbowY} name="upperArm" />
                <Limb x1={leftArm.elbowX} y1={leftArm.elbowY} x2={leftArm.wristX} y2={leftArm.wristY} name="forearm" />
                <Limb x1={leftArm.wristX} y1={leftArm.wristY} x2={leftArm.handTipX} y2={leftArm.handTipY} name="hand" />

                <Limb x1={shoulderRX} y1={shoulderY} x2={rightArm.elbowX} y2={rightArm.elbowY} name="upperArm" />
                <Limb x1={rightArm.elbowX} y1={rightArm.elbowY} x2={rightArm.wristX} y2={rightArm.wristY} name="forearm" />
                <Limb x1={rightArm.wristX} y1={rightArm.wristY} x2={rightArm.handTipX} y2={rightArm.handTipY} name="hand" />

                {/* Neck */}
                <line
                    x1={offsetX} y1={neckBottomY} x2={offsetX} y2={neckTopY}
                    stroke={strokeColor}
                    strokeWidth={6}
                    strokeLinecap="round"
                    filter={getGlowFilter("head")}
                    opacity={getOpacity("head") * 0.75}
                    style={{ transition }}
                />
                <line
                    x1={offsetX} y1={neckBottomY} x2={offsetX} y2={neckTopY}
                    stroke={boneStroke}
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={getOpacity("head")}
                    style={{ transition }}
                />

                {/* Head (Simple Circle) */}
                <g opacity={getOpacity("head")} style={{ transition }}>
                    <circle
                        cx={offsetX} cy={headY} r={headRadius}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={Math.max(4, headRadius * 0.25)}
                        filter={getGlowFilter("head")}
                        opacity={0.6}
                    />
                    <circle
                        cx={offsetX} cy={headY} r={headRadius}
                        fill="rgba(255, 255, 255, 0.9)"
                        stroke={strokeColor}
                        strokeWidth={2}
                    />
                </g>

                {/* Tech Joints Overlay */}
                <TechJoint x={ankleLX} y={ankleY} />
                <TechJoint x={ankleRX} y={ankleY} />
                <TechJoint x={kneeLX} y={kneeY} />
                <TechJoint x={kneeRX} y={kneeY} />
                <TechJoint x={hipLX} y={hipY} r={4} />
                <TechJoint x={hipRX} y={hipY} r={4} />
                <TechJoint x={shoulderLX} y={shoulderY} r={4} />
                <TechJoint x={shoulderRX} y={shoulderY} r={4} />
                <TechJoint x={leftArm.elbowX} y={leftArm.elbowY} />
                <TechJoint x={rightArm.elbowX} y={rightArm.elbowY} />
                <TechJoint x={leftArm.wristX} y={leftArm.wristY} />
                <TechJoint x={rightArm.wristX} y={rightArm.wristY} />
            </g>
        );
    };

    return (
        <div className={`relative ${className} group`}>
            {/* Holographic Container */}
            <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full h-full drop-shadow-2xl overflow-visible">
                <defs>
                    {/* Background Grid */}
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                    </pattern>

                    {/* Neon Glow Filters */}
                    <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Volumetric Gradients */}
                    <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(0, 229, 255, 0.3)" />
                        <stop offset="100%" stopColor="rgba(0, 229, 255, 0.05)" />
                    </linearGradient>
                    <linearGradient id="grad-orange" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255, 64, 129, 0.3)" />
                        <stop offset="100%" stopColor="rgba(255, 64, 129, 0.05)" />
                    </linearGradient>

                    {/* Floor Spotlight */}
                    <radialGradient id="floor-spot-cyan" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(0, 229, 255, 0.3)" />
                        <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                    </radialGradient>
                    <radialGradient id="floor-spot-orange" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="rgba(255, 64, 129, 0.3)" />
                        <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
                    </radialGradient>
                </defs>

                {/* Grid Background */}
                <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#grid)" />

                {/* Floor Effect */}
                <ellipse
                    cx={VIEW_WIDTH / 2} cy={FLOOR_Y} rx="50" ry="12"
                    fill={`url(#floor-spot-${color === 'blue' ? 'cyan' : 'orange'})`}
                />

                {/* Tech Grid Lines (Subtle Floor) */}
                <path d={`M ${VIEW_WIDTH / 2 - 40} ${FLOOR_Y} L ${VIEW_WIDTH / 2 + 40} ${FLOOR_Y}`} stroke={color === 'blue' ? "#00E5FF" : "#FF4081"} strokeWidth={1} opacity={0.3} />

                {renderFigure()}
            </svg>
        </div>
    );
}
