# CageSync Brand Identity

## Overview
- **App name:** CageSync
- **Tagline:** Scan. Log. Sync.
- **Target users:** PhD researchers, lab managers, principal investigators
- **Feel:** Calm, precise, trustworthy. Not clinical, not cold, not startup-flashy.

---

## Color System

### Primary Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1A7F64` | Buttons, active states, logo |
| `primary-light` | `#25A882` | Secondary actions, highlights |
| `primary-surface` | `#E8F5F1` | Teal tinted backgrounds, selected states |
| `primary-dark` | `#085041` | Pressed states, dark text on light |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `amber` | `#F5A623` | FAB ring, warnings, pending sync |
| `amber-surface` | `#FEF3D8` | Warning card backgrounds |
| `amber-dark` | `#854F0B` | Warning text |

### Danger Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `red` | `#E53E3E` | Humane endpoint alerts, errors |
| `red-surface` | `#FCEBEB` | Error backgrounds |
| `red-dark` | `#A32D2D` | Error text |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `ink` | `#1A1A2E` | Primary text |
| `gray-500` | `#6B7280` | Secondary text, placeholders |
| `gray-300` | `#9CA3AF` | Tertiary text, disabled |
| `border` | `#E2E8F0` | Dividers, card borders, input borders |
| `surface` | `#F8FAFB` | App/page background |
| `card` | `#FFFFFF` | Card backgrounds, input fill |

### Dark Mode Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `dark-bg` | `#0D1F1A` | Dark app background |
| `dark-card` | `#152920` | Dark card background |
| `dark-border` | `#1E3D30` | Dark borders |

---

## Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Logo / Display | Space Grotesk | SemiBold 600 | 28–40px |
| Headings | Space Grotesk | Medium 500 | 22–28px |
| Body | Inter | Regular 400 | 14–16px |
| Labels | Inter | Medium 500 | 12–14px |
| Data / IDs / Code | Source Code Pro | Regular 400 | 12px |

---

## Logo Usage Rules
- On white background → use `#1A7F64` (Teal Primary) logo
- On dark background → use `#25A882` (Teal Secondary) logo  
- On teal background → use `#FFFFFF` (White) logo
- Minimum size: 120px wide
- Never stretch or rotate

---

## Tailwind Custom Tokens (for tailwind.config.ts)

```js
colors: {
  primary: {
    DEFAULT: '#1A7F64',
    light: '#25A882',
    surface: '#E8F5F1',
    dark: '#085041',
  },
  amber: {
    DEFAULT: '#F5A623',
    surface: '#FEF3D8',
    dark: '#854F0B',
  },
  danger: {
    DEFAULT: '#E53E3E',
    surface: '#FCEBEB',
    dark: '#A32D2D',
  },
  ink: '#1A1A2E',
  surface: '#F8FAFB',
  card: '#FFFFFF',
  border: '#E2E8F0',
  dark: {
    bg: '#0D1F1A',
    card: '#152920',
    border: '#1E3D30',
  }
},
fontFamily: {
  display: ['Space Grotesk', 'sans-serif'],
  body: ['Inter', 'sans-serif'],
  mono: ['Source Code Pro', 'monospace'],
},
```

---

## Component Patterns

### Buttons
- **Primary:** bg `#1A7F64`, text white, hover bg `#085041`, rounded-lg
- **Secondary:** border `#1A7F64`, text `#1A7F64`, hover bg `#E8F5F1`
- **Danger:** bg `#E53E3E`, text white

### Cards
- bg white, border `#E2E8F0`, rounded-xl, shadow-sm

### Inputs
- border `#E2E8F0`, focus border `#1A7F64`, focus ring `#E8F5F1`
- bg white, text `#1A1A2E`, placeholder `#9CA3AF`

### Badges
- Active: bg `#E8F5F1`, text `#1A7F64`
- Warning: bg `#FEF3D8`, text `#854F0B`
- Danger: bg `#FCEBEB`, text `#A32D2D`
- Neutral: bg `#F8FAFB`, text `#6B7280`