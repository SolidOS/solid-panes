import * as React from 'react'
import $rdf from 'rdflib'
import vocab from 'solid-namespace'
import { View } from './view'
import { ContainerProps } from '../types'
import { TrustedApplication, Mode } from './model'
import { getStatementsToAdd, getStatementsToDelete, fetchTrustedApps } from './service'

const ns = vocab($rdf)

export const Container: React.FC<ContainerProps> = (props) => {
  if (!props.session) {
    return <div>You are not logged in</div>
  }

  const isEditable: boolean = (props.store as any).updater.editable(props.subject.doc().uri, props.store)
  if (!isEditable) {
    return <div>Your profile {props.subject.doc().uri} is not editable, so we cannot do much here.</div>
  }

  const fetchedTrustedApps: TrustedApplication[] = fetchTrustedApps(props.store, props.subject, ns)

  const [trustedApps, setTrustedApps] = React.useState(fetchedTrustedApps)

  const addOrEditApp = (origin: string, modes: Mode[]) => {
    const result = new Promise<void>((resolve) => {
      const deletions = getStatementsToDelete($rdf.sym(origin), props.subject, props.store, ns)
      const additions = getStatementsToAdd($rdf.sym(origin), generateRandomString(), modes, props.subject, ns)
      props.store.updater!.update(deletions, additions, () => {
        const newApp: TrustedApplication = { subject: props.subject.value, origin, modes }
        setTrustedApps(insertTrustedApp(newApp, trustedApps))
        resolve()
      })
    })

    return result
  }

  const deleteApp = (origin: string) => {
    const result = new Promise<void>((resolve) => {
      const deletions = getStatementsToDelete($rdf.sym(origin), props.subject, props.store, ns)
      props.store.updater!.update(deletions, [], () => {
        setTrustedApps(removeTrustedApp(origin, trustedApps))
        resolve()
      })
    })

    return result
  }

  return (
    <section>
      <View
        apps={trustedApps}
        onSaveApp={addOrEditApp}
        onDeleteApp={deleteApp}
      />
    </section>
  )
}

function insertTrustedApp (app: TrustedApplication, into: TrustedApplication[]): TrustedApplication[] {
  const index = into.findIndex(found => found.origin === app.origin)
  if (index === -1) {
    return into.concat(app)
  }

  return into.slice(0, index)
    .concat(app)
    .concat(into.slice(index + 1))
}
function removeTrustedApp (origin: string, from: TrustedApplication[]): TrustedApplication[] {
  const index = from.findIndex(found => found.origin === origin)
  return (index === -1)
    ? from
    : from.slice(0, index).concat(from.slice(index + 1))
}

function generateRandomString (): string {
  return Math.random().toString(36).substring(7)
}
