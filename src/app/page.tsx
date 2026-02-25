import Link from "next/link";
import { ArrowRight, Calculator, TrendingUp, Scale } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            Finally, <span className="text-blue-400">Fair Lift Comparisons</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto">
            Stop comparing apples to oranges. LEVER uses biomechanics to compare
            lifts across different body types with a transparent, model-based approach.
          </p>

          <div className="pt-4">
            <Link
              href="/compare/quick"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
            >
              Start Comparing
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-800 shadow-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            The Problem
          </h2>
          <div className="space-y-4 text-lg text-slate-300 max-w-3xl mx-auto">
            <p>
              A 5&apos;7&quot; lifter squatting 315 lbs moves the bar 23 inches. A 6&apos;3&quot;
              lifter squatting the same weight moves it 27 inches — <strong className="text-white">17% more
              work</strong>.
            </p>
            <p>
              Traditional comparisons ignore biomechanics. Wilks and Dots scores
              use simple body weight formulas, but they don&rsquo;t account for limb
              lengths, moment arms, or range of motion.
            </p>
            <p className="text-blue-400 font-semibold">
              LEVER solves this with physics-based analysis of your unique body
              structure.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">
          How LEVER Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 bg-blue-950 border border-blue-800/50 rounded-lg flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Work Calculation
            </h3>
            <p className="text-slate-400">
              Calculates actual mechanical work (Force x Distance) based on your
              body dimensions. Every inch of ROM matters.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 bg-orange-950 border border-orange-800/50 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Moment Arm Analysis
            </h3>
            <p className="text-slate-400">
              Models your squat position to find hip and knee moment arms. Longer
              femurs = larger moment arms = harder squat.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-800 p-6 hover:border-slate-700 transition-colors">
            <div className="w-12 h-12 bg-green-950 border border-green-800/50 rounded-lg flex items-center justify-center mb-4">
              <Scale className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Equivalent Load
            </h3>
            <p className="text-slate-400">
              Converts performances across body types: &quot;Your 315 lbs is equivalent
              to their 285 lbs&quot; based on actual biomechanics.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 rounded-2xl border border-blue-800/40 shadow-xl shadow-blue-950/30 p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Compare?
          </h2>
          <p className="text-xl text-blue-200/70 mb-8 max-w-2xl mx-auto">
            Get biomechanics-informed lift comparisons in seconds. No signup
            required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/compare/quick"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
            >
              Quick Compare
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-slate-800 text-slate-200 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-slate-700 transition-colors border border-slate-700"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-500">
        <p>
          Built with biomechanics-informed modeling. Open source and free to use.
        </p>
      </footer>
    </div>
  );
}
