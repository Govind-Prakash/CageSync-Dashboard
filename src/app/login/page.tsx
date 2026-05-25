'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

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
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEmailAuth()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left Side - Branding & Value Prop */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, #E8F5F1 0%, #D1ECE4 50%, #BDE4D3 100%)'
        }}>
          <div className="flex flex-col justify-center px-16 py-12 w-full">
            {/* Brand Header */}
            <div className="mb-12">
              <div className="flex items-center mb-8">
                <Image
                  src="/images/logo.png"
                  alt="CageSync"
                  width={56}
                  height={56}
                  className="rounded-xl mr-5"
                />
                <div>
                  <h1 className="font-display font-semibold text-3xl text-slate-800 leading-none">
                    CageSync
                  </h1>
                  <p className="font-body text-sm text-slate-600 mt-1 tracking-wide">
                    SCAN. LOG. SYNC.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="font-display font-semibold text-4xl text-slate-800 leading-tight">
                  Smart Colony Management for Research Labs
                </h2>
                <p className="font-body text-lg text-slate-600 leading-relaxed">
                  Streamline your lab animal tracking with mobile QR scanning, real-time synchronization, and comprehensive colony management.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-6 h-6 bg-white border-2 rounded-lg flex items-center justify-center mr-4 mt-0.5 flex-shrink-0" style={{borderColor: '#1A7F64'}}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{color: '#1A7F64'}}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-body font-medium text-slate-800 text-base mb-1">
                    Mobile QR Scanning
                  </h3>
                  <p className="font-body text-sm text-slate-600 leading-relaxed">
                    Instant cage identification and data entry with your mobile device
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-6 h-6 bg-white border-2 rounded-lg flex items-center justify-center mr-4 mt-0.5 flex-shrink-0" style={{borderColor: '#1A7F64'}}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{color: '#1A7F64'}}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-body font-medium text-slate-800 text-base mb-1">
                    Live Google Sheets Sync
                  </h3>
                  <p className="font-body text-sm text-slate-600 leading-relaxed">
                    Automatic synchronization with your existing spreadsheets
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-6 h-6 bg-white border-2 rounded-lg flex items-center justify-center mr-4 mt-0.5 flex-shrink-0" style={{borderColor: '#1A7F64'}}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" style={{color: '#1A7F64'}}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-body font-medium text-slate-800 text-base mb-1">
                    IACUC Compliance
                  </h3>
                  <p className="font-body text-sm text-slate-600 leading-relaxed">
                    Built-in compliance tracking and audit trail management
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-12 pt-8 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="font-display font-semibold text-2xl" style={{color: '#1A7F64'}}>500+</div>
                  <div className="font-body text-sm text-slate-600 mt-1">Active Researchers</div>
                </div>
                <div>
                  <div className="font-display font-semibold text-2xl" style={{color: '#1A7F64'}}>50k+</div>
                  <div className="font-body text-sm text-slate-600 mt-1">Animals Tracked</div>
                </div>
              </div>
            </div>
          </div>

          {/* CageSync Network: Scan. Log. Sync. */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">

            {/* Network Connection Lines */}
            <path d="M70,120 Q150,140 230,180" stroke="rgba(26, 127, 100, 0.025)" strokeWidth="1.5" fill="none" />
            <path d="M230,180 Q280,220 320,280" stroke="rgba(37, 168, 130, 0.03)" strokeWidth="1.5" fill="none" />
            <path d="M320,280 Q250,350 180,420" stroke="rgba(26, 127, 100, 0.025)" strokeWidth="1.5" fill="none" />
            <path d="M180,420 Q140,380 110,340" stroke="rgba(37, 168, 130, 0.025)" strokeWidth="1.5" fill="none" />
            <path d="M110,340 Q80,250 70,120" stroke="rgba(26, 127, 100, 0.02)" strokeWidth="1" fill="none" />
            <path d="M350,150 Q300,200 230,180" stroke="rgba(37, 168, 130, 0.025)" strokeWidth="1" fill="none" />

            {/* QR/Barcode Icons - "SCAN" */}
            <g transform="translate(65, 115)" fill="rgba(26, 127, 100, 0.04)">
              <rect x="0" y="0" width="2" height="10" />
              <rect x="3" y="0" width="1" height="10" />
              <rect x="5" y="0" width="3" height="10" />
              <rect x="9" y="0" width="1" height="10" />
              <rect x="11" y="0" width="2" height="10" />
            </g>

            <g transform="translate(345, 145)" fill="rgba(37, 168, 130, 0.045)">
              <rect x="0" y="0" width="1" height="8" />
              <rect x="2" y="0" width="2" height="8" />
              <rect x="5" y="0" width="1" height="8" />
              <rect x="7" y="0" width="3" height="8" />
            </g>

            {/* Mouse Silhouettes - "LOG" */}
            <g transform="translate(225, 175) scale(0.25)" fill="rgba(26, 127, 100, 0.035)">
              <ellipse cx="10" cy="8" rx="8" ry="5" />
              <circle cx="6" cy="6" r="1" />
              <circle cx="14" cy="6" r="1" />
              <ellipse cx="18" cy="10" rx="3" ry="2" />
              <path d="M2,10 Q0,12 2,14 Q4,12 2,10" />
            </g>

            <g transform="translate(315, 275) scale(0.2)" fill="rgba(37, 168, 130, 0.04)">
              <ellipse cx="10" cy="8" rx="8" ry="5" />
              <circle cx="6" cy="6" r="1" />
              <circle cx="14" cy="6" r="1" />
              <ellipse cx="18" cy="10" rx="3" ry="2" />
              <path d="M2,10 Q0,12 2,14 Q4,12 2,10" />
            </g>

            {/* Data Points/Circles - "SYNC" */}
            <circle cx="110" cy="340" r="8" fill="rgba(26, 127, 100, 0.04)" stroke="rgba(26, 127, 100, 0.06)" strokeWidth="1" />
            <circle cx="180" cy="420" r="6" fill="rgba(37, 168, 130, 0.045)" stroke="rgba(37, 168, 130, 0.065)" strokeWidth="1" />

            {/* Central Hub Node */}
            <circle cx="230" cy="180" r="4" fill="rgba(26, 127, 100, 0.06)" stroke="rgba(26, 127, 100, 0.08)" strokeWidth="1.5" />

            {/* Additional Network Nodes */}
            <circle cx="320" cy="280" r="3" fill="rgba(37, 168, 130, 0.05)" />
            <circle cx="70" cy="120" r="3" fill="rgba(26, 127, 100, 0.05)" />
            <circle cx="350" cy="150" r="2" fill="rgba(37, 168, 130, 0.06)" />

          </svg>
        </div>

        {/* Right Side - Authentication Form */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-16 lg:py-12">
          <div className="w-full max-w-xs lg:max-w-sm">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6 lg:mb-10">
              <div className="flex items-center justify-center mb-4">
                <Image
                  src="/images/logo.png"
                  alt="CageSync"
                  width={36}
                  height={36}
                  className="rounded-lg mr-3"
                />
                <div className="text-center">
                  <h1 className="font-display font-semibold text-xl text-slate-800 leading-none">
                    CageSync
                  </h1>
                  <p className="font-body text-xs text-slate-600 tracking-wide mt-1">
                    SCAN. LOG. SYNC.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 lg:mb-10 text-center lg:text-left">
              <h2 className="font-display font-semibold text-xl lg:text-3xl text-slate-800 mb-3 leading-tight">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="font-body text-base lg:text-lg text-slate-600 leading-relaxed">
                {isSignUp
                  ? 'Get started with your research colony management'
                  : 'Sign in to access your lab dashboard'
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-6 text-sm font-body">
                {error}
              </div>
            )}

            {/* SSO Options */}
            <div className="space-y-3 mb-4 lg:mb-6">
              <button
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full flex items-center justify-center px-4 py-3.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-surface focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-body font-medium text-slate-700"
              >
                {isGoogleLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-3"></div>
                ) : (
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <button
                disabled
                className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-400 font-body font-medium cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z"/>
                  <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                ORCID iD (Coming Soon)
              </button>
            </div>

            <div className="relative mb-4 lg:mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-500 font-body">Or continue with email</span>
              </div>
            </div>

            {/* Email Form */}
            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block font-body font-medium text-sm text-slate-800 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 font-body"
                  style={{'--tw-ring-color': '#E8F5F1'} as React.CSSProperties}
                  onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  placeholder="your@university.edu"
                />
              </div>

              <div>
                <label className="block font-body font-medium text-sm text-slate-800 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 font-body"
                  style={{'--tw-ring-color': '#E8F5F1'} as React.CSSProperties}
                  onFocus={(e) => e.target.style.borderColor = '#1A7F64'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                  placeholder="••••••••"
                />
              </div>

              <button
                onClick={handleEmailAuth}
                disabled={isLoading}
                className="w-full text-white font-body font-medium py-3.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:opacity-90"
                style={{backgroundColor: '#1A7F64', '--tw-ring-color': '#E8F5F1'} as React.CSSProperties}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </div>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-4 lg:mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                className="font-body text-sm text-slate-600 hover:opacity-80 transition-colors"
                style={{color: '#1A7F64'} as React.CSSProperties}
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>

            {/* Trust Signals */}
            <div className="mt-6 lg:mt-8 pt-6 lg:pt-8 border-t border-slate-200">
              <div className="flex items-center justify-center space-x-4 lg:space-x-6 text-xs text-slate-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" style={{color: '#1A7F64'}} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-body">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" style={{color: '#1A7F64'}} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-body">IACUC Approved</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" style={{color: '#1A7F64'}} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-body">Data Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}