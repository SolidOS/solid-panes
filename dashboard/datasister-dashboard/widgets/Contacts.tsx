import React from 'react'
import $rdf from 'rdflib'
import namespaces from 'solid-namespace'
import { DataBrowserContext } from '../context'
import { useWebId } from '../hooks/useWebId'

const ns = namespaces($rdf)

export const ContactsWidget: React.FC = () => {
  const { store, fetcher, podOrigin } = React.useContext(DataBrowserContext)

  const contacts = useContacts(store, fetcher)

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return null
  }

  return (
    <div className="card">
      <section className="section">
        <h2 className="title">Contacts</h2>
        <div className="content">
          <ul>
            {contacts.slice(0, 5).map((contact) => <li key={contact}><a href={contact}>{contact}</a></li>)}
          </ul>
        </div>
      </section>
    </div>
  )
}

function useContacts (store: $rdf.IndexedFormula, fetcher: $rdf.Fetcher) {
  const webId = useWebId()
  const [contacts, setContacts] = React.useState<string[]>()

  React.useEffect(() => {
    if (!webId) {
      return
    }
    getContacts(store, fetcher, webId)
      .then(setContacts)
      .catch((e) => console.log('Error fetching contacts:', e))
  }, [store, fetcher, webId])

  return contacts
}

async function getContacts (store: $rdf.IndexedFormula, fetcher: $rdf.Fetcher, webId: string) {
  const profile = $rdf.sym(webId)
  const knowsStatements = store.statementsMatching(profile, ns.foaf('knows'), null, profile.doc())
  return knowsStatements.map(st => st.object.value)
}
