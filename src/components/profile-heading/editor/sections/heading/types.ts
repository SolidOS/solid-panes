import { Node } from 'rdflib'
import { RowStatus } from '../shared/types'
import { MutationOps } from '../shared/types'
import type { AddressDetails, ContactAddressRow, ContactPointRow, PointDetails } from '../contactInfo/types'

export interface ProfilePresentation {
  name: string;
  nickname?: string;
  imageSrc?: string;
  location?: string;
  pronouns?: string;
  dateOfBirth?: string;
  jobTitle?: string;
  primaryPhone?: PointDetails;
  primaryEmail?: PointDetails;
  primaryAddress?: AddressDetails;
}

export interface ProfileDetails extends ProfilePresentation {
  entryNode: Node
}

export interface ProfileRow extends ProfilePresentation {
  entryNode: string
  status: RowStatus
}

export type ProfileBasicFields = Omit<
  ProfilePresentation,
  'jobTitle' | 'primaryPhone' | 'primaryEmail' | 'primaryAddress'
>

export type ProfileBasicRow = ProfileBasicFields & {
  entryNode: string
  status: RowStatus
}

export type HeadingMutationPlan = {
  basicOps: MutationOps<ProfileBasicRow>
  phoneOps: MutationOps<ContactPointRow>
  emailOps: MutationOps<ContactPointRow>
  addressOps: MutationOps<ContactAddressRow>
}
