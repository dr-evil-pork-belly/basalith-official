'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Step = {
  number:      number
  title:       string
  description: string
  buttonLabel: string
  buttonHref:  string
  completedWhen: string
}

const STEPS: Step[] = [
  {
    number:        1,
    title:         'Upload your photos',
    description:   'Upload everything from your phone. Our AI analyzes each photo and removes screenshots automatically.',
    buttonLabel:   'UPLOAD PHOTOS →',
    buttonHref:    '/archive/label',
    completedWhen: 'photos',
  },
  {
    number:        2,
    title:         'Invite your family',
    description:   'Add family members as contributors. They will receive a photograph by email every evening and can reply with their memories.',
    buttonLabel:   'ADD CONTRIBUTORS →',
    buttonHref:    '/archive/contributors',
    completedWhen: 'contributors',
  },
  {
    number:        3,
    title:         'Meet your entity',
    description:   'Your entity learns from your archive. Talk to it, correct it, and watch it become more accurate over time.',
    buttonLabel:   'TALK TO YOUR ENTITY →',
    buttonHref:    '/archive/entity',
    completedWhen: 'entity',
  },
  {
    number:        4,
    title:         'Add important dates',
    description:   'Add birthdays and anniversaries. Your archive will remember them automatically every year.',
    buttonLabel:   'ADD A DATE →',
    buttonHref:    '/archive/dates',
    completedWhen: 'dates',
  },
]

type Props = {
  archiveId:     string
  photoCount:    number
  contributorCount: number
  entityConversations: number
  significantDates: number
}

export default function OnboardingGuide({
  archiveId,
  photoCount,
  contributorCount,
  entityConversations,
  significantDates,
}: Props) {
  const storageKey = `onboarding_complete_${archiveId}`
  const [dismissed,     setDismissed]     = useState(false)
  const [reopened,      setReopened]      = useState(false)
  const [showComplete,  setShowComplete]  = useState(false)
  const [hydrated,      setHydrated]      = useState(false)

  useEffect(() => {
    setHydrated(true)
    const saved = localStorage.getItem(storageKey)
    if (saved === 'done') {
      setDismissed(true)
    }
  }, [storageKey])

  const completion = {
    photos:       photoCount > 0,
    contributors: contributorCount > 0,
    entity:       entityConversations > 0,
    dates:        significantDates > 0,
  }

  const completedCount = Object.values(completion).filter(Boolean).length
  const allDone        = completedCount === 4

  useEffect(() => {
    if (allDone && hydrated) {
      localStorage.setItem(storageKey, 'done')
      setShowComplete(true)
      const t = setTimeout(() => { setDismissed(true) }, 5000)
      return () => clearTimeout(t)
    }
  }, [allDone, hydrated, storageKey])

  function dismiss() {
    setDismissed(true)
    setReopened(false)
  }

  // Find current step: first incomplete
  const currentStep = STEPS.find(s => !completion[s.completedWhen as keyof typeof completion]) ?? STEPS[3]

  // Don't render until hydrated (avoids localStorage SSR mismatch)
  if (!hydrated) return null

  // Permanently done
  if (dismissed && !reopened) {
    // If all done — nothing to show
    if (allDone) return null
    // Minimized state
    return (
      <div
        className="mb-8 flex items-center justify-between rounded-sm px-5 py-3 cursor-pointer"
        style={{ background: 'rgba(196,162,74,0.04)', border: '1px solid rgba(196,162,74,0.1)', borderTop: '2px solid rgba(196,162,74,0.3)' }}
        onClick={() => setReopened(true)}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.25em', color: 'rgba(196,162,74,0.7)' }}>
            GETTING STARTED
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.1em', color: '#5C6166' }}>
            {completedCount} of 4 steps complete
          </span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: '0.42rem', letterSpacing: '0.15em', color: 'rgba(196,162,74,0.6)' }}>
          CONTINUE →
        </span>
      </div>
    )
  }

  return (
    <div
      className="mb-8 rounded-sm"
      style={{
        background:  'rgba(196,162,74,0.04)',
        border:      '1px solid rgba(196,162,74,0.15)',
        borderTop:   '3px solid #C4A24A',
        padding:     '1.5rem 2rem',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span style={{ fontFamily: 'monospace', fontSize: '0.44rem', letterSpacing: '0.3em', color: 'rgba(196,162,74,0.9)' }}>
            GETTING STARTED
          </span>
          {/* Progress pills */}
          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <div
                key={s.number}
                style={{
                  width:        '20px',
                  height:       '4px',
                  borderRadius: '2px',
                  background:   completion[s.completedWhen as keyof typeof completion]
                    ? 'rgba(196,162,74,0.8)'
                    : s.number === currentStep.number
                      ? 'rgba(196,162,74,0.3)'
                      : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '0.4rem', letterSpacing: '0.1em', color: '#5C6166' }}>
            {completedCount}/4
          </span>
        </div>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5C6166', fontSize: '1rem', lineHeight: 1, padding: '2px 4px' }}
          aria-label="Dismiss getting started guide"
        >
          ×
        </button>
      </div>

      {showComplete ? (
        <div>
          <p className="font-serif font-semibold" style={{ fontSize: '1.2rem', color: '#F0EDE6', marginBottom: '0.4rem' }}>
            Your archive is ready.
          </p>
          <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.6 }}>
            The journey begins tonight at 9pm.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-6">
          <div style={{ flexShrink: 0 }}>
            <span className="font-serif" style={{ fontSize: '3rem', fontWeight: 700, color: 'rgba(196,162,74,0.25)', lineHeight: 1 }}>
              {currentStep.number}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-serif font-bold" style={{ fontSize: '1.15rem', color: '#F0EDE6', marginBottom: '0.4rem' }}>
              {currentStep.title}
            </p>
            <p className="font-serif italic" style={{ fontSize: '0.9rem', color: '#9DA3A8', lineHeight: 1.6, marginBottom: '1rem' }}>
              {currentStep.description}
            </p>
            <Link
              href={currentStep.buttonHref}
              className="no-underline inline-block"
              style={{
                fontFamily:    'monospace',
                fontSize:      '0.44rem',
                letterSpacing: '0.25em',
                color:         '#0A0908',
                background:    '#C4A24A',
                padding:       '0.55rem 1.25rem',
                borderRadius:  '2px',
              }}
            >
              {currentStep.buttonLabel}
            </Link>

            {/* Completed steps */}
            {completedCount > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {STEPS.filter(s => completion[s.completedWhen as keyof typeof completion]).map(s => (
                  <span key={s.number} style={{ fontFamily: 'monospace', fontSize: '0.38rem', letterSpacing: '0.1em', color: 'rgba(196,162,74,0.6)' }}>
                    ✓ {s.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
