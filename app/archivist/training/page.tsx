export default function TrainingPage() {
  const QUESTIONS = [
    {
      num:         '01',
      question:    'Who is the person you most wish you could still talk to?',
      instruction: 'Let them answer. Do not interrupt. Everyone has someone. Find out who.',
    },
    {
      num:         '02',
      question:    'What would you give to have one more conversation with them?',
      instruction: 'Let them feel it. This is not manipulation. This is truth. Honor it.',
    },
    {
      num:         '03',
      question:    'What if your grandchildren could have that conversation with you \u2014 not a recording, an actual conversation \u2014 forty years from now?',
      instruction: 'The product sells itself from here. Your job is to schedule the next step.',
    },
  ]

  const OBJECTIONS = [
    {
      objection: '\u201cI\u2019ll think about it.\u201d',
      response:  'There is nothing to think about. The only question is whether your family will have this or they won\u2019t. Schedule the follow-up before you leave.',
    },
    {
      objection: '\u201cIt\u2019s too expensive.\u201d',
      response:  'Compare it to the cost of a will and trust. $2,500 for an attorney engagement that establishes a legal asset in your estate. It is not expensive. It is exactly priced.',
    },
    {
      objection: '\u201cI\u2019m not ready yet.\u201d',
      response:  'Nobody is ready. The families who did not start are the ones who wish they had. What are you waiting for that is more important than this?',
    },
    {
      objection: '\u201cLet me talk to my spouse / children first.\u201d',
      response:  'Invite them to the next conversation. This is a family decision. You want everyone in the room. Schedule the next step for all of them.',
    },
  ]

  return (
    <div className="max-w-3xl flex flex-col gap-16">

      <div>
        <p className="font-sans text-[0.62rem] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#C4A24A' }}>Training</p>
        <h1 className="font-serif font-semibold text-text-primary tracking-[-0.025em]" style={{ fontSize: 'clamp(1.8rem,3vw,2.5rem)' }}>
          The Basalith Conversation
        </h1>
      </div>

      {/* ── FRAMEWORK ── */}
      <div>
        <p className="font-sans text-[0.58rem] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: '#C4A24A' }}>The Conversation Framework</p>
        <h2 className="font-serif font-semibold text-text-primary tracking-[-0.025em] mb-4" style={{ fontSize: '1.75rem' }}>Three questions. The product closes itself.</h2>
        <p className="font-sans font-light text-text-secondary leading-[1.82] mb-12" style={{ fontSize: '1rem' }}>
          Every sale begins with the same three questions. In this order. Without deviation.
          Your only job is to listen to the answers.
        </p>

        <div className="flex flex-col gap-12">
          {QUESTIONS.map(({ num, question, instruction }) => (
            <div key={num} className="flex gap-6 items-start">
              <span
                className="font-serif font-semibold select-none flex-shrink-0 leading-none"
                style={{ fontSize: 'clamp(3.5rem,6vw,5rem)', color: 'rgba(255,255,255,0.04)', letterSpacing: '-0.04em' }}
                aria-hidden="true"
              >
                {num}
              </span>
              <div className="pt-2">
                <p className="font-serif italic text-text-primary leading-[1.55] mb-3" style={{ fontSize: '1.1rem' }}>
                  &ldquo;{question}&rdquo;
                </p>
                <p className="font-sans text-[0.8rem] text-text-muted leading-[1.75]">{instruction}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="h-px my-10" style={{ background: 'rgba(196,162,74,0.18)' }} />
        <p className="font-serif italic text-text-secondary leading-[1.8] text-center" style={{ fontSize: '1rem' }}>
          The urgency is real. Every day someone does not start their archive is a day their family will never recover.
        </p>
      </div>

      {/* ── OBJECTION HANDLING ── */}
      <div>
        <p className="font-sans text-[0.58rem] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: '#C4A24A' }}>Objection Handling</p>
        <h2 className="font-serif font-semibold text-text-primary tracking-[-0.025em] mb-8" style={{ fontSize: '1.75rem' }}>Every objection has one answer.</h2>
        <div className="flex flex-col gap-5">
          {OBJECTIONS.map(({ objection, response }) => (
            <div key={objection} className="rounded-sm border border-border-subtle p-6" style={{ background: '#111112' }}>
              <p className="font-serif italic text-text-primary mb-3" style={{ fontSize: '1rem' }}>{objection}</p>
              <p className="font-sans text-[0.82rem] text-text-secondary leading-[1.75]">{response}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOUNDING WALKTHROUGH ── */}
      <div>
        <p className="font-sans text-[0.58rem] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: '#C4A24A' }}>The Founding Session</p>
        <h2 className="font-serif font-semibold text-text-primary tracking-[-0.025em] mb-6" style={{ fontSize: '1.75rem' }}>What happens during The Founding.</h2>
        <div className="rounded-sm border border-border-subtle p-8" style={{ background: '#111112' }}>
          <div className="flex flex-col gap-6">
            {[
              { step: '01', title: 'Introduction & Scope',      desc: 'The assigned Senior Legacy Guide meets with the family. Roles are explained. Scope is defined. The relationship begins.' },
              { step: '02', title: 'Legal Instrument Review',   desc: 'Existing will, trust, and estate documents are reviewed for archive compatibility. Attorney-ready output is produced.' },
              { step: '03', title: 'Archive Architecture',      desc: 'The digital estate structure is configured. Storage, access tiers, and generational transfer settings are established.' },
              { step: '04', title: 'Family Network Setup',      desc: 'Up to 15 family contributors are onboarded. Roles are assigned. Access levels are configured and documented.' },
              { step: '05', title: 'Founding Essence Session',  desc: 'The first live labeling session — 90 minutes. This is where it becomes real. A Senior Legacy Guide guides the family.' },
              { step: '06', title: 'Custodian Designation',     desc: 'The archive\'s legal custodian is formally assigned and documented with estate standing. The Founding is complete.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5">
                <span className="font-sans text-[0.62rem] font-bold tracking-[0.12em] flex-shrink-0 mt-0.5 w-7" style={{ color: '#C4A24A' }}>{step}</span>
                <div>
                  <p className="font-sans text-[0.85rem] font-semibold text-text-primary mb-1">{title}</p>
                  <p className="font-serif italic text-[0.88rem] text-text-secondary leading-[1.65]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
