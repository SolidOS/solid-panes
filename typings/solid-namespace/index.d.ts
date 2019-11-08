declare module 'solid-namespace' {
  import { NamedNode } from 'rdflib'

  type RDFLibSubset = { namedNode: (value: string) => NamedNode }
  type toNamedNode = (label: string) => NamedNode
  export type Namespaces = { [alias: string]: toNamedNode }

  export default function vocab (rdf: RDFLibSubset): Namespaces
}
