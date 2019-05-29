import '@babel/polyfill'
import $rdf, { IndexedFormula, NamedNode, Statement, Node } from 'rdflib'
import vocab from 'solid-namespace'
import { InitialisationFunction } from './types'

const ns = vocab($rdf)

/* istanbul ignore next [Side effects are contained to initialise(), so ignore just that for test coverage] */
export const initialise: InitialisationFunction = async (store, user) => {
  const creationDate = new Date()
  const [pad, initialisationAdditions] = getInitialisationStatements(creationDate, store, user)
  const [_setContentDeletions, setContentAdditions] = getSetContentsStatements('', creationDate, pad, store, user)

  const statementsToAdd = initialisationAdditions.concat(setContentAdditions)
  if (store.updater) {
    await store.updater.put(pad, statementsToAdd, 'text/turtle', () => undefined)
  }
  return pad
}

export function isPad (pad: NamedNode, store: IndexedFormula): boolean {
  const [padStatement] = store.statementsMatching(
    pad,
    ns.rdf('type'),
    ns.pad('Notepad'),
    pad.doc(),
    true
  )

  return !!padStatement
}

export function getInitialisationStatements (
  creationDate: Date,
  store: IndexedFormula,
  user?: NamedNode
): [NamedNode, Statement[]] {
  const storeNamespaces = store.namespaces
  const padName = creationDate.getTime()
  const pad = store.sym(storeNamespaces.pub + padName + '/index.ttl#this')

  const statementsToAdd = [
    $rdf.st(pad, ns.rdf('type'), ns.pad('Notepad'), pad.doc()),
    $rdf.st(pad, ns.dc('title'), `Scratchpad (${creationDate.toLocaleDateString()})`, pad.doc()),
    $rdf.st(pad, ns.dc('created'), creationDate, pad.doc())
  ]
  if (user) {
    statementsToAdd.push(
      $rdf.st(pad, ns.dc('author'), user, pad.doc())
    )
  }

  return [pad, statementsToAdd]
}

// Potential improvement: get current content, generate a diff
export function getSetContentsStatements (
  contents: string,
  creationDate: Date,
  pad: NamedNode,
  store: IndexedFormula,
  user?: NamedNode
): [Statement[], Statement[]] {
  const lines = contents.split('\n')
  const statementsToAdd = lines.reduce(
    (statementsToAdd, lineContents, lineNr) => {
      const line = store.sym(pad.uri + `_line${lineNr}`)
      const prevLine = (lineNr === 0) ? pad : statementsToAdd[statementsToAdd.length - 1].subject
      statementsToAdd.push(
        $rdf.st(prevLine, ns.pad('next'), line, pad.doc()),
        $rdf.st(line, ns.sioc('content'), lineContents, pad.doc()),
        $rdf.st(line, ns.dc('created'), creationDate, pad.doc())
      )
      if (user) {
        statementsToAdd.push($rdf.st(line, ns.dc('author'), user, pad.doc()))
      }

      return statementsToAdd
    },
    [] as $rdf.Statement[]
  )
  const lastLine = statementsToAdd[statementsToAdd.length - 1].subject
  statementsToAdd.push($rdf.st(lastLine, ns.pad('next'), pad, pad.doc()))

  const oldLines = store.statementsMatching(null as any, ns.pad('next'), null as any, pad.doc(), false)
    .map(statement => statement.object)
    .filter(line => line.value !== pad.value)
  const statementsPerOldLine = oldLines.map(oldLine => {
    return store.statementsMatching(oldLine, null as any, null as any, pad.doc(), false)
  })

  const statementsToDelete = statementsPerOldLine.reduce(
    (statementsToDelete, oldLineStatements) => {
      statementsToDelete.push(...oldLineStatements)
      return statementsToDelete
    },
    [] as $rdf.Statement[]
  )
  const [startingLink] = store.statementsMatching(pad, ns.pad('next'), null as any, pad.doc(), true)
  if (startingLink) {
    statementsToDelete.push(startingLink)
  }

  return [statementsToDelete, statementsToAdd]
}

export function getTitle (
  store: IndexedFormula,
  pad: NamedNode
): string {
  const [titleStatement] = store.statementsMatching(pad, ns.dc('title'), null, pad.doc(), true)
  return titleStatement.object.value
}

export function getContents (
  store: IndexedFormula,
  pad: NamedNode
): string {
  const [firstLineStatement] = store.statementsMatching(pad, ns.pad('next'), null, pad.doc(), true)
  let prevLine: Node = firstLineStatement.object
  const lines = []
  while (prevLine.value !== pad.value) {
    const [currentLineStatement] = store.statementsMatching(prevLine, ns.pad('next'), null, pad.doc(), true)
    const [lineContentStatement] = store.statementsMatching(
      currentLineStatement.subject,
      ns.sioc('content'),
      null,
      pad.doc(),
      true
    )
    if (lineContentStatement) {
      lines.push(lineContentStatement.object.value)
    }
    prevLine = currentLineStatement.object
  }

  return lines.join('\n')
}

export function getLatestAuthor (
  store: IndexedFormula,
  pad: NamedNode
): NamedNode | null {
  const [firstLineStatement] = store.statementsMatching(pad, ns.pad('next'), null, pad.doc(), true)
  let prevLine: Node = firstLineStatement.object
  const datesAndAuthors = []
  while (prevLine.value !== pad.value) {
    const [currentLineStatement] = store.statementsMatching(prevLine, ns.pad('next'), null, pad.doc(), true)
    const [lineDateStatement] = store.statementsMatching(
      currentLineStatement.subject,
      ns.dc('created'),
      null,
      pad.doc(),
      true
    )
    const [lineAuthorStatement] = store.statementsMatching(
      currentLineStatement.subject,
      ns.dc('author'),
      null,
      pad.doc(),
      true
    )
    if (lineDateStatement && lineAuthorStatement) {
      datesAndAuthors.push({
        created: new Date(lineDateStatement.object.value),
        author: lineAuthorStatement.object
      })
    }
    prevLine = currentLineStatement.object
  }

  if (datesAndAuthors.length === 0) {
    return null
  }

  const latestAuthor = datesAndAuthors.reduce(
    (latestAuthor, lineDateAndAuthor) => {
      return (latestAuthor.created.getTime() < lineDateAndAuthor.created.getTime())
        ? lineDateAndAuthor
        : latestAuthor
    }
  )

  return latestAuthor.author
}
