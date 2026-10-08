import { authn, store } from 'solid-logic'
import type { NamedNode } from 'rdflib'
import { customElement, WebComponent } from 'solid-ui'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { createHeadingEditDialog } from './editor/sections/heading/HeadingEditDialog'
import type { ProfileDetails } from './editor/sections/heading/types'
import type { ViewerMode } from './profileHeadingData'
import { addFriend, checkFriend, friendTexts } from './friendActions'
import { formatDisplayError } from './editor/utils/errorDisplay'
import 'solid-ui/components/button'
import '~icons/lucide/cake'
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

export interface ProfileHeadingEditContext {
  subject: NamedNode
  profileData: ProfileDetails
  viewerMode: ViewerMode
  onSaved: () => Promise<void> | void
}

@customElement('solid-panes-profile-heading')
export default class ProfileHeading extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor profileData: ProfileHeadingData | undefined = undefined

  @property({ attribute: false })
  accessor editContext: ProfileHeadingEditContext | undefined = undefined

  @property({ attribute: false })
  accessor friendSubject: NamedNode | undefined = undefined

  @property({ type: Boolean, reflect: true })
  accessor compact = false

  @state()
  accessor failedImageSrc: string | undefined = undefined

  @state()
  accessor friendState: 'loading' | 'available' | 'exists' | 'saving' | 'error' = 'loading'

  @state()
  accessor friendMessage = ''

  @state()
  accessor friendError = false

  private friendRequest = 0
  private friendMessageTimer: ReturnType<typeof setTimeout> | undefined

  disconnectedCallback (): void {
    super.disconnectedCallback()
    this.clearFriendMessage()
  }

  private clearFriendMessage (): void {
    clearTimeout(this.friendMessageTimer)
    this.friendMessageTimer = undefined
    this.friendMessage = ''
  }

  protected willUpdate (changed: PropertyValues<this>): void {
    super.willUpdate(changed)
    if (!changed.has('friendSubject')) return
    const request = ++this.friendRequest
    this.friendState = 'loading'
    this.clearFriendMessage()
    this.friendError = false
    const subject = this.friendSubject
    const viewer = authn.currentUser()
    if (!subject || !viewer || viewer.sameTerm(subject)) return

    checkFriend(viewer, subject).then((exists) => {
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = exists ? 'exists' : 'available'
    }).catch((error: unknown) => {
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = 'error'
      this.showFriendMessage(error, true)
    })
  }

  private async showFriendMessage (message: unknown, error: boolean): Promise<void> {
    this.clearFriendMessage()
    this.friendMessage = formatDisplayError(message)
    this.friendError = error
    this.friendMessageTimer = setTimeout(() => {
      this.clearFriendMessage()
    }, 10000)
    await this.updateComplete
    this.shadowRoot?.querySelector<HTMLElement>('.friend-message')?.focus()
  }

  private handleAddFriend = async (event: Event): Promise<void> => {
    event.preventDefault()
    if (this.friendState !== 'available' && this.friendState !== 'error') return
    const subject = this.friendSubject
    if (!subject) return
    const request = this.friendRequest
    this.friendState = 'saving'
    this.clearFriendMessage()
    try {
      const viewer = authn.currentUser()
      if (!viewer) throw new Error(friendTexts.loginRequired)
      await addFriend(viewer, subject)
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = 'exists'
      await this.showFriendMessage(friendTexts.success, false)
    } catch (error: unknown) {
      if (request !== this.friendRequest || this.friendSubject !== subject) return
      this.friendState = 'error'
      await this.showFriendMessage(error, true)
    }
  }

  private handleEdit = (event: Event) => {
    const context = this.editContext
    if (!context) return

    createHeadingEditDialog(
      event,
      store,
      context.subject,
      context.profileData,
      context.viewerMode,
      async () => {
        this.dispatchEvent(new CustomEvent('profile-heading-saved', {
          bubbles: true,
          composed: true,
          detail: { subjectUri: context.subject.value }
        }))
        await context.onSaved()
      }
    ).catch((error: unknown) => {
      console.error('Failed to edit profile heading.', error)
    })
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
    const viewer = authn.currentUser()
    const showFriend = Boolean(this.friendSubject && viewer && !viewer.sameTerm(this.friendSubject))

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

        ${(this.editContext || showFriend) && !this.compact
          ? html`
            <div class="profile__actions profile__heading-edit-action">
              ${showFriend
                ? html`
                <div class="profile-friends-button__section" aria-label="Add me to your friends actions">
                  <solid-ui-button
                    variant="secondary"
                    class="profile__btn-friends"
                    ?disabled=${this.friendState === 'loading' || this.friendState === 'saving' || this.friendState === 'exists'}
                    aria-busy=${this.friendState === 'loading' || this.friendState === 'saving' ? 'true' : 'false'}
                    @click=${this.handleAddFriend}
                  >${this.friendState === 'exists' ? friendTexts.exists : friendTexts.add}</solid-ui-button>
                  ${this.friendMessage
                    ? html`
                    <div class="friend-message" role=${this.friendError ? 'alert' : 'status'}
                      aria-live=${this.friendError ? 'assertive' : 'polite'} tabindex="0">
                      ${this.friendMessage}
                    </div>`
                    : nothing}
                </div>
              `
                : nothing}
              ${this.editContext
                ? html`
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
              `
                : nothing}
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
        return html`<icon-lucide-cake aria-hidden="true"></icon-lucide-cake>`
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
