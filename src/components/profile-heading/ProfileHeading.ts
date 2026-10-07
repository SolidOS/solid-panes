import { customElement, WebComponent } from 'solid-ui'
import { html, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import 'solid-ui/components/button'
import '~icons/lucide/calendar-days'
import '~icons/lucide/circle-user-round'
import '~icons/lucide/mail'
import '~icons/lucide/map-pin'
import '~icons/lucide/pencil'
import '~icons/lucide/phone'
import styles from './ProfileHeading.styles.css'

export interface ProfileHeadingPoint {
  valueNode?: unknown
}

export interface ProfileHeadingData {
  name: string
  imageSrc?: string
  location?: string
  pronouns?: string
  dateOfBirth?: string
  jobTitle?: string
  primaryPhone?: ProfileHeadingPoint
  primaryEmail?: ProfileHeadingPoint
}

@customElement('solid-panes-profile-heading')
export default class ProfileHeading extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor profileData: ProfileHeadingData | undefined = undefined

  @property({ type: Boolean })
  accessor canEdit = false

  @property({ type: Boolean, reflect: true })
  accessor compact = false

  @state()
  accessor failedImageSrc: string | undefined = undefined

  private handleEdit = () => {
    this.dispatchEvent(new CustomEvent('solid-panes-profile-heading-edit', {
      bubbles: true,
      composed: true
    }))
  }

  private handleImageError = (event: Event) => {
    this.failedImageSrc = (event.currentTarget as HTMLImageElement).getAttribute('src') ?? undefined
  }

  render (): TemplateResult<1> {
    const profile = this.profileData
    if (!profile) return html``

    const phone = textValue(profile.primaryPhone?.valueNode).replace(/^tel:/i, '')
    const email = textValue(profile.primaryEmail?.valueNode).replace(/^mailto:/i, '')
    const dateOfBirth = displayDate(profile.dateOfBirth)
    const showImage = Boolean(profile.imageSrc && this.failedImageSrc !== profile.imageSrc)

    return html`
      <section class="profile-heading" aria-labelledby="profile-heading-name">
        <div class="avatar">
          <div class="image-frame ${showImage ? '' : 'image-frame--fallback'}">
            ${showImage
              ? html`<img
                  class="hero"
                  src=${profile.imageSrc}
                  alt=${profile.name}
                  width="140"
                  height="140"
                  loading="eager"
                  @error=${this.handleImageError}
                />`
              : nothing}
              <div class="hero-fallback" role="img" aria-label=${profile.name}>
                <icon-lucide-circle-user-round aria-hidden="true"></icon-lucide-circle-user-round>
              </div>
          </div>
        </div>

        <div class="info">
          <header class="header-bar">
            <div class="identity" role="group" aria-label=${this.compact ? 'Name' : 'Name and pronouns'}>
              <h1 id="profile-heading-name" class="name">${profile.name}</h1>
              ${profile.pronouns ? html`<span class="pronouns" ?hidden=${this.compact}>(${profile.pronouns})</span>` : nothing}
            </div>
            ${profile.jobTitle ? html`<div class="role">${profile.jobTitle}</div>` : nothing}
          </header>
        </div>

        ${this.canEdit && !this.compact
          ? html`
            <div class="profile__actions profile__heading-edit-action">
              <solid-ui-button
                variant="tertiary"
                class="profile-section-collapsible__edit-button desktop-edit-button"
                aria-label="Add or edit heading information"
                @click=${this.handleEdit}
              >
                <span slot="left-icon" class="profile-section-collapsible__action-label profile__add-more-icon" aria-hidden="true">
                  ${this.renderEditIcon()}
                </span>
                <span class="profile-section-collapsible__action-label edit-label">Edit</span>
              </solid-ui-button>
              <solid-ui-button
                variant="ghost"
                class="profile-section-collapsible__edit-button mobile-edit-button"
                aria-label="Add or edit heading information"
                @click=${this.handleEdit}
              >
                <span slot="icon" class="profile-section-collapsible__edit-icon" aria-hidden="true">
                  ${this.renderEditIcon()}
                </span>
              </solid-ui-button>
            </div>
          `
          : nothing}

        <div class="details-collapse" aria-hidden=${this.compact ? 'true' : 'false'} ?inert=${this.compact}>
          <div class="details">
            <div class="detail-row" role="group" aria-label="Additional profile information">
              ${this.renderLine(dateOfBirth, 'birthday')}
              ${this.renderLine(profile.location, 'location')}
            </div>
            <div class="detail-row" role="group" aria-label="Contact information">
              ${this.renderLine(phone, 'phone')}
              ${this.renderLine(email, 'email')}
            </div>
          </div>
        </div>
      </section>
    `
  }

  private renderLine (value: string | undefined, icon: 'birthday' | 'location' | 'phone' | 'email') {
    if (!value) return nothing

    return html`
      <div class="detail-item">
        <span class="detail-icon" aria-hidden="true">
          ${this.renderIcon(icon)}
        </span>
        <span class="detail-value">${value}</span>
      </div>
    `
  }

  private renderIcon (icon: 'birthday' | 'location' | 'phone' | 'email'): TemplateResult {
    switch (icon) {
      case 'birthday':
        return html`<icon-lucide-calendar-days aria-hidden="true"></icon-lucide-calendar-days>`
      case 'location':
        return html`<icon-lucide-map-pin aria-hidden="true"></icon-lucide-map-pin>`
      case 'phone':
        return html`<icon-lucide-phone aria-hidden="true"></icon-lucide-phone>`
      case 'email':
        return html`<icon-lucide-mail aria-hidden="true"></icon-lucide-mail>`
    }
  }

  private renderEditIcon (): TemplateResult {
    return html`<icon-lucide-pencil aria-hidden="true"></icon-lucide-pencil>`
  }
}

function textValue (value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value?: unknown }).value
    return typeof nested === 'string' ? nested : ''
  }
  return ''
}

function displayDate (value?: string): string {
  const raw = (value || '').trim()
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return `${day}-${month}-${year}`
  }

  const dmyDate = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dmyDate) {
    const [, day, month, year] = dmyDate
    return `${day}-${month}-${year}`
  }

  return raw
}
