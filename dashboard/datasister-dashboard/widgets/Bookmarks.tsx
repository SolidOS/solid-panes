import React from 'react'
import $rdf from 'rdflib'
import namespaces from 'solid-namespace'
import { DataBrowserContext } from '../context'
import { useWebId } from '../hooks/useWebId'

const ns = namespaces($rdf)

export const BookmarksWidget: React.FC = () => {
  const { store, fetcher, podOrigin } = React.useContext(DataBrowserContext)

  const bookmarks = useBookmarks(store, fetcher)

  if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
    return null
  }

  return (
    <div className="card">
      <section className="section">
        <h2 className="title">Latest bookmarks</h2>
        <div className="content">
          <ul>
            {bookmarks.slice(0, 5).map((bookmark) => <li key={bookmark.url}><a href={bookmark.url}>{bookmark.title}</a></li>)}
          </ul>
        </div>
        <a className="button is-text" href={`https://vincenttunru.gitlab.io/poddit?idp=${podOrigin || ''}`}>All bookmarks</a>
      </section>
    </div>
  )
}

function useBookmarks (store: $rdf.IndexedFormula, fetcher: $rdf.Fetcher) {
  const webId = useWebId()
  const [bookmarks, setBookmarks] = React.useState<Array<{ title: string, url: string }>>()

  React.useEffect(() => {
    if (!webId) {
      return
    }
    getBookmarks(store, fetcher, webId)
      .then(setBookmarks)
      .catch((e) => console.log('Error fetching bookmarks:', e))
  }, [store, fetcher, webId])

  return bookmarks
}

async function getBookmarks (store: $rdf.IndexedFormula, fetcher: $rdf.Fetcher, webId: string) {
  const profile = $rdf.sym(webId)
  const [ publicTypeIndexStatement ] = store.statementsMatching(profile, ns.solid('publicTypeIndex'), null, profile.doc(), true)
  const publicTypeIndex = publicTypeIndexStatement.object
  await fetcher.load(publicTypeIndex as any as $rdf.NamedNode)
  const bookmarkClass = new $rdf.NamedNode('http://www.w3.org/2002/01/bookmark#Bookmark')
  const [ bookmarkRegistryStatement ] = store.statementsMatching(null, ns.solid('forClass'), bookmarkClass, publicTypeIndex, true)
  if (!bookmarkRegistryStatement) {
    return []
  }
  const bookmarkRegistry = bookmarkRegistryStatement.subject
  const [ bookmarkRegistryInstanceStatement ] = store.statementsMatching(bookmarkRegistry, ns.solid('instance'), null, publicTypeIndex, true)
  const bookmarkRegistryInstance = bookmarkRegistryInstanceStatement.object
  await fetcher.load(bookmarkRegistryInstance as any as $rdf.NamedNode)
  const bookmarkStatements = store.statementsMatching(null, ns.rdf('type'), bookmarkClass, bookmarkRegistryInstance)
  return bookmarkStatements.map((statement) => {
    const recalls = new $rdf.NamedNode('http://www.w3.org/2002/01/bookmark#recalls')
    const bookmarkNode = statement.subject
    const [ titleStatement ] = store.statementsMatching(bookmarkNode, ns.dct('title'), null, bookmarkRegistryInstance)
    const [ urlStatement ] = store.statementsMatching(bookmarkNode, recalls, null, bookmarkRegistryInstance)
    return {
      title: titleStatement.object.value,
      url: urlStatement.object.value
    }
  })
}
