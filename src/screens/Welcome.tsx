import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useT } from '../i18n/useT'
import { isValidIsraeliPhone, normalizePhone } from '../lib/phone'
import { sendOtpStub } from '../lib/firebaseAuth'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'
import { Avatar } from '../components/Avatar'

// Decorative family avatars on the cover (identity comes from the phone, not these).
const DECOR: { figure: any; color: string }[] = [
  { figure: 'camera', color: 'linear-gradient(145deg,#42b8d4,#67d3bd)' },
  { figure: 'surfboard', color: 'linear-gradient(145deg,#ff6b66,#ff9a78)' },
  { figure: 'balloon', color: 'linear-gradient(145deg,#f5bd4d,#f19845)' },
  { figure: 'crown', color: 'linear-gradient(145deg,#8b80db,#b09de7)' },
]

export function Welcome() {
  const t = useT()
  const login = useStore((s) => s.login)
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidIsraeliPhone(phone)) {
      setError(true)
      return
    }
    setError(false)
    // Firebase Phone OTP is stubbed — the prototype trusts the typed number.
    await sendOtpStub(normalizePhone(phone))
    const res = login(phone)
    if (res.kind === 'known') {
      navigate('/trips')
    } else {
      navigate('/join', { state: { phone: res.phone } })
    }
  }

  return (
    <div className="welcome-bg min-h-full flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-column flex justify-end mb-4">
        <LangToggle />
      </div>

      <div className="flex-1 w-full max-w-column flex flex-col items-center justify-center gap-7 text-center">
        <div className="flex flex-col items-center gap-3">
          <Logo variant="plaque" size="lg" />
          <p className="text-base text-[var(--muted)]">{t('tagline')}</p>
        </div>

        {/* White card holding the phone form */}
        <div className="welcome-card w-full p-6 flex flex-col items-center gap-5">
          {/* Decorative family avatars */}
          <div className="flex gap-3 justify-center" aria-hidden>
            {DECOR.map((d, i) => (
              <Avatar key={i} figure={d.figure} color={d.color} size={48} />
            ))}
          </div>

          <form onSubmit={submit} className="w-full flex flex-col items-center gap-3">
            <label htmlFor="phone" className="text-sm text-[var(--muted)]">
              {t('welcomeSub')}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('phonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={error}
              aria-describedby="phone-err"
              className="tap w-full text-center text-lg tracking-wide rounded-[14px] px-4 py-3 text-[var(--ink)] bg-white border border-[var(--line)] outline-none"
            />
            <div id="phone-err" aria-live="polite" className="min-h-[1.25rem] text-sm text-[var(--danger)]">
              {error ? t('phoneError') : ''}
            </div>
            <button type="submit" className="primary-btn tap w-full py-3 text-lg">
              {t('login')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
