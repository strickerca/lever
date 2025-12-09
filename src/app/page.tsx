import Link from "next/link";
import { ArrowRight, Calculator, TrendingUp, Scale } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            Finally, <span className="text-blue-600">Fair Lift Comparisons</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
            Stop comparing apples to oranges. LEVER uses biomechanics to compare
            lifts across different body types, fairly and scientifically.
          </p>

          <div className="pt-4">
            <Link
              href="/compare/quick"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Comparing
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            The Problem
          </h2>
          <div className="space-y-4 text-lg text-gray-700 max-w-3xl mx-auto">
            <p>
              A 5'7" lifter squatting 315 lbs moves the bar 23 inches. A 6'3"
              lifter squatting the same weight moves it 27 inches — <strong>17% more
              work</strong>.
            </p>
            <p>
              Traditional comparisons ignore biomechanics. Wilks and Dots scores
              use simple body weight formulas, but they don't account for limb
              lengths, moment arms, or range of motion.
            </p>
            <p className="text-blue-600 font-semibold">
              LEVER solves this with physics-based analysis of your unique body
              structure.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
          How LEVER Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Work Calculation
            </h3>
            <p className="text-gray-600">
              Calculates actual mechanical work (Force × Distance) based on your
              body dimensions. Every inch of ROM matters.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Moment Arm Analysis
            </h3>
            <p className="text-gray-600">
              Models your squat position to find hip and knee moment arms. Longer
              femurs = larger moment arms = harder squat.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Scale className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Equivalent Load
            </h3>
            <p className="text-gray-600">
              Converts performances across body types: "Your 315 lbs is equivalent
              to their 285 lbs" based on actual biomechanics.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Compare?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Get scientifically accurate lift comparisons in seconds. No signup
            required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/compare/quick"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Quick Compare
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-blue-800 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-900 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-600">
        <p>
          Built with biomechanics research. Open source and free to use.
        </p>
      </footer>
    </div>
  );
}
