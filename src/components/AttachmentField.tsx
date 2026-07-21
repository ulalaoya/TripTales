import { useRef, useState } from 'react'
import { useT } from '../i18n/useT'
import type { ActivityAttachment } from '../types'
import { Icon } from './Icon'

interface Props {
  value?: ActivityAttachment
  onChange: (a: ActivityAttachment | undefined) => void
}

/**
 * "צירוף פרטי טיסה/הזמנה" (Galli feedback #9) — attach booking details to an
 * activity, either as an uploaded screenshot (stored as a data-URL) or as a
 * pasted confirmation link.
 */
export function AttachmentField({ value, onChange }: Props) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'photo' | 'link'>(value?.kind ?? 'photo')

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange({ kind: 'photo', value: String(reader.result), label: file.name })
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <span className="block text-sm font-medium mb-1">{t('attachTitle')}</span>

      <div
        className="inline-flex rounded-[14px] overflow-hidden border border-[var(--line)] bg-white mb-2"
        role="radiogroup"
        aria-label={t('attachTitle')}
      >
        {(['photo', 'link'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`tap inline-flex items-center gap-1 px-3 py-2 text-xs font-medium ${
              mode === m ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink)]'
            }`}
          >
            <Icon name={m === 'photo' ? 'camera' : 'share'} size={16} />
            {m === 'photo' ? t('attachModePhoto') : t('attachModeLink')}
          </button>
        ))}
      </div>

      {mode === 'photo' ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="tap inline-flex items-center gap-1 px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm"
          >
            <Icon name="camera" size={16} />
            {t('attachModePhoto')}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          {value?.kind === 'photo' && (
            <img
              src={value.value}
              alt={value.label ?? t('attachTitle')}
              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 12 }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="url"
            dir="ltr"
            value={value?.kind === 'link' ? value.value : ''}
            onChange={(e) =>
              onChange(
                e.target.value.trim()
                  ? { kind: 'link', value: e.target.value.trim(), label: value?.label }
                  : undefined,
              )
            }
            placeholder={t('attachLinkPlaceholder')}
            aria-label={t('attachModeLink')}
            className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
          />
          {value?.kind === 'link' && (
            <input
              value={value.label ?? ''}
              onChange={(e) => onChange({ ...value, label: e.target.value || undefined })}
              placeholder={t('attachLabelPlaceholder')}
              aria-label={t('attachLabelPlaceholder')}
              className="tap w-full rounded-[14px] px-3 py-2 bg-white border border-[var(--line)] outline-none text-sm"
            />
          )}
        </div>
      )}

      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="tap inline-flex items-center gap-1 mt-2 px-3 py-2 rounded-[14px] border border-[var(--line)] bg-white text-xs text-[var(--danger)]"
        >
          <Icon name="close" size={14} />
          {t('attachRemove')}
        </button>
      )}
    </div>
  )
}
