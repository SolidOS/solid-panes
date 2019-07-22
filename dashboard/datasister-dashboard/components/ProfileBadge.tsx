import React from 'react'
import $rdf from 'rdflib'
import namespaces from 'solid-namespace'
import { DataBrowserContext } from '../context'

const ns = namespaces($rdf)

interface Props {
  webId: string;
};

export const ProfileBadge: React.FC<Props> = (props) => {
  const { store, fetcher } = React.useContext(DataBrowserContext)
  const [ name, setName ] = React.useState<string>(props.webId)

  React.useEffect(() => {
    fetcher.load(props.webId).then(() => {
      const [ nameStatement ] = store.statementsMatching($rdf.sym(props.webId), ns.foaf('name'), null as any, null as any, true)
      console.log({ nameStatement })
      if (nameStatement) {
        setName(nameStatement.object.value)
      }
    })
  })

  return (
    <>
      <a href={props.webId} title="View this person's profile">
        {name}
      </a>
    </>
  )
}
