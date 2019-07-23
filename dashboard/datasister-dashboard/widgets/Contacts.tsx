import React from 'react'
import $rdf from 'rdflib'
import namespaces from 'solid-namespace'
import { DataBrowserContext } from '../context'
import { useWebId } from '../hooks/useWebId'
import { ProfileBadge } from '../components/ProfileBadge'
import { IsOwner } from '../components/IsOwner';
import { IsNotOwner } from '../components/IsNotOwner';

const ns = namespaces($rdf)

export const ContactsWidget: React.FC = () => {
  const { store, fetcher, updater } = React.useContext(DataBrowserContext)
  const webId = useWebId()

  const storedContacts = useContacts(store, fetcher)
  const [addedContacts, addContact] = React.useReducer<React.Reducer<string[], string>>(
    (previouslyAdded, newContact) => previouslyAdded.concat(newContact),
    []
  )

  const contacts = (storedContacts || []).concat(addedContacts)
  function onAddContact (contactWebId: string) {
    if (!webId || !contactWebId) {
      return
    }

    const profile = $rdf.sym(webId)
    updater.update(
      [],
      [$rdf.st(profile, ns.foaf('knows'), $rdf.sym(contactWebId), profile.doc())],
      (_uri, success, _errorBody) => {
        if (success) {
          addContact(contactWebId)
        }
      }
    )
  }

  const contactList = (contacts.length === 0)
    ? <p>No contacts yet&hellip;</p>
    : <ul>{contacts.map((contact) => <li key={contact}><ProfileBadge webId={contact}/></li>)}</ul>

  return (
    <div className="card">
      <section className="section">
        <h2 className="title">Contacts</h2>
        <div className="content">
          {contactList}
        </div>
        <IsOwner>
          <h3>Add a contact</h3>
          <WebIdForm onSubmit={onAddContact}/>
        </IsOwner>
      </section>
    </div>
  )
}

const WebIdForm: React.FC<{ onSubmit: (webId: string) => void }> = (props) => {
  const [webId, setWebId] = React.useState<string>('')

  function handleSubmit (event: React.FormEvent) {
    event.preventDefault()

    props.onSubmit(webId)
    setWebId('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-wrap">
        <label htmlFor="webid" className="label">
          WebID:
        </label>
        <input
          type="url"
          onChange={(e) => setWebId(e.target.value)}
          value={webId}
          placeholder="https://www.w3.org/People/Berners-Lee/card#i"
          name="webid"
          id="webid"
          className="input"
        />
      </div>
      <div className="control">
        <button type="submit">Add</button>
      </div>
    </form>
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
