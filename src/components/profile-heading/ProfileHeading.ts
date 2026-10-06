import { customElement, WebComponent } from 'solid-ui'
import { html, nothing, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import 'solid-ui/components/button'
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
                <path d="M32.0007 58.6666C46.7282 58.6666 58.6673 46.7275 58.6673 31.9999C58.6673 17.2723 46.7282 5.33325 32.0007 5.33325C17.2731 5.33325 5.33398 17.2723 5.33398 31.9999C5.33398 46.7275 17.2731 58.6666 32.0007 58.6666Z" stroke="#CBD5E1" stroke-width="5.33333" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M32 34.6667C36.4183 34.6667 40 31.085 40 26.6667C40 22.2485 36.4183 18.6667 32 18.6667C27.5817 18.6667 24 22.2485 24 26.6667C24 31.085 27.5817 34.6667 32 34.6667Z" stroke="#CBD5E1" stroke-width="5.33333" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M18.666 55.0986V50.6666C18.666 49.2521 19.2279 47.8955 20.2281 46.8954C21.2283 45.8952 22.5849 45.3333 23.9993 45.3333H39.9993C41.4138 45.3333 42.7704 45.8952 43.7706 46.8954C44.7708 47.8955 45.3327 49.2521 45.3327 50.6666V55.0986" stroke="#CBD5E1" stroke-width="5.33333" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </div>
          </div>
        </div>

        <div class="info">
          <header class="header-bar">
            <div class="identity" role="group" aria-label="Name and pronouns">
              <h1 id="profile-heading-name" class="name">${profile.name}</h1>
              ${profile.pronouns ? html`<span class="pronouns">(${profile.pronouns})</span>` : nothing}
            </div>
            ${profile.jobTitle ? html`<div class="role">${profile.jobTitle}</div>` : nothing}
          </header>
        </div>

        ${this.canEdit
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
        return html`<svg viewBox="0 0 16 16"><path d="M2 6h12v8H2zM4 2v4m4-4v4m4-4v4M2 9c2 0 2 2 4 2s2-2 4-2 2 2 4 2"></path></svg>`
      case 'location':
        return html`<svg viewBox="0 0 16 16"><path d="M13 6.5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 1 1 10 0Z"></path><circle cx="8" cy="6.5" r="1.7"></circle></svg>`
      case 'phone':
        return html`<svg viewBox="0 0 16 16"><path d="M5 2H3a1 1 0 0 0-1 1c0 6.1 4.9 11 11 11a1 1 0 0 0 1-1v-2l-3-1-1 2c-2.5-1-4-2.5-5-5l2-1z"></path></svg>`
      case 'email':
        return html`<svg viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="10" rx="1"></rect><path d="m2 4 6 5 6-5"></path></svg>`
    }
  }

  private renderEditIcon (): TemplateResult {
    return html`
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="3 3 14 14" fill="none" aria-hidden="true" focusable="false">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M14.3063 3.34814C14.9271 3.34832 15.5236 3.59563 15.9625 4.03467C16.4012 4.47362 16.648 5.06935 16.6481 5.68994C16.648 6.31072 16.4004 6.90719 15.9615 7.34619L15.9606 7.34521L7.95373 15.355L7.95275 15.356C7.73845 15.5696 7.47464 15.7278 7.18517 15.8159H7.1842L4.57287 16.6079H4.57092C4.40678 16.6572 4.23224 16.6614 4.06603 16.6196C3.89974 16.5778 3.74793 16.4918 3.62658 16.3706C3.50526 16.2494 3.41865 16.0974 3.37658 15.9312C3.33472 15.7651 3.3383 15.5903 3.38732 15.4263L3.3883 15.4243L4.18127 12.813V12.811C4.27013 12.5215 4.42882 12.2574 4.64318 12.0435L12.651 4.03467V4.03369C13.09 3.59513 13.6857 3.34816 14.3063 3.34814ZM5.56213 12.9634C5.49841 13.0269 5.4509 13.1059 5.42443 13.1919L5.42345 13.1909L4.82189 15.1733L6.80627 14.5718C6.89221 14.5456 6.97114 14.4985 7.03478 14.4351L13.274 8.19482L11.8014 6.72217L5.56213 12.9634ZM14.3063 4.64893C14.0303 4.64894 13.7652 4.75864 13.5699 4.95361L12.7213 5.80225L14.194 7.2749L15.0426 6.42627L15.1119 6.3501C15.2635 6.16488 15.3473 5.93141 15.3473 5.68994C15.3472 5.41394 15.2377 5.14881 15.0426 4.95361C14.8474 4.75846 14.5823 4.64906 14.3063 4.64893Z" fill="#1E2939"></path>
      </svg>
    `
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
