'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ColonyNetwork from '@/components/colony-network'
import './styles.css'

const PALETTE = {
  bg: "#0a2a22",
  bg2: "#0d3a2e",
  ink: "#e6f5ec",
  muted: "#9cc6b1",
  card: "#0f4234",
  line: "#1f6a52"
}

const ACCENT = "#7FE7B5"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const cssVars = {
    "--bg": PALETTE.bg,
    "--bg2": PALETTE.bg2,
    "--ink": PALETTE.ink,
    "--muted": PALETTE.muted,
    "--card": PALETTE.card,
    "--line": PALETTE.line,
    "--accent": ACCENT,
  }

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const canSubmit = validEmail && password.length >= 6 && !submitting

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError("")

    try {
      let result
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email,
          password,
        })
      } else {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        })
      }

      if (result.error) {
        setError(result.error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleAuth = async () => {
    setSubmitting(true)
    setError("")

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-root" style={cssVars}>
      {/* LEFT — brand panel with colony network */}
      <aside className="brand">
        <div className="brand-bg" />
        <div className="brand-grain" />
        <ColonyNetwork
          speed={1}
          accent={ACCENT}
          opacity={0.09}
          seed={7}
        />
        <div className="brand-vignette" />

        <div className="brand-content">
          <header className="brand-head">
            <div className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="32" height="32">
                {/* scanner corners */}
                <path d="M 4 10 V 4 H 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M 22 4 H 28 V 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M 4 22 V 28 H 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M 22 28 H 28 V 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                {/* mouse silhouette in center */}
                <ellipse cx="14" cy="17" rx="5" ry="3.4" fill="currentColor" />
                <circle cx="19" cy="15.5" r="2.2" fill="currentColor" />
                <circle cx="18.5" cy="13.5" r="1.0" fill="currentColor" />
                <circle cx="20.0" cy="13.8" r="0.9" fill="currentColor" />
                <path d="M 9 17.6 Q 6.5 18.2 6.5 16" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="logo-text">
              <div className="logo-name">CageSync</div>
              <div className="logo-tag">SCAN · LOG · SYNC</div>
            </div>
            <span className="status-pill" title="All systems operational">
              <span className="status-dot" />
              <span>colony online</span>
            </span>
          </header>

          <div className="brand-spacer" />

          <div className="hero">
            <div className="eyebrow">For animal research labs</div>
            <h1 className="hero-title">
              Scan cages.<br/>
              Sync sheets.<br/>
              <span className="hero-accent">Pass audits.</span>
            </h1>
            <p className="hero-sub">
              CageSync turns any phone into a vivarium scanner. Every read updates your Google Sheet and your IACUC audit trail, in real time.
            </p>
          </div>

          <div className="brand-stats">
            <div className="stat">
              <div className="stat-n">500+</div>
              <div className="stat-l">Labs</div>
            </div>
            <div className="stat">
              <div className="stat-n">50k</div>
              <div className="stat-l">Animals tracked</div>
            </div>
            <div className="stat">
              <div className="stat-n">99.99%</div>
              <div className="stat-l">Sync uptime</div>
            </div>
          </div>

          <footer className="brand-foot">
            <span className="foot-item">
              <LockIcon /> SOC 2 Type II
            </span>
            <span className="foot-sep" />
            <span className="foot-item">
              <CheckIcon /> IACUC Approved
            </span>
            <span className="foot-sep" />
            <span className="foot-item">
              <ShieldIcon /> AES-256 Encrypted
            </span>
          </footer>
        </div>
      </aside>

      {/* RIGHT — form */}
      <main className="form-pane">
        <nav className="top-nav">
          <span className="muted-text">New to CageSync?</span>
          <a className="nav-link" href="#" onClick={(e) => { e.preventDefault(); setIsSignUp(!isSignUp); setError("") }}>
            {isSignUp ? 'Sign in instead' : 'Request access'}
          </a>
        </nav>

        <div className="form-wrap">
          <div className="form-head">
            <div className="kicker">{isSignUp ? 'Create account' : 'Sign in'}</div>
            <h2 className="form-title">
              {isSignUp ? 'Welcome to CageSync.' : 'Welcome back, researcher.'}
            </h2>
            <p className="form-sub">
              {isSignUp
                ? 'Get started with your colony management dashboard.'
                : 'Access your colony dashboard, scan history, and synced sheets.'
              }
            </p>
          </div>

          {error && (
            <div className="error-message" style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: 'var(--radius)',
              marginBottom: '22px',
              fontSize: '13px',
              fontFamily: 'var(--sans)'
            }}>
              {error}
            </div>
          )}

          <div className="auth-stack">
            <button className="btn-sso" type="button" onClick={handleGoogleAuth} disabled={submitting}>
              <GoogleLogo /> Continue with Google
            </button>
            <button className="btn-sso muted" type="button" disabled>
              <OrcidLogo /> Continue with ORCID
              <span className="soon">soon</span>
            </button>
          </div>

          <div className="divider"><span>or {isSignUp ? 'sign up' : 'sign in'} with email</span></div>

          <form onSubmit={handleEmailSubmit} className="auth-form" noValidate>
            <label className={`field ${emailFocused ? "focused" : ""}`}>
              <span className="field-label">
                <span>Institutional email</span>
                {email && !validEmail && <em className="field-hint err">not a valid email</em>}
              </span>
              <div className="input-wrap">
                <MailIcon />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="lab@university.edu"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className={`field ${passwordFocused ? "focused" : ""}`}>
              <span className="field-label">
                <span>Password</span>
                {!isSignUp && <a className="field-hint" href="#" onClick={(e) => e.preventDefault()}>forgot?</a>}
              </span>
              <div className="input-wrap">
                <KeyIcon />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="toggle password visibility"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            {!isSignUp && (
              <label className="remember">
                <input type="checkbox" defaultChecked />
                <span className="check" aria-hidden="true"><CheckIcon /></span>
                <span>Keep me signed in on this device</span>
              </label>
            )}

            <button type="submit" className={`btn-primary ${canSubmit ? "ready" : ""}`} disabled={!canSubmit}>
              {submitting ? (
                <><Spinner /> {isSignUp ? 'Creating account…' : 'Authenticating…'}</>
              ) : (
                <>{isSignUp ? 'Create account' : 'Sign in to dashboard'} <ArrowIcon /></>
              )}
            </button>
          </form>

          <div className="form-foot">
            <span>Protected by lab-grade auth.</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Need an SSO setup for your institution?</a>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ─── icons ─── */
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7 L12 13 L21 7" />
  </svg>
)

const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="14" r="4" />
    <path d="M11 13 L21 3 M18 6 L20 8 M15 9 L17 11" />
  </svg>
)

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12 C 4 7, 8 4, 12 4 C 16 4, 20 7, 22 12 C 20 17, 16 20, 12 20 C 8 20, 4 17, 2 12 Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3 L21 21" />
    <path d="M10.5 6.3 C 11 6.1 11.5 6 12 6 C 16 6, 19.5 9, 21 12 C 20.5 13, 19.7 14, 18.7 14.9" />
    <path d="M6.2 7.6 C 4.5 8.8, 3.4 10.4, 3 12 C 4.5 15, 8 18, 12 18 C 13.2 18, 14.4 17.7, 15.5 17.2" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12 L10 17 L19 7" />
  </svg>
)

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12 H19 M13 6 L19 12 L13 18" />
  </svg>
)

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="11" width="16" height="10" rx="2"/>
    <path d="M8 11 V 7 a 4 4 0 0 1 8 0 V 11"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 L20 6 V 12 C 20 17, 16 21, 12 22 C 8 21, 4 17, 4 12 V 6 Z" />
  </svg>
)

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="spin">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 60" strokeLinecap="round" opacity="0.95"/>
  </svg>
)

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.2 5.3C40.9 35.9 44 30.4 44 24c0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
)

const OrcidLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.18"/>
    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="system-ui">iD</text>
  </svg>
)