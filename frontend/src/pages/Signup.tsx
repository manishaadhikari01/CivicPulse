import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CaptchaField from '../components/CaptchaField'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!captcha) {
      setError('Please complete the captcha')
      return
    }
    setLoading(true)
    setError('')
    try {
      await signup(name, email, password, captcha)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Join CivicPulse</h1>
        <p className="text-sm text-on-surface/60">Report issues, track progress, and earn badges in Dehradun.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-outline/15 bg-white p-6 shadow-sm">
        {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Full Name</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-outline/30 px-3 py-2.5" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-outline/30 px-3 py-2.5" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Password</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-outline/30 px-3 py-2.5" />
        </label>
        <CaptchaField onChange={setCaptcha} />
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary-container py-3 font-semibold text-white disabled:opacity-60">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-on-surface/60">
        Already have an account? <Link to="/login" className="font-medium text-primary">Sign in</Link>
      </p>
    </div>
  )
}
