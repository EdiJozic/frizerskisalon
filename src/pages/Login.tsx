import { useState } from 'react'
import { Scissors } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await signInWithPassword(email, password)
      if (error) setError(error)
    } else {
      const { error } = await signUpWithPassword(email, password, fullName)
      if (error) setError(error)
      else setInfo('Račun je kreiran! Provjeri email ako je potrebna potvrda, zatim se prijavi.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 dark:bg-ink-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brass-600 text-white shadow-card">
            <Scissors size={26} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-ink-50">Salon Raspored</h1>
          <p className="mt-1 text-sm text-ink-400">Kalendar termina, isti na svakom uređaju.</p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-5 flex rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === 'signin' ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-400'
              }`}
            >
              Prijava
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white' : 'text-ink-400'
              }`}
            >
              Novi račun
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ime salona ili vlasnika"
                required
                className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Lozinka"
              required
              minLength={6}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-brass-500 focus:outline-none focus:ring-1 focus:ring-brass-500 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-700 dark:text-green-400">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brass-600 py-2.5 text-sm font-semibold text-white shadow-card hover:bg-brass-700 disabled:opacity-60"
            >
              {loading ? 'Molim pričekaj…' : mode === 'signin' ? 'Prijavi se' : 'Kreiraj račun'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-700" />
            <span className="text-xs text-ink-400">ili</span>
            <div className="h-px flex-1 bg-ink-100 dark:bg-ink-700" />
          </div>

          <button
            onClick={signInWithGoogle}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700"
          >
            <GoogleIcon /> Nastavi s Googleom
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          Prijavom na mobitelu i laptopu s istim računom, kalendar je uvijek isti i sinkroniziran u stvarnom vremenu.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.3 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.5C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  )
}
