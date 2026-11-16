import { html, nothing } from 'lit-html'
import '~icons/lucide/circle-user-round'

const personInCircleIcon = html`<icon-lucide-circle-user-round aria-hidden="true" focusable="false" style="width:48px;height:48px;color:#D9E1F2"></icon-lucide-circle-user-round>`

const showHeadingImageFallback = (event: Event) => {
  const image = event.currentTarget as HTMLImageElement | null
  const frame = image?.parentElement
  if (!image || !frame) return

  image.hidden = true
  frame.classList.add('profile__image-frame--fallback')
}

export const Image = (src?: string, alt?: string) => html`
  <div class=${src ? 'profile__image-frame' : 'profile__image-frame profile__image-frame--fallback'}>
    ${src
      ? html`
          <img
            class="profile__hero"
            src=${src}
            alt=${alt || ''}
            width="140"
            height="140"
            loading="eager"
            @error=${showHeadingImageFallback}
          />
        `
      : nothing}
    <div class="profile__hero-alt" role="img" aria-label=${alt || ''}>
      <span class="profile__hero-icon">${personInCircleIcon}</span>
    </div>
  </div>
`
