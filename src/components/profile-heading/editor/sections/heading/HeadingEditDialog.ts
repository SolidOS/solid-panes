import { openInputDialog } from '../../ui/dialog'
import { html, render, TemplateResult } from 'lit-html'
import 'solid-ui/components/button'
import 'solid-ui/components/combobox'
import 'solid-ui/components/combobox-option'
import { type ComboboxChangeEvent } from 'solid-ui/components/combobox'
import 'solid-ui/components/photo-capture'
import type { PhotoCapture } from 'solid-ui/components/photo-capture'
import { ProfileDetails, HeadingMutationPlan, ProfileBasicRow } from './types'
import { Image } from './imagePreview'
import '../../styles/EditDialogs.css'
import { LiveStore, NamedNode } from 'rdflib'
import { processHeadingMutations } from './mutations'
import { ViewerMode } from '../../types'
import {
  combinePhoneValue,
  splitPhoneValue
} from '../shared/phoneCountries'
import {
  normalizeEmailTypeForEdit,
  normalizePhoneTypeForEdit,
  toSavedHeadingEmailType,
  toSavedHeadingPhoneType
} from '../shared/contactTypeUtils'
import { applyRowFieldChange, applyRowSelectChange, summarizeRowOps } from '../shared/rowState'
import { hasNonEmptyText, sanitizeTextValue, toText, toTypeLabel } from '../../textUtils'
import {
  dialogCancelLabelText,
  dialogSubmitLabelText,
  editHeadingDialogTitleText,
  ownerLoginRequiredDialogMessageText,
  saveHeadingUpdatesFailedMessageText
} from '../../texts'
import '~icons/lucide/camera'
import { ContactAddressRow, ContactPointRow } from '../contactInfo/types'
import { sanitizeAddressFieldValue, sanitizeBasicInputFieldValue, sanitizeEmailValue, sanitizePhoneLocalValue } from '../shared/sanitizeUtils'
import { toStorageDateISO } from './dateHelpers'
import { invalidateResolvedPhotoDisplaySrc, resolvePhotoDisplaySrc, uploadPhotoFile } from './imageHelpers'
/* Note: new design - has address type in More Edit Contacts for now we will leave
         out Address Type, but a ticket will be created to add type later
         so I will keep the code and just comment it out for now.
         new design - has country code, will comment out code for now and create a ticket to add later. */

type HeadingFormState = {
  basicInfo: ProfileBasicRow
  email: ContactPointRow
  phone: ContactPointRow
  address: ContactAddressRow
  emailTypeWasMissing: boolean
  phoneTypeWasMissing: boolean
  pendingImageFile?: File | null
  imagePreviewSrc: string
  clearImagePreview: () => void
}

type HeadingContactTypeOption = {
  label: string
  value: string
}

type HeadingPronounsOption = {
  label: string
  value: string
}

type HeadingContactTypeKind = 'phone' | 'email'

const HEADING_PHONE_TYPE_OPTIONS: HeadingContactTypeOption[] = [
  { label: 'Mobile', value: 'Mobile' },
  { label: 'Home', value: 'Home' },
  { label: 'Work', value: 'Work' }
]

const HEADING_EMAIL_TYPE_OPTIONS: HeadingContactTypeOption[] = [
  { label: 'Personal', value: 'Personal' },
  { label: 'Office', value: 'Office' }
]

const HEADING_PRONOUN_OPTIONS: HeadingPronounsOption[] = [
  { label: 'He/Him', value: 'He/Him' },
  { label: 'She/Her', value: 'She/Her' },
  { label: 'They/Them', value: 'They/Them' }
]

type Row = ProfileBasicRow | ContactPointRow | ContactAddressRow

function isContactPointRow (row: Row): row is ContactPointRow {
  return 'value' in row
}

function isAddressRow (row: Row): row is ContactAddressRow {
  return 'streetAddress' in row
}

function isProfileBasicRow (row: Row): row is ProfileBasicRow {
  return 'name' in row
}

function normalizeHeadingContactTypeValue (value: string, options: HeadingContactTypeOption[]): string {
  return options.some((option) => option.value === value) ? value : options[0]?.value || ''
}

function getHeadingContactTypeOptions (kind: HeadingContactTypeKind): HeadingContactTypeOption[] {
  return kind === 'phone' ? HEADING_PHONE_TYPE_OPTIONS : HEADING_EMAIL_TYPE_OPTIONS
}

function withDefaultHeadingContactType (
  row: ContactPointRow,
  kind: HeadingContactTypeKind
): ContactPointRow {
  return {
    ...row,
    type: normalizeHeadingContactTypeValue(row.type || '', getHeadingContactTypeOptions(kind))
  }
}

function rowHasContent (row: Row): boolean {
  if (isContactPointRow(row)) {
    return hasNonEmptyText(row.value)
  }
  if (isAddressRow(row)) {
    return [
      row.streetAddress,
      row.locality,
      row.region,
      row.postalCode,
      row.countryName
    ].some(hasNonEmptyText)
  }
  if (isProfileBasicRow(row)) {
    return [
      row.name,
      row.nickname,
      row.imageSrc,
      row.location,
      row.pronouns,
      row.dateOfBirth
    ].some(hasNonEmptyText)
  }
  return false
}

function normalizePronounsValue (value: string | undefined): string {
  const normalized = sanitizeTextValue(value || '').toLowerCase().replace(/\s+/g, '')
  if (!normalized) return ''
  if (normalized === 'he' || normalized === 'he/him') return 'He/Him'
  if (normalized === 'she' || normalized === 'she/her') return 'She/Her'
  if (normalized === 'they' || normalized === 'they/them') return 'They/Them'
  return value || ''
}

function toFormState (profileData: ProfileDetails): HeadingFormState {
  const basicInfo: ProfileBasicRow = {
    name: sanitizeTextValue(toText(profileData.name)),
    nickname: sanitizeTextValue(toText(profileData.nickname || '')),
    imageSrc: sanitizeTextValue(toText(profileData.imageSrc || '')),
    location: sanitizeTextValue(toText(profileData.location || '')),
    pronouns: normalizePronounsValue(toText(profileData.pronouns || '')),
    dateOfBirth: sanitizeTextValue(toText(profileData.dateOfBirth || '')),
    entryNode: toText(profileData.entryNode),
    status: toText(profileData.entryNode) ? 'existing' as const : 'new' as const
  }
  const primaryEmail = profileData.primaryEmail
  const primaryPhone = profileData.primaryPhone
  const primaryAddress = profileData.primaryAddress
  const emailTypeWasMissing = !normalizeEmailTypeForEdit(primaryEmail?.type)
  const phoneTypeWasMissing = !normalizePhoneTypeForEdit(primaryPhone?.type)

  const normalizedEmailType = normalizeEmailTypeForEdit(primaryEmail?.type)
  const normalizedPhoneType = normalizePhoneTypeForEdit(primaryPhone?.type)

  const email: ContactPointRow = {
    value: sanitizeEmailValue(toText(primaryEmail?.valueNode).replace(/^mailto:/i, '')),
    type: normalizedEmailType,
    entryNode: toText(primaryEmail?.entryNode),
    status: toText(primaryEmail?.entryNode) ? 'existing' as const : 'new' as const
  }
  const phone: ContactPointRow = {
    value: sanitizeTextValue(
      toText(primaryPhone?.valueNode || primaryPhone?.entryNode || '').replace(/^tel:/i, '')
    ),
    type: normalizedPhoneType,
    entryNode: toText(primaryPhone?.entryNode || ''),
    status: toText(primaryPhone?.entryNode || '') ? 'existing' as const : 'new' as const
  }
  const address: ContactAddressRow = {
    streetAddress: sanitizeAddressFieldValue(toText(primaryAddress?.streetAddress)),
    locality: sanitizeAddressFieldValue(toText(primaryAddress?.locality)),
    region: sanitizeAddressFieldValue(toText(primaryAddress?.region)),
    postalCode: sanitizeAddressFieldValue(toText(primaryAddress?.postalCode)),
    countryName: sanitizeAddressFieldValue(toText(primaryAddress?.countryName)),
    type: toTypeLabel(primaryAddress?.type),
    entryNode: toText(primaryAddress?.entryNode),
    status: toText(primaryAddress?.entryNode) ? 'existing' as const : 'new' as const
  }

  return {
    basicInfo: (basicInfo) || { name: '', nickname: '', imageSrc: '', location: '', pronouns: '', dateOfBirth: '', entryNode: '', status: 'new' },
    email: (email) || { value: '', type: '', entryNode: '', status: 'new' },
    phone: (phone) || { value: '', type: '', entryNode: '', status: 'new' },
    address: (address) || { streetAddress: '', locality: '', region: '', postalCode: '', countryName: '', type: '', entryNode: '', status: 'new' },
    emailTypeWasMissing,
    phoneTypeWasMissing,
    imagePreviewSrc: '',
    clearImagePreview: () => undefined
  }
}

function setHeadingImagePreview (formState: HeadingFormState, file: File) {
  formState.clearImagePreview()

  if (typeof URL.createObjectURL !== 'function') {
    formState.imagePreviewSrc = ''
    formState.clearImagePreview = () => undefined
    return
  }

  const previewUrl = URL.createObjectURL(file)
  formState.imagePreviewSrc = previewUrl
  formState.clearImagePreview = () => {
    URL.revokeObjectURL(previewUrl)
    formState.imagePreviewSrc = ''
    formState.clearImagePreview = () => undefined
  }
}

function setResolvedHeadingPreview (formState: HeadingFormState, resolvedImageSrc?: string) {
  formState.clearImagePreview()

  if (!resolvedImageSrc) {
    return
  }

  formState.imagePreviewSrc = resolvedImageSrc

  formState.clearImagePreview = () => {
    formState.imagePreviewSrc = ''
    formState.clearImagePreview = () => undefined
  }
}

type ProfileBasicEditableField =
  | 'name'
  | 'nickname'
  | 'imageSrc'
  | 'pronouns'
  | 'dateOfBirth'

type ContactAddressEditableField =
  | 'streetAddress'
  | 'locality'
  | 'region'
  | 'postalCode'
  | 'countryName'

type ContactPhoneInputRowProps = {
  phone: ContactPointRow
}

type ContactEmailInputRowProps = {
  email: ContactPointRow
}

type ContactAddressInputRowProps = {
  address: ContactAddressRow
}

function mapEmailOpsForSave (ops: { create: ContactPointRow[], update: ContactPointRow[], remove: ContactPointRow[] }) {
  const mapRow = (row: ContactPointRow): ContactPointRow => ({
    ...withDefaultHeadingContactType(row, 'email'),
    type: toSavedHeadingEmailType(withDefaultHeadingContactType(row, 'email').type)
  })

  return {
    create: ops.create.map(mapRow),
    update: ops.update.map(mapRow),
    remove: ops.remove.map(mapRow)
  }
}

function mapPhoneOpsForSave (ops: { create: ContactPointRow[], update: ContactPointRow[], remove: ContactPointRow[] }) {
  const mapRow = (row: ContactPointRow): ContactPointRow => ({
    ...withDefaultHeadingContactType(row, 'phone'),
    type: toSavedHeadingPhoneType(withDefaultHeadingContactType(row, 'phone').type)
  })

  return {
    create: ops.create.map(mapRow),
    update: ops.update.map(mapRow),
    remove: ops.remove.map(mapRow)
  }
}

function summarizeHeadingContactOps (
  row: ContactPointRow,
  kind: HeadingContactTypeKind,
  typeWasMissing: boolean
) {
  const ops = summarizeRowOps([row], rowHasContent)

  if (
    typeWasMissing &&
    row.entryNode &&
    row.status === 'existing' &&
    rowHasContent(row) &&
    ops.create.length === 0 &&
    ops.update.length === 0 &&
    ops.remove.length === 0
  ) {
    return {
      create: ops.create,
      update: [withDefaultHeadingContactType({ ...row, status: 'modified' }, kind)],
      remove: ops.remove
    }
  }

  return ops
}

function renderContactPhoneInput ({
  phone
}: ContactPhoneInputRowProps) {
  const label = 'Mobile Number'
  const typeLabel = 'Phone Type 1'
  const inputName = 'phone-value'
  const splitValue = splitPhoneValue(phone?.value || '')
  const selectedDialCode = splitValue.dialCode

  const handleValueInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const nextValue = sanitizePhoneLocalValue(target.value)
    if (phone) {
      applyRowFieldChange(phone, 'value', combinePhoneValue(selectedDialCode, nextValue), rowHasContent)
    }
  }

  const handleTypeInput = (e: Event) => {
    const event = e as ComboboxChangeEvent
    if (!event.detail.option) return
    const nextType = String(event.detail.option.value)
    if (phone) {
      applyRowSelectChange(phone, 'type', nextType)
    }
  }

  return html`
    <div class="profile-edit-dialog__row profile-edit-dialog__row--equal profile-edit-dialog__row--contact-point">
      <div class="profile-edit-dialog__field">
        <label aria-label=${label} class="label">
          ${label}
          <input
            class="input"
            type="tel"
            name=${inputName}
            .value=${splitValue.localNumber}
            required
            data-contact-field="value"
            data-entry-node=${phone?.entryNode || ''}
            data-row-status=${phone?.status || 'n/a'}
            placeholder=${label}
            autocomplete="tel-national"
            inputmode="tel"
            @input=${handleValueInput}
          />
        </label>
      </div>
      <label aria-label=${typeLabel} class="label profile-edit-dialog__field-type profile-edit-dialog__field-type--contact-point">
        <solid-ui-combobox
          select-only
          class="profile-edit-dialog__type-select"
          id=${`phone-type-select-${inputName}`}
          aria-label=${typeLabel}
          .value=${normalizeHeadingContactTypeValue(phone?.type || '', HEADING_PHONE_TYPE_OPTIONS)}
          @change=${handleTypeInput}
        >
          ${HEADING_PHONE_TYPE_OPTIONS.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
        </solid-ui-combobox>
      </label>
    </div>
  `
}

function renderContactEmailInputRow ({
  email
}: ContactEmailInputRowProps) {
  const label = 'Email'
  const typeLabel = 'Email Type'
  const inputName = 'email-value'

  const handleValueInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const nextValue = sanitizeEmailValue(target.value)
    if (email) {
      applyRowFieldChange(email, 'value', nextValue, rowHasContent)
    }
  }

  const handleTypeInput = (e: Event) => {
    const event = e as ComboboxChangeEvent
    if (!event.detail.option) return
    const nextType = String(event.detail.option.value)
    if (email) {
      applyRowSelectChange(email, 'type', nextType)
    }
  }

  return html`
    <div class="profile-edit-dialog__row profile-edit-dialog__row--equal profile-edit-dialog__row--contact-point">
      <label aria-label=${label} class="label profile-edit-dialog__field">
        ${label}
        <input
          class="input"
          type="email"
          name=${inputName}
          .value=${email?.value || ''}
          required
          data-contact-field="value"
          data-entry-node=${email?.entryNode || ''}
          data-row-status=${email?.status || 'n/a'}
          placeholder="Email Address"
          autocomplete="email"
          inputmode="email"
          @input=${handleValueInput}
        />
      </label>
      <label aria-label=${typeLabel} class="label profile-edit-dialog__field-type profile-edit-dialog__field-type--contact-point">
        <solid-ui-combobox
          select-only
          class="profile-edit-dialog__type-select"
          id=${`email-type-select-${inputName}`}
          aria-label=${typeLabel}
          .value=${normalizeHeadingContactTypeValue(email?.type || '', HEADING_EMAIL_TYPE_OPTIONS)}
          @change=${handleTypeInput}
        >
          ${HEADING_EMAIL_TYPE_OPTIONS.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
        </solid-ui-combobox>
      </label>
    </div>
  `
}

function renderContactAddressInput ({
  address
}: ContactAddressInputRowProps) {
  const label = 'Address'
  /* const typeLabel = 'Address Type' */
  /* const typeInputName = 'address-type' */
  /* const addressTypeSelectId = 'address-type-select' */
  const streetAddressName = 'address-street'
  const localityName = 'address-locality'
  const regionName = 'address-region'
  const postalCodeName = 'address-postal'
  const countryName = 'address-country'

  const handleAddressInput = (field: ContactAddressEditableField) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const nextValue = sanitizeAddressFieldValue(target.value)
    if (address) {
      applyRowFieldChange(address, field, nextValue, rowHasContent)
    }
  }

  /* const handleTypeInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const nextType = target.value
    if (address) {
      applyRowSelectChange(address, 'type', nextType)
    }
  } */

  return html`
    <label aria-label=${`${label} Street`} class="label profile-edit-dialog__field profile-edit-dialog__field--row-width">
      Street Address
      <input
        class="input"
        type="text"
        name=${streetAddressName}
        .value=${address?.streetAddress || ''}
        required
        data-contact-field="streetAddress"
        data-entry-node=${address?.entryNode || ''}
        data-row-status=${address?.status || 'n/a'}
        placeholder="Street Address"
        autocomplete="street-address"
        inputmode="text"
        @change=${handleAddressInput('streetAddress')}
      />
    </label>

    <div class="profile-edit-dialog__row profile-edit-dialog__row--equal profile-edit-dialog__row--full">
      <label aria-label=${`${label} Locality`} class="label profile-edit-dialog__field">
        Locality
        <input
          class="input"
          type="text"
          name=${localityName}
          .value=${address?.locality || ''}
          data-contact-field="locality"
          data-entry-node=${address?.entryNode || ''}
          data-row-status=${address?.status || 'n/a'}
          placeholder="City / Locality"
          autocomplete="address-level2"
          inputmode="text"
          @change=${handleAddressInput('locality')}
        />
      </label>
      <label aria-label=${`${label} Postal Code`} class="label profile-edit-dialog__field">
        Postal Code
        <input
          class="input"
          type="text"
          name=${postalCodeName}
          .value=${address?.postalCode || ''}
          data-contact-field="postalCode"
          data-entry-node=${address?.entryNode || ''}
          data-row-status=${address?.status || 'n/a'}
          placeholder="Postal Code"
          autocomplete="postal-code"
          inputmode="text"
          @change=${handleAddressInput('postalCode')}
        />
      </label>
    </div>

    <div class="profile-edit-dialog__row profile-edit-dialog__row--equal profile-edit-dialog__row--full">
      <label aria-label=${`${label} Region`} class="label profile-edit-dialog__field">
        Region
        <input
          class="input"
          type="text"
          name=${regionName}
          .value=${address?.region || ''}
          data-contact-field="region"
          data-entry-node=${address?.entryNode || ''}
          data-row-status=${address?.status || 'n/a'}
          placeholder="State / Region"
          inputmode="text"
          @change=${handleAddressInput('region')}
        />
      </label>
      <label aria-label=${`${label} Country`} class="label profile-edit-dialog__field">
        Country
        <input
          class="input"
          type="text"
          name=${countryName}
          .value=${address?.countryName || ''}
          data-contact-field="countryName"
          data-entry-node=${address?.entryNode || ''}
          data-row-status=${address?.status || 'n/a'}
          placeholder="Country"
          autocomplete="country-name"
          inputmode="text"
          @change=${handleAddressInput('countryName')}
        />
      </label>
    </div>
  `
}

function renderHeadingInfoInput (
  formState: HeadingFormState,
  rerender: () => void
): TemplateResult {
  const { basicInfo, phone, email, imagePreviewSrc } = formState
  const imageSrcLabel = 'Profile Photo'
  const recommendedImageToLoad = 'Recommended: Square JPG, PNG. Max 2MB.'
  const nameLabel = 'Full Name'
  const nicknameLabel = 'Nickname'
  const pronounsLabel = 'Pronouns'
  const dateOfBirthLabel = 'DOB'

  const handleBasicInfoInput = (field: ProfileBasicEditableField) => (e: Event) => {
    const target = e.target as HTMLInputElement
    const nextValue = sanitizeBasicInputFieldValue(target.value)
    if (basicInfo) {
      applyRowFieldChange(basicInfo, field, nextValue, rowHasContent)
    }
  }

  const handleDateOfBirthInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const nextValue = sanitizeBasicInputFieldValue(target.value)
    if (basicInfo) {
      applyRowFieldChange(basicInfo, 'dateOfBirth', toStorageDateISO(nextValue), rowHasContent)
    }
  }
  const handlePronounsInput = (e: Event) => {
    const event = e as ComboboxChangeEvent
    if (!event.detail.option) return
    const nextValue = normalizePronounsValue(String(event.detail.option.value))
    if (basicInfo) {
      applyRowFieldChange(basicInfo, 'pronouns', nextValue, rowHasContent)
    }
  }

  const handleUpload = async (e: Event) => {
    const button = e.currentTarget as HTMLButtonElement | null
    const dom = button?.ownerDocument || document
    const fileInput = dom.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'
    fileInput.hidden = true

    const cleanupFileInput = () => {
      fileInput.remove()
    }

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]
      cleanupFileInput()
      if (!file || !basicInfo) return

      try {
        formState.pendingImageFile = file
        setHeadingImagePreview(formState, file)
        basicInfo.status = basicInfo.entryNode ? 'modified' : 'new'
        rerender()
      } catch (error) {
        console.error('Profile image upload failed', error)
      }
    }, { once: true })

    dom.body.appendChild(fileInput)
    fileInput.click()
  }

  const handleCameraInput = async (event: InputEvent) => {
    const file = (event.target as PhotoCapture).value

    if (!file || !basicInfo) return

    try {
      formState.pendingImageFile = file
      setHeadingImagePreview(formState, file)
      basicInfo.status = basicInfo.entryNode ? 'modified' : 'new'
      rerender()
    } catch (error) {
      console.error('Profile camera upload failed', error)
    }
  }

  const handleDelete = async () => {
    if (!basicInfo) return
    formState.pendingImageFile = null
    formState.clearImagePreview()
    applyRowFieldChange(basicInfo, 'imageSrc', '', rowHasContent)
    rerender()
  }

  return html`
    <div class="profile-edit-dialog__row profile-edit-dialog__row--heading-photo">
      <header class="profile-edit-dialog__image-preview-header" aria-label="Profile Image">
        <div class="profile-edit-dialog__image-frame">
          ${Image(imagePreviewSrc || basicInfo.imageSrc, basicInfo.name)}
          <solid-ui-photo-capture
            capture-label="Take Photo"
            confirm-label="Use Photo"
            retake-label="Retake"
            cancel-label="Close camera"
            file-name-prefix="camera"
            facing-mode="user"
            @input=${handleCameraInput}
          >
            <solid-ui-button
              slot="trigger"
              class="profile-edit-dialog__image-camera-button"
              variant="ghost"
              aria-label="Take a photo"
              title="Take a photo"
            >
              <span slot="icon">
                <icon-lucide-camera></icon-lucide-camera>
              </span>
            </solid-ui-button>
          </solid-ui-photo-capture>
        </div>
      </header>

      <div class="profile-edit-dialog__image-preview" aria-label="Profile Photo Preview">
        <p class="profile-edit-dialog__image-preview-label">${imageSrcLabel}</p>
        <p class="profile-edit-dialog__image-preview-description">${recommendedImageToLoad}</p>

        <div class="profile-edit-dialog__image-preview-actions">
          <solid-ui-button
            variant="secondary"
            class="profile-edit-dialog__image-button profile-edit-dialog__image-upload-button"
            aria-label="Upload new profile photo"
            title="Upload"
            @click=${handleUpload}
          >
            Upload
          </solid-ui-button>
          <solid-ui-button
            variant="secondary"
            class="profile-edit-dialog__image-button profile-edit-dialog__image-remove-button"
            aria-label="Delete profile photo"
            title="Remove"
            @click=${handleDelete}
          >
            Remove
          </solid-ui-button>
        </div>
      </div>
    </div>
    <div class="profile-edit-dialog__image-camera-capture-row">
      <div class="profile-edit-dialog__image-camera-capture-frame" hidden></div>
    </div>
    <div class="profile-edit">
      <div class="profile-edit-dialog__row profile-edit-dialog__row--equal">
        <label aria-label=${nameLabel} class="label profile-edit-dialog__field">
          ${nameLabel}
          <input
            class="input"
            type="text"
            name="name"
            .value=${basicInfo?.name || ''}
            required
            data-contact-field="name"
            data-entry-node=${basicInfo?.entryNode || ''}
            data-row-status=${basicInfo?.status || 'n/a'}
            placeholder="Full Name"
            autocomplete="name"
            inputmode="text"
            @change=${handleBasicInfoInput('name')}
          />
        </label>
        <label aria-label=${nicknameLabel} class="label profile-edit-dialog__field">
          ${nicknameLabel}
          <input
            class="input"
            type="text"
            name="nickname"
            .value=${basicInfo?.nickname || ''}
            data-contact-field="nickname"
            data-entry-node=${basicInfo?.entryNode || ''}
            data-row-status=${basicInfo?.status || 'n/a'}
            placeholder="Nickname"
            autocomplete="nickname"
            inputmode="text"
            @change=${handleBasicInfoInput('nickname')}
          />
        </label>
      </div>
      <div class="profile-edit-dialog__row profile-edit-dialog__row--equal profile-edit-dialog__row--heading-dob">
        <div class="profile-edit-dialog__field-type profile-edit-dialog__field--stack">
          <label aria-label=${pronounsLabel} class="label">
            ${pronounsLabel}
          </label>
          <solid-ui-combobox
            select-only
            class="profile-edit-dialog__type-select"
            name="pronouns"
            data-heading-basic-field="pronouns"
            aria-label=${pronounsLabel}
            .value=${normalizePronounsValue(basicInfo?.pronouns || '')}
            @change=${handlePronounsInput}
          >
            ${HEADING_PRONOUN_OPTIONS.map((option) => html`<solid-ui-combobox-option value=${option.value}>${option.label}</solid-ui-combobox-option>`)}
          </solid-ui-combobox>
        </div>
        <div class="profile-edit-dialog__field profile-edit-dialog__field--stack">
          <label aria-label=${dateOfBirthLabel} class="label">
            ${dateOfBirthLabel}
          </label>
          <input
            class="input profile-edit-dialog__input--dob"
            type="date"
            name="dateOfBirth"
            .value=${toStorageDateISO(basicInfo?.dateOfBirth || '')}
            data-contact-field="dateOfBirth"
            data-entry-node=${basicInfo?.entryNode || ''}
            data-row-status=${basicInfo?.status || 'n/a'}
            autocomplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            @change=${handleDateOfBirthInput}
          />
        </div>
      </div>
      <div class="profile-edit-dialog__row profile-edit-dialog__row--equal">
        <div class="profile-edit-dialog__field profile-edit-dialog__field--full">
          ${renderContactPhoneInput({ phone })}
        </div>
        <div class="profile-edit-dialog__field profile-edit-dialog__field--full">
          ${renderContactEmailInputRow({ email })}
        </div>
      </div>
    </div>
  `
}

function renderHeadingEditTemplate (
  form: HTMLFormElement,
  formState: HeadingFormState,
  viewerMode: ViewerMode
) {
  const rerender = () => renderHeadingEditTemplate(form, formState, viewerMode)

  render(html`
    ${renderHeadingInfoInput(formState, rerender)}
    ${renderContactAddressInput({ address: formState.address })}
    ${viewerMode !== 'owner'
      ? html`<p class="profile-edit-dialog__login-message">${ownerLoginRequiredDialogMessageText}</p>`
      : null}
  `, form)
}

function createHeadingEditForm (
  profileData: ProfileDetails,
  viewerMode: ViewerMode
) {
  const form = document.createElement('form')
  form.classList.add('profile__edit-form', 'profile__edit-form--heading', 'profile-edit-dialog--heading')
  form.autocomplete = 'off'
  form.setAttribute('data-lpignore', 'true')
  form.setAttribute('data-1p-ignore', 'true')
  form.setAttribute('data-bwignore', 'true')

  const formState = toFormState(profileData)
  renderHeadingEditTemplate(form, formState, viewerMode)

  return { form, formState }
}

function isValidHeadingEmailAddress (value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidHeadingPhoneNumber (value: string): boolean {
  return /^\d+$/.test(value)
}

function validateHeadingDataBeforeSave (formState: HeadingFormState): string | null {
  const { localNumber } = splitPhoneValue(formState.phone?.value || '')
  if (rowHasContent(formState.phone) && !isValidHeadingPhoneNumber(localNumber)) {
    return 'Phone Number 1 should contain only numbers.'
  }

  if (rowHasContent(formState.email) && !isValidHeadingEmailAddress(formState.email?.value || '')) {
    return 'Email address must be a valid email address.'
  }

  return null
}

export async function createHeadingEditDialog (
  _event: Event,
  store: LiveStore,
  subject: NamedNode,
  profileData: ProfileDetails,
  viewerMode: ViewerMode,
  onSaved?: () => Promise<void> | void
) {
  const dom = document
  const originalPhotoUri = sanitizeTextValue(toText(profileData.imageSrc || ''))
  const { form, formState } = createHeadingEditForm(profileData, viewerMode)

  if (formState.basicInfo.imageSrc) {
    const resolvedImageSrc = await resolvePhotoDisplaySrc(store, formState.basicInfo.imageSrc)
    if (resolvedImageSrc && resolvedImageSrc !== formState.basicInfo.imageSrc) {
      setResolvedHeadingPreview(formState, resolvedImageSrc)
      renderHeadingEditTemplate(form, formState, viewerMode)
    }
  }

  const result = await openInputDialog({
    title: editHeadingDialogTitleText,
    dom,
    form,
    headerAction: { type: 'none' },
    submitLabel: dialogSubmitLabelText,
    cancelLabel: dialogCancelLabelText,
    shouldCloseWithoutSave: () => {
      const basicInfoOps = summarizeRowOps([formState.basicInfo], rowHasContent)
      const phoneOps = summarizeHeadingContactOps(formState.phone, 'phone', formState.phoneTypeWasMissing)
      const emailOps = summarizeHeadingContactOps(formState.email, 'email', formState.emailTypeWasMissing)
      const addressOps = summarizeRowOps([formState.address], rowHasContent)

      return (
        basicInfoOps.create.length === 0 && basicInfoOps.update.length === 0 && basicInfoOps.remove.length === 0 &&
        phoneOps.create.length === 0 && phoneOps.update.length === 0 && phoneOps.remove.length === 0 &&
        emailOps.create.length === 0 && emailOps.update.length === 0 && emailOps.remove.length === 0 &&
        addressOps.create.length === 0 && addressOps.update.length === 0 && addressOps.remove.length === 0
      )
    },
    validate: () => {
      if (viewerMode !== 'owner') {
        return ownerLoginRequiredDialogMessageText
      }
      return validateHeadingDataBeforeSave(formState)
    },
    onSave: async () => {
      if (formState.pendingImageFile) {
        const uploadedUri = await uploadPhotoFile(store, subject, formState.pendingImageFile)
        applyRowFieldChange(formState.basicInfo, 'imageSrc', uploadedUri, rowHasContent)
      }

      const phoneOps = summarizeHeadingContactOps(formState.phone, 'phone', formState.phoneTypeWasMissing)
      const emailOps = summarizeHeadingContactOps(formState.email, 'email', formState.emailTypeWasMissing)
      const plan: HeadingMutationPlan = {
        basicOps: summarizeRowOps([formState.basicInfo], rowHasContent),
        phoneOps: mapPhoneOpsForSave(phoneOps),
        emailOps: mapEmailOpsForSave(emailOps),
        addressOps: summarizeRowOps([formState.address], rowHasContent)
      }
      await processHeadingMutations(store, subject, plan)

      const nextPhotoUri = sanitizeTextValue(formState.basicInfo.imageSrc || '')
      if (originalPhotoUri && originalPhotoUri !== nextPhotoUri) {
        try {
          invalidateResolvedPhotoDisplaySrc(originalPhotoUri)
        } catch (error) {
          console.warn('Failed to invalidate resolved photo cache', error)
        }
      }
    },
    formatSaveError: (error: unknown) => {
      return error instanceof Error ? error.message : saveHeadingUpdatesFailedMessageText
    }
  })

  if (!result) {
    return
  }

  if (onSaved) {
    await onSaved()
  }
}
