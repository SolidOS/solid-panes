import { IndexedFormula, NamedNode } from 'rdflib'

// Note: there might be a more appropriate project to hold this definition:
export interface PaneDefinition {
  icon: string;
  name: string;
  label: (subject: NamedNode) => string | null;
  render: (subject: NamedNode, dom: HTMLDocument, options?: unknown) => HTMLElement;
  shouldGetFocus?: (subject: NamedNode) => boolean;
  requireQueryButton?: boolean;
  mintClass?: NamedNode;
  mintNew?: (options: NewPaneOptions) => Promise<NewPaneOptions & { newInstance: NamedNode }>;
};
interface NewPaneOptions {
  appPathSegment: string;
  div: HTMLDivElement;
  dom: HTMLDocument;
  folder: NamedNode;
  iconEle: HTMLImageElement;
  me?: NamedNode;
  newBase: string;
  newInstance: NamedNode;
  noIndexHTML: boolean;
  noun: string;
  pane: PaneDefinition;
  refreshTarget: HTMLTableElement;
}

export interface RevampPaneDefinition {
  canHandle: (subject: NamedNode, store: IndexedFormula) => boolean;
  attach: (container: HTMLElement, subject: NamedNode, store: IndexedFormula, user?: NamedNode) => void;
  label: (subject: NamedNode, store: IndexedFormula) => string | null;
};
