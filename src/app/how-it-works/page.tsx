import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How LEVER Works
          </h1>
          <p className="text-xl text-gray-600">
            The physics and biomechanics behind fair lift comparisons
          </p>
        </div>

        {/* Section 1: The Physics */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            1. Work Calculation
          </h2>
          <div className="space-y-4 text-gray-700">
            <p className="text-lg">
              In physics, <strong>work</strong> is defined as force applied over a
              distance:
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="font-mono text-xl text-center">
                Work = Force × Distance
              </p>
              <p className="text-center text-sm text-gray-600 mt-2">
                or W = F × d (measured in Joules)
              </p>
            </div>
            <p>
              For lifting, force is the weight being moved (mass × gravity), and
              distance is how far the bar travels. A taller person with longer
              limbs moves the bar further, doing more work for the same load.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">Example:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  Lifter A (5'7"): Squats 315 lbs, bar moves 0.58m →{" "}
                  <strong>825 Joules</strong>
                </li>
                <li>
                  Lifter B (6'3"): Squats 315 lbs, bar moves 0.68m →{" "}
                  <strong>969 Joules</strong>
                </li>
                <li className="text-blue-600 font-semibold">
                  Lifter B does 17% more work for the same weight!
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Moment Arms */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            2. Moment Arms Matter
          </h2>
          <div className="space-y-4 text-gray-700">
            <p className="text-lg">
              It's not just about <em>how far</em> you move the bar—it's also
              about <em>how hard</em> it is to move it.
            </p>
            <p>
              In a squat, your hip muscles must generate torque to extend your
              hips. The torque required depends on the <strong>moment arm</strong>
              : the horizontal distance from your hip joint to the bar.
            </p>
            <div className="bg-orange-50 border-l-4 border-orange-600 p-4 rounded">
              <p className="font-mono text-xl text-center">
                Torque = Force × Moment Arm
              </p>
              <p className="text-center text-sm text-gray-600 mt-2">
                Larger moment arm = more torque needed = harder lift
              </p>
            </div>
            <p>
              Longer femurs push your hips further back at depth, increasing the
              horizontal distance between your hip and the bar. This creates a
              larger moment arm and makes the lift harder.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">Example:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  Short femur lifter: Hip moment arm = 0.20m
                </li>
                <li>
                  Long femur lifter: Hip moment arm = 0.24m (20% larger)
                </li>
                <li className="text-orange-600 font-semibold">
                  Long femur lifter needs 20% more hip torque!
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 3: Equilibrium Constraint */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            3. The Bar-Over-Midfoot Constraint
          </h2>
          <div className="space-y-4 text-gray-700">
            <p className="text-lg">
              To squat without falling over, the bar must stay balanced over your
              midfoot. This is called the <strong>equilibrium constraint</strong>.
            </p>
            <p>
              LEVER uses an iterative kinematic solver to find your exact body
              position at parallel depth while keeping the bar over midfoot. The
              solver:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Positions your ankle at the origin (midfoot)</li>
              <li>Places your femur parallel to the ground (parallel depth)</li>
              <li>
                Iterates through ankle angles to find a valid trunk angle (20-80°)
              </li>
              <li>
                Calculates the exact position of knee, hip, shoulder, and bar
              </li>
            </ol>
            <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded mt-4">
              <p className="font-semibold">Result:</p>
              <p>
                A precise model of your squat biomechanics, including all moment
                arms and bar displacement.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Equivalent Load */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            4. Calculating Equivalent Load
          </h2>
          <div className="space-y-4 text-gray-700">
            <p className="text-lg">
              To fairly compare lifters, LEVER calculates a{" "}
              <strong>demand factor</strong> that combines work and moment arms:
            </p>
            <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
              <p className="font-mono text-lg text-center">
                Demand = Moment Arm × √(Displacement)
              </p>
              <p className="text-center text-sm text-gray-600 mt-2">
                Square root dampens displacement effect
              </p>
            </div>
            <p>
              The equivalent load is then calculated by scaling the original load
              by the demand ratio:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-mono text-center">
                Equivalent Load = Original Load × (Demand_A / Demand_B)
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg mt-4">
              <p className="font-semibold mb-2">Example:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Lifter A squats 300 lbs with demand factor = 0.180</li>
                <li>Lifter B has demand factor = 0.210 (17% higher)</li>
                <li className="text-purple-600 font-semibold">
                  Lifter A's 300 lbs = Lifter B's 257 lbs
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 5: Limitations */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            5. Known Limitations
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>LEVER is accurate but has some limitations:</p>
            <ul className="space-y-2 list-disc list-inside ml-4">
              <li>
                <strong>2D model:</strong> Only considers sagittal plane (side
                view). Doesn't account for stance width or knee tracking.
              </li>
              <li>
                <strong>Population averages:</strong> Segment ratios are based on
                Winter's data. Individual variation exists (±1-2 SD per segment).
              </li>
              <li>
                <strong>No tissue properties:</strong> Doesn't model muscle
                leverage, tendon stiffness, or strength curves.
              </li>
              <li>
                <strong>No technique factors:</strong> Assumes similar bar path
                and tempo between lifters.
              </li>
            </ul>
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <p className="font-semibold">Bottom line:</p>
              <p>
                LEVER provides <strong>biomechanical insight</strong>, not
                absolute truth. Use it to understand why lifts feel different, not
                as a definitive ranking system.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <Link
            href="/compare/quick"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Try It Out
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
