'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QrCode, CreditCard, Calculator, FileSpreadsheet, Barcode } from 'lucide-react'

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState('All Tools')

  const tools = [
    {
      id: 'qr-generator',
      name: 'QR Code Generator',
      description: 'Generate ISO compliant QR codes for cage IDs, equipment labels, and custom data',
      icon: QrCode,
      tags: ['QR Code', 'Labels'],
      href: '/dashboard/tools/qr-generator',
      categories: ['QR & Labels']
    },
    {
      id: 'cage-cards',
      name: 'Cage Card Printer',
      description: 'Create professional cage cards with integrated QR codes and compliance fields',
      icon: CreditCard,
      tags: ['Labels', 'PDF'],
      href: '/dashboard/tools/cage-cards',
      categories: ['QR & Labels']
    },
    {
      id: 'breeding-calculator',
      name: 'Breeding Calculator',
      description: 'Calculate weaning dates, breeding timelines, and generation planning for your colony',
      icon: Calculator,
      tags: ['Calculator', 'Colony'],
      href: '/dashboard/tools/breeding-calculator',
      categories: ['Calculators']
    },
    {
      id: 'sheets-templates',
      name: 'Google Sheets Templates',
      description: 'Pre-built templates designed to work seamlessly with CageSync colony data',
      icon: FileSpreadsheet,
      tags: ['Templates', 'Google'],
      href: '/dashboard/tools/sheets-templates',
      categories: ['Templates']
    },
    {
      id: 'barcode-generator',
      name: 'Barcode Generator',
      description: 'Generate Code 128, DataMatrix, and Code 39 barcodes for equipment and reagents',
      icon: Barcode,
      tags: ['Barcode', 'Labels'],
      href: '/dashboard/tools/barcode-generator',
      categories: ['QR & Labels']
    }
  ]

  const tabs = ['All Tools', 'QR & Labels', 'Calculators', 'Templates']

  const filteredTools = activeTab === 'All Tools'
    ? tools
    : tools.filter(tool => tool.categories.includes(activeTab))

  return (
    <div className="pt-2">
      {/* Tab Navigation */}
      <div className="border-b" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="h-10 px-1 font-body text-sm font-normal relative transition-colors"
              style={{
                color: activeTab === tab ? '#1A7F64' : '#6B7280',
                fontWeight: activeTab === tab ? '500' : '400'
              }}
            >
              {tab}
              {activeTab === tab && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: '#1A7F64' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredTools.map((tool) => {
          const Icon = tool.icon

          return (
            <div
              key={tool.id}
              className="bg-white rounded-lg p-5 transition-all duration-200 hover:shadow-sm group"
              style={{ border: '1px solid #E2E8F0' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1A7F64'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0'
              }}
            >
              {/* Top Row: Icon and Tags */}
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: '#1A7F64' }} />
                <div className="flex gap-1 flex-wrap">
                  {tool.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs font-body"
                      style={{
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        fontSize: '11px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tool Name */}
              <h3
                className="font-display font-medium text-base mb-1 line-clamp-1"
                style={{
                  color: '#1A1A2E',
                  fontSize: '15px'
                }}
              >
                {tool.name}
              </h3>

              {/* Description */}
              <p
                className="font-body text-sm mb-4 line-clamp-2"
                style={{
                  color: '#6B7280',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}
              >
                {tool.description}
              </p>

              {/* Bottom Row: View Details and Open Tool */}
              <div className="flex items-center justify-between">
                <Link
                  href={tool.href}
                  className="font-body text-sm transition-colors"
                  style={{
                    color: '#1A7F64',
                    fontSize: '13px'
                  }}
                >
                  View details
                </Link>
                <Link
                  href={tool.href}
                  className="px-3.5 py-1.5 rounded-md font-body text-sm transition-colors"
                  style={{
                    backgroundColor: '#1A7F64',
                    color: 'white',
                    fontSize: '13px'
                  }}
                >
                  Open Tool
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}