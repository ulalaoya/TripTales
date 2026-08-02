import { useRef } from 'react'
import { useT } from '../i18n/useT'
import type { ActivityAttachment } from '../types'
import { Icon } from './Icon'

interface Props {
  value: ActivityAttachment[]
  onChange: (a: ActivityAttachment[]) => void
}

/**
 * "צירוף פרטי טיסה/הזמנה" — booking details attached to an activity.
 *
 * A LIST, not a single slot (Galli feedback): one activity often needs a link to
 * the attraction AND a link to the tickets. Each attachment gets its own row.
 *
 * The old mode-switch was removed too: it repeated "העלאת צילום" twice — once as
 * the selected mode and once as the action — which read as a duplicate control.
 * Now there are simply two "add" buttons.
 */
export function AttachmentField({ value, onChange }: Props) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const list = value ?? []

  function patch(index: number, next: Partial<ActivityAttachment>) {
    onChange(list.map((a, i) => (i === index ? { ...a, ...next } : a)))
  }

  function remove(index: number) {
    onChange(list.filter((_, i) => i !== index))
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again later
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      onChange([...list, { kind: 'photo', value: String(reader.result), label: file.name }])
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <span className="block text-sm font-medium mb-1">{t('attachTitle')}</span>

      {list.length > 0 && (
        <ul className="space-y-2 mb-2">
          {list.map((a, i) => (
            <li key={i} className="rounded-[14px] border border-[var(--line)] bg-white p-2">
              <div className="flex items-center gap-2">
                {a.kind === 'photo' ? (
                  <img
                    src={a.value}
                    alt={a.label ?? t('attachTitle')}
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10 }}
                  />
                ) : (
                  <Icon name="share" size={18} className="text-[var(--sea)] shrink-0" />
                )}

                {a.kind === 'link' ? (
                  <input
                    type="url"
                    dir="ltr"
                    value={a.value}
                    onChange={(e) => patch(i, { value: e.target.value })}
                    placeholder={t('attachLinkPlaceholder')}
                    aria-label={t('attachModeLink')}
                    className="tap flex-1 min-w-0 rounded-[12px] px-2 py-1.5 bg-white border border-[var(--line)] outline-none text-sm"
                  />
                ) : (
                  <span className="flex-1 min-w-0 truncate text-sm">{a.label}</span>
                )}

                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={t('attachRemove')}
                  className="tap p-1.5 text-[var(--danger)] shrink-0"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              {a.kind === 'link' && (
                <input
                  value={a.label ?? ''}
                  onChange={(e) => patch(i, { label: e.target.value || undefined })}
                  placeholder={t('attachLabelPlaceholder')}
                  aria-label={t('attachLabelPlaceholder')}
                  className="tap w-full mt-2 rounded-[12px] px-2 py-1.5 bg-white border border-[var(--line)] outline-none text-sm"
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="tap inline-flex items-center gap-1 px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm"
        >
          <Icon name="camera" size={16} />
          {t('attachAddPhoto')}
        </button>
        <button
          type="button"
          onClick={() => onChange([...list, { kind: 'link', value: '' }])}
          className="tap inline-flex items-center gap-1 px-3 py-2 rounded-[14px] bg-white border border-[var(--line)] text-sm"
        >
          <Icon name="share" size={16} />
          {t('attachAddLink')}
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  )
}
