import { NamedNode, IndexedFormula } from 'rdflib'

// Note: there might be a more appropriate project to hold this definition:
export interface PaneDefinition {
  icon: string
  global?: boolean
  name: string
  audience?: NamedNode[]
  label: (subject: NamedNode) => string | null
  render: (
    subject: NamedNode,
    dom: HTMLDocument,
    options?: unknown
  ) => HTMLElement
  shouldGetFocus?: (subject: NamedNode) => boolean
  requireQueryButton?: boolean
  mintClass?: NamedNode
  mintNew?: (
    options: NewPaneOptions
  ) => Promise<NewPaneOptions & { newInstance: NamedNode }>
  predicates?: { [key: string]: number }
  classes?: { [key: string]: number }
}
interface NewPaneOptions {
  appPathSegment: string
  div: HTMLDivElement
  dom: HTMLDocument
  folder: NamedNode
  iconEle: HTMLImageElement
  me?: NamedNode
  newBase: string
  newInstance: NamedNode
  noIndexHTML: boolean
  noun: string
  pane: PaneDefinition
  refreshTarget: HTMLTableElement
}

export interface ViewParams {
  container: HTMLElement
  subject: NamedNode
  store: IndexedFormula
  visitNode: (node: NamedNode) => void
  user?: NamedNode
}

export interface RevampPaneDefinition {
  canHandle: (subject: NamedNode, store: IndexedFormula) => boolean
  view: (params: ViewParams) => void
  label: (subject: NamedNode, store: IndexedFormula) => string | null
}
interface NewPaneOptions {
  appPathSegment: string
  div: HTMLDivElement
  dom: HTMLDocument
  folder: NamedNode
  iconEle: HTMLImageElement
  me?: NamedNode
  newBase: string
  newInstance: NamedNode
  noIndexHTML: boolean
  noun: string
  pane: PaneDefinition
  refreshTarget: HTMLTableElement
}

export interface SolidSession {
  authorization: SolidAuthorization
  credentialType: string
  idClaims: SolidClaim
  idp: string
  issuer: string
  sessionKey: string
  webId: string
}

interface SolidAuthorization {
  // eslint-disable-next-line camelcase
  access_token: string
  // eslint-disable-next-line camelcase
  client_id: string
  // eslint-disable-next-line camelcase
  id_token: string
}

interface SolidClaim {
  // eslint-disable-next-line camelcase
  at_hash: string
  aud: string
  azp: string
  cnf: {
    jwk: string
  }
  exp: number
  iat: number
  iss: string
  jti: string
  nonce: string
  sub: string
}
