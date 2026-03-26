'use client'

import { useState, useEffect } from 'react'

type Contributor = {
  id:        string
  name:      string
  email:     string
  role:      string
  addedAt:   string
  itemCount: number
}

const ROLES = ['Family Member', 'Close Friend', 'Archivist', 'Curator', 'Researcher']
const INITIAL = { name: '', email: '', role: '' }

export default function ContributorsClient({ archiveId }: { archiveId: string }) {
  // archiveId is available for future API calls
  void archiveId

  const [contributors, setContributors] = useState<Contributor[]>([])
  const [form, setForm]                 = useState(INITIAL)
  const [adding, setAdding]             = useState(false)
  const [showForm, setShowForm]         = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('archive-contributors')
      if (stored) setContributors(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const items: { contributor: string }[] = JSON.parse(localStorage.getItem('archive-items') || '[]')
      setContributors(prev => prev.map(c => ({
        ...c,
        itemCount: items.filter(i => i.contributor === c.name).length,
      })))
    } catch {}
  }, [])

  function set(key: keyof typeof INITIAL) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function save(cs: Contributor[]) {
    setContributors(cs)
    localStorage.setItem('archive-contributors', JSON.stringify(cs))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const newC: Contributor = {
      id:        crypto.randomUUID(),
      name:      form.name,
      email:     form.email,
      role:      form.role,
      addedAt:   new Date().toISOString(),
      itemCount: 0,
    }
    save([...contributors, newC])
    setForm(INITIAL)
    setShowForm(false)
    setAdding(false)
  }

  function remove(id: string) {
    save(contributors.filter(c => c.id !== id))
  }

  const inputCls   = 'w-full bg-transparent font-sans text-[0.82rem] placeholder:text-[#3A3F44] focus:outline-none pb-2 transition-colors duration-200'
  const inputStyle = { color: '#F0F0EE', borderBottom: '1px solid rgba(255,255,255,0.10)' }
  const labelCls   = 'font-sans text-[0.56rem] font-bold tracking-[0.14em] uppercase block mb-2'
  const labelStyle = { color: '#5C6166' }

  return (
    <div className="max-w-3xl mx-auto">

      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p className="eyebrow mb-3">Contributors</p>
          <h1 className="font-serif font-semibold leading-[0.95] tracking-[-0.03em]"
              style={{ fontSize: 'clamp(1.8rem,3vw,2.4rem)', color: '#F0F0EE' }}>
            Archive Access
          </h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-monolith-amber shrink-0 !py-2.5 !px-5 !text-[0.7rem]">
          {showForm ? 'Cancel' : 'Add Contributor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="rounded-sm border px-7 py-7 mb-8" style={{ background: '#111112', borderColor: 'rgba(196,162,74,0.15)' }}>
          <p className="font-sans text-[0.62rem] tracking-[0.14em] uppercase mb-6" style={{ color: 'rgba(196,162,74,0.7)' }}>New Contributor</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            <div>
              <label className={labelCls} style={labelStyle}>Full Name</label>
              <input type="text" required placeholder="Jane Whitmore" value={form.name} onChange={set('name')} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Email</label>
              <input type="email" required placeholder="jane@example.com" value={form.email} onChange={set('email')} className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Role</label>
              <select required value={form.role} onChange={set('role')} className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="" disabled style={{ background: '#111112' }}>Select role</option>
                {ROLES.map(r => <option key={r} value={r} style={{ background: '#111112' }}>{r}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={adding} className="btn-monolith-amber disabled:opacity-50">
            {adding ? 'Adding…' : 'Add to Archive'}
          </button>
        </form>
      )}

      {contributors.length === 0 && (
        <div className="text-center py-20">
          <p className="font-serif font-light" style={{ color: '#3A3F44', fontSize: '1rem' }}>
            No contributors yet. Add the first person to this archive.
          </p>
        </div>
      )}

      {contributors.length > 0 && (
        <div className="rounded-sm border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#111112' }}>
                {['Name', 'Role', 'Labels', 'Added', ''].map(h => (
                  <th key={h} className="font-sans text-[0.56rem] tracking-[0.12em] uppercase text-left px-5 py-3" style={{ color: '#3A3F44', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < contributors.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: '#111112' }}>
                  <td className="px-5 py-4">
                    <p className="font-sans text-[0.8rem]" style={{ color: '#F0F0EE' }}>{c.name}</p>
                    <p className="font-sans text-[0.62rem] mt-0.5" style={{ color: '#3A3F44' }}>{c.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-sans text-[0.6rem] tracking-[0.08em] uppercase px-2 py-1 rounded-sm" style={{ background: 'rgba(255,255,255,0.05)', color: '#9DA3A8' }}>
                      {c.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-serif font-semibold" style={{ color: '#F0F0EE', fontSize: '1.1rem' }}>{c.itemCount}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-sans text-[0.65rem]" style={{ color: '#5C6166' }}>
                      {new Date(c.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => remove(c.id)} className="font-sans text-[0.6rem] tracking-[0.08em] uppercase transition-colors duration-200" style={{ color: '#3A3F44' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 px-6 py-5 rounded-sm border" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'transparent' }}>
        <p className="font-sans text-[0.65rem] leading-relaxed" style={{ color: '#3A3F44' }}>
          Contributors are individuals who have been granted access to label and annotate memories within this archive.
          All labeled memories are attributed to the contributor&apos;s name as recorded here.
        </p>
      </div>

    </div>
  )
}
