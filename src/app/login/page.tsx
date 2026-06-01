'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ColonyNetwork from '@/components/colony-network'
import Image from 'next/image'
import './styles.css'

const PALETTE = {
  bg: "#1A7F64",
  bg2: "#085041",
  ink: "#FFFFFF", // Only for LEFT panel on dark background
  muted: "#6B7280",
  card: "#FFFFFF",
  line: "#E2E8F0"
}

const ACCENT = "#46D9A2"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  const cssVars: React.CSSProperties = {
    "--bg": PALETTE.bg,
    "--bg2": PALETTE.bg2,
    "--ink": PALETTE.ink, // WHITE for left panel only
    "--muted": PALETTE.muted,
    "--card": PALETTE.card,
    "--line": PALETTE.line,
    "--accent": ACCENT,
    // Override with proper brand tokens (these are set in CSS)
    "--primary": "#1A7F64",
    "--primary-dark": "#085041",
    "--ink-right": "#1A1A2E", // DARK for right panel
    "--ink-muted": "#5A6172",
  } as React.CSSProperties

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const canSubmit = validEmail && password.length >= 6 && !submitting &&
    (isSignUp ? confirmPassword === password : true)

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
              <Image
                src="/images/logo.png"
                alt="CageSync"
                width={44}
                height={44}
                className="rounded-lg"
              />
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
              Sync sheets. <span className="hero-accent">Pass audits.</span>
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
            <button className="btn-google" type="button" onClick={handleGoogleAuth} disabled={submitting}>
              <GoogleLogo /> Continue with Google
            </button>
          </div>

          <div className="divider"><span>or {isSignUp ? 'sign up' : 'continue'} with email</span></div>

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

            {isSignUp && (
              <label className={`field ${confirmPasswordFocused ? "focused" : ""}`}>
                <span className="field-label">
                  <span>Confirm password</span>
                  {confirmPassword && confirmPassword !== password && <em className="field-hint err">passwords don't match</em>}
                </span>
                <div className="input-wrap">
                  <KeyIcon />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </label>
            )}

            {!isSignUp && (
              <label className="remember-custom" onClick={() => setRememberMe(!rememberMe)}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="opacity-0 absolute"
                />
                <div className={`custom-checkbox ${rememberMe ? 'checked' : ''}`}>
                  {rememberMe && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2">
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
                <span>Keep me signed in on this device</span>
              </label>
            )}

            <button type="submit" className={`${isSignUp ? 'btn-secondary' : 'btn-primary'} ${canSubmit ? "ready" : ""}`} disabled={!canSubmit}>
              {submitting ? (
                <><Spinner /> {isSignUp ? 'Creating account…' : 'Authenticating…'}</>
              ) : (
                <>{isSignUp ? 'Create Account' : 'Sign In'} <ArrowIcon /></>
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
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
  </svg>
)

