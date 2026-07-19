import { useT } from '../i18n/useT'
import { Logo } from '../components/Logo'
import { LangToggle } from '../components/LangToggle'
import { useApprovedPhotos, PhotoWall } from './Album'

export function Favourites() {
  const t = useT()
  const items = useApprovedPhotos(true)
  return (
    <div className="paper min-h-full">
      <div className="max-w-column mx-auto px-5 py-5">
        <header className="flex justify-between items-center mb-5">
          <Logo variant="emboss" size="sm" />
          <LangToggle />
        </header>
        <h1 className="font-display text-2xl text-[var(--ink-fountain)] mb-4">{t('favourites')}</h1>
        <PhotoWall items={items} empty={t('noFavourites')} />
      </div>
    </div>
  )
}
