import { authn, store } from 'solid-logic'
import { NamedNode, type LiveStore, type Node } from 'rdflib'
import { ns, utils, widgets } from 'solid-ui'
import type { AddressDetails, PointDetails } from './editor/sections/contactInfo/types'
import type { ProfileDetails } from './editor/sections/heading/types'

export type ViewerMode = 'owner' | 'authenticated' | 'anonymous'

export async function getViewerMode (subject: NamedNode): Promise<ViewerMode> {
  const currentUser = authn.currentUser()
  if (!currentUser) return 'anonymous'
  if (!currentUser.sameTerm(subject)) return 'authenticated'

  try {
    return store.updater?.editable?.(subject.doc()) ? 'owner' : 'anonymous'
  } catch (error) {
    console.warn('Failed to check profile edit permissions.', error)
    return 'anonymous'
  }
}

export function presentProfile (subject: NamedNode, profileStore: LiveStore = store): ProfileDetails {
  const doc = subject.doc()
  const nickname = profileStore.anyValue(subject, ns.vcard('nickname')) ||
    profileStore.anyValue(subject, ns.foaf('nick')) || undefined
  const dateOfBirth = profileStore.anyValue(subject, ns.vcard('bday')) || undefined
  const imageSrc = widgets.findImage(subject) || undefined
  const primaryPhone = selectPrimaryPoint(profileStore, subject, ns.vcard('hasTelephone'), doc, 'phone')
  const primaryEmail = selectPrimaryPoint(profileStore, subject, ns.vcard('hasEmail'), doc, 'email')
  const jobTitle = selectHeadingJobTitle(profileStore, subject, doc)

  const addressNode = profileStore.any(subject, ns.vcard('hasAddress'), null, doc) || undefined
  const addressSubject = addressNode as NamedNode | undefined
  const primaryAddress: AddressDetails | undefined = addressNode
    ? {
        entryNode: addressNode,
        type: profileStore.any(addressSubject, ns.rdf('type'), null, doc) || undefined,
        streetAddress: profileStore.anyValue(addressSubject, ns.vcard('street-address')) || undefined,
        locality: profileStore.anyValue(addressSubject, ns.vcard('locality')) || undefined,
        region: profileStore.anyValue(addressSubject, ns.vcard('region')) || undefined,
        postalCode: profileStore.anyValue(addressSubject, ns.vcard('postal-code')) || undefined,
        countryName: profileStore.anyValue(addressSubject, ns.vcard('country-name')) || undefined
      }
    : undefined
  const country = primaryAddress?.countryName
  const locality = primaryAddress?.locality
  const subjectPronoun = profileStore.anyValue(subject, ns.solid('preferredSubjectPronoun')) || ''
  const objectPronoun = profileStore.anyValue(subject, ns.solid('preferredObjectPronoun')) || ''
  const pronouns = subjectPronoun ? `${subjectPronoun}${objectPronoun ? `/${objectPronoun}` : ''}` : undefined

  return {
    name: utils.label(subject),
    nickname,
    imageSrc,
    dateOfBirth,
    jobTitle,
    primaryPhone,
    primaryEmail,
    primaryAddress,
    location: country && locality ? `${locality}, ${country}` : country || locality || undefined,
    pronouns,
    entryNode: subject
  }
}

function selectHeadingJobTitle (profileStore: LiveStore, subject: NamedNode, doc: NamedNode): string | undefined {
  const roles = profileStore.each(null, ns.org('member'), subject, doc)
    .filter(membership =>
      !profileStore.holds(
        membership as NamedNode,
        ns.rdf('type'),
        ns.schema('EducationalOccupationalCredential'),
        doc
      )
    )
    .map(membership => {
      const membershipNode = membership as NamedNode
      const types = profileStore.each(membershipNode, ns.rdf('type'), null, doc)
      const roleType = types.find(type => type.value.startsWith(ns.solid('').value))?.value.split(/[#/]/).pop()?.toLowerCase()
      const roleText = profileStore.anyValue(membershipNode, ns.vcard('role'), null, doc) || undefined
      const escoRole = profileStore.any(membershipNode, ns.org('role'), null, doc)
      const escoRoleName = escoRole
        ? profileStore.anyValue(escoRole as NamedNode, ns.schema('name'), null, doc) || undefined
        : undefined
      const endDate = profileStore.any(membershipNode, ns.schema('endDate'), null, doc)
      const title = escoRoleName && roleText
        ? `${escoRoleName} - ${roleText}`
        : roleText || escoRoleName

      return {
        title,
        roleType,
        isCurrent: !endDate || roleType === 'currentrole'
      }
    })
  const selected = roles.find(role => role.isCurrent) ||
    roles.find(role => role.roleType !== 'currentrole' && role.roleType !== 'futurerole')
  return selected?.title
}

function selectPrimaryPoint (
  profileStore: LiveStore,
  subject: NamedNode,
  predicate: NamedNode,
  doc: NamedNode,
  kind: 'email' | 'phone'
): PointDetails | undefined {
  const candidates: PointDetails[] = []
  const nodes = [
    ...profileStore.statementsMatching(subject, predicate, null, doc),
    ...profileStore.statementsMatching(subject, predicate)
  ].map(statement => statement.object as Node)
  const seen = new Set<string>()

  for (const entryNode of nodes) {
    if (seen.has(entryNode.value)) continue
    seen.add(entryNode.value)

    const valueNode = resolvePointValue(profileStore, entryNode, doc, kind)
    if (!valueNode) continue

    const types = entryNode.termType === 'NamedNode'
      ? [
          ...profileStore.each(entryNode as NamedNode, ns.rdf('type'), null, doc),
          ...profileStore.each(entryNode as NamedNode, ns.rdf('type'))
        ]
      : []
    const type = types[0] || (kind === 'email' ? ns.vcard('Internet') : ns.vcard('Voice'))
    const candidate = { entryNode, type: type as Node, valueNode }
    if (types.some(typeNode => isWorkType(typeNode.value))) return candidate
    candidates.push(candidate)
  }

  return candidates[0]
}

function resolvePointValue (
  profileStore: LiveStore,
  entryNode: Node,
  doc: NamedNode,
  kind: 'email' | 'phone'
): Node | undefined {
  if (isContactValue(entryNode.value, kind)) return entryNode
  if (entryNode.termType !== 'NamedNode') return undefined

  const values = [
    ...profileStore.each(entryNode as NamedNode, ns.vcard('value'), null, doc),
    ...profileStore.each(entryNode as NamedNode, ns.vcard('value'))
  ]
  return values.find(value => isContactValue(value.value, kind))
}

function isContactValue (value: string, kind: 'email' | 'phone'): boolean {
  const normalized = value.trim()
  if (kind === 'email') {
    return /^mailto:/i.test(normalized) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  }
  return /^tel:/i.test(normalized) || /^[+()\-\s\d]{5,}$/.test(normalized)
}

function isWorkType (value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === 'work' || normalized.endsWith('#work') || normalized.endsWith('/work')
}
