'use client'

import Header from '@/components/Header'
import BackButton from '@/components/BackButton'

export default function DonatePage() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // handle donation logic here
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 p-8 w-full max-w-sm">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute left-0">
              <BackButton />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Make a Donation</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1">
                Amount (£)
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
