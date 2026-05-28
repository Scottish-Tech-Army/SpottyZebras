'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const supabase = createClient()
        const { data, error: err } = await supabase
          .from('organisations')
          .select('count', { count: 'exact' })
          .limit(0)
        
        if (err) {
          setError(`Supabase error: ${err.message}`)
        } else {
          setSupabaseConnected(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full px-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Spotty Zebras
          </h1>
          
          <p className="text-slate-600 mb-8">
            Your multi-tenant event, booking, and donation platform
          </p>

          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-slate-900">Next.js installed</p>
                <p className="text-sm text-slate-500">App Router, TypeScript, Tailwind CSS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-2xl ${supabaseConnected ? '✅' : loading ? '⏳' : '❌'}`} />
              <div>
                <p className="font-semibold text-slate-900">
                  Supabase {supabaseConnected ? 'connected' : loading ? 'checking...' : 'not connected'}
                </p>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {!error && !loading && (
                  <p className="text-sm text-slate-500">
                    {supabaseConnected 
                      ? 'Ready to query your database'
                      : 'Add your env variables in .env.local'
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <p className="font-semibold text-slate-900">Styling ready</p>
                <p className="text-sm text-slate-500">Tailwind CSS + Shadcn/ui components</p>
              </div>
            </div>
          </div>

          <hr className="my-6" />

          <div className="space-y-2 text-sm text-slate-600">
            <p><strong>Next steps:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Add Supabase credentials to .env.local</li>
              <li>Create your first Supabase table</li>
              <li>Build your first feature</li>
              <li>Push to GitHub</li>
            </ol>
          </div>

          <a 
            href="/api/health"
            className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Test API health
          </a>
        </div>
      </div>
    </div>
  )
}