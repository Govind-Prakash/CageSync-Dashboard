'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { Download, CheckCircle } from 'lucide-react'

interface QRGeneratorToolProps {
  labName?: string
  userEmail?: string
}

export default function QRGeneratorTool({ labName, userEmail }: QRGeneratorToolProps) {
  const [qrContent, setQrContent] = useState('')
  const [label, setLabel] = useState(labName || '')
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [format, setFormat] = useState<'png' | 'svg'>('png')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const sizeOptions = {
    small: { label: 'Small (1")', pixels: 200 },
    medium: { label: 'Medium (2")', pixels: 400 },
    large: { label: 'Large (3")', pixels: 600 }
  }

  const generateQR = async () => {
    if (!qrContent.trim()) return

    setIsGenerating(true)
    try {
      const options = {
        width: sizeOptions[size].pixels,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }

      let dataUrl: string
      if (format === 'svg') {
        const svgString = await QRCode.toString(qrContent, {
          ...options,
          type: 'svg'
        })
        dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`
      } else {
        dataUrl = await QRCode.toDataURL(qrContent, options)
      }

      setQrCodeDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQR = () => {
    if (!qrCodeDataUrl) return

    const link = document.createElement('a')
    link.href = qrCodeDataUrl
    link.download = `qr-code-${Date.now()}.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-2xl">
      {/* Logged in notification */}
      <div
        className="mb-6 p-4 rounded-lg border flex items-start"
        style={{
          backgroundColor: '#E8F5F1',
          borderColor: '#1A7F64'
        }}
      >
        <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: '#1A7F64' }} />
        <div>
          <p className="font-body text-sm" style={{ color: '#1A7F64' }}>
            <strong>✓ Logged in</strong> — your details are prefilled. Public users must fill these manually.
          </p>
        </div>
      </div>

      {/* QR Generator Form */}
      <div
        className="p-6 rounded-xl border"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: '#E2E8F0'
        }}
      >
        <div className="mb-6">
          <h2 className="font-display font-medium text-xl mb-2" style={{ color: '#1A1A2E' }}>
            QR Code Generator
          </h2>
          <p className="font-body text-sm" style={{ color: '#6B7280' }}>
            Generate professional QR codes for cages, protocols, and equipment
          </p>
        </div>

        <div className="space-y-6">
          {/* QR Content */}
          <div>
            <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
              QR Content *
            </label>
            <textarea
              value={qrContent}
              onChange={(e) => setQrContent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              style={{
                borderColor: '#E2E8F0',
                color: '#1A1A2E'
              }}
              rows={3}
              placeholder="Enter the text or URL for your QR code (e.g., cage ID, protocol URL, etc.)"
              required
            />
          </div>

          {/* Label */}
          <div>
            <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              style={{
                borderColor: '#E2E8F0',
                color: '#1A1A2E'
              }}
              placeholder="Optional label (your lab name is prefilled)"
            />
          </div>

          {/* Size and Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Size */}
            <div>
              <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
                Size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as 'small' | 'medium' | 'large')}
                className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                style={{
                  borderColor: '#E2E8F0',
                  color: '#1A1A2E'
                }}
              >
                {Object.entries(sizeOptions).map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="block font-body font-medium text-sm mb-2" style={{ color: '#1A1A2E' }}>
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'png' | 'svg')}
                className="w-full px-3 py-2 border rounded-lg font-body text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                style={{
                  borderColor: '#E2E8F0',
                  color: '#1A1A2E'
                }}
              >
                <option value="png">PNG</option>
                <option value="svg">SVG</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateQR}
            disabled={!qrContent.trim() || isGenerating}
            className="w-full py-3 px-4 rounded-lg font-body font-medium text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#1A7F64' }}
          >
            {isGenerating ? 'Generating...' : 'Generate QR Code'}
          </button>

          {/* QR Code Preview */}
          {qrCodeDataUrl && (
            <div className="pt-6 border-t" style={{ borderColor: '#E2E8F0' }}>
              <div className="text-center">
                <h3 className="font-body font-medium text-sm mb-4" style={{ color: '#1A1A2E' }}>
                  Generated QR Code
                </h3>
                <div className="inline-block p-4 border rounded-lg" style={{ borderColor: '#E2E8F0' }}>
                  <img
                    src={qrCodeDataUrl}
                    alt="Generated QR Code"
                    className="max-w-full h-auto"
                    style={{ maxWidth: '300px' }}
                  />
                  {label && (
                    <p className="mt-2 font-body text-sm" style={{ color: '#6B7280' }}>
                      {label}
                    </p>
                  )}
                </div>

                {/* Download Button */}
                <button
                  onClick={downloadQR}
                  className="mt-4 inline-flex items-center px-4 py-2 border rounded-lg font-body font-medium text-sm transition-colors hover:bg-opacity-10"
                  style={{
                    borderColor: '#1A7F64',
                    color: '#1A7F64'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8F5F1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}