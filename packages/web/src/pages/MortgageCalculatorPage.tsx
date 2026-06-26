import { Home } from "lucide-react";

export default function MortgageCalculatorPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
            <Home size={24} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Mortgage Calculator</h1>
          <p className="text-sm text-gray-600">
            This calculator is coming soon. Check back later for mortgage payment projections,
            amortization schedules, and total interest breakdowns.
          </p>
        </div>
      </div>
    </div>
  );
}
