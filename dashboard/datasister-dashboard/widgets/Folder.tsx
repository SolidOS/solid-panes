import React from 'react'
import $rdf from 'rdflib'
import { ResourceLink } from '../components/ResourceLink'
import { DataBrowserContext } from '../context'

export const FolderWidget: React.FC = () => {
  const { podOrigin } = React.useContext(DataBrowserContext)

  return (
    <div className="card">
      <section className="section">
        <h2 className="title">Raw data</h2>
        <p className="buttons">
          <ResourceLink
            className="button is-primary is-fullwidth is-medium"
            resource={$rdf.sym(`${podOrigin}/public/`)}
          >Public data</ResourceLink>
          <ResourceLink
            className="button is-fullwidth is-small"
            resource={$rdf.sym(`${podOrigin}/private/`)}
          >Private data</ResourceLink>
        </p>
      </section>
    </div>
  )
}
