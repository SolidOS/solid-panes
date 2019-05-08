import { Node } from 'rdflib'

// Note: there might be a more appropriate project to hold this definition:
export interface PaneDefinition {
  icon: string;
  name: string;
  label: (subject: Node) => string | null;
  render: (subject: Node, dom: HTMLDocument, options?: unknown) => HTMLElement;
  shouldGetFocus?: (subject: Node) => boolean;
  requireQueryButton?: boolean;
};
