import React from "react"
import { Fetcher, IndexedFormula, UpdateManager } from "rdflib"
import { useProfile } from "./hooks/useProfile"
import { useWebId } from "./hooks/useWebId"

interface Props {
  store: IndexedFormula,
  fetcher: Fetcher,
  updater: UpdateManager,
  pod: string
}

export const Wrapper: React.FC<Props> = ({ fetcher, pod }) => {
  const webId = useWebId()
  const ownersProfile = useProfile(`${pod}/profile/card#me`, fetcher)
  if (!ownersProfile || webId === undefined) {
    return null
  }
  return (
    <>
      <div className="container">
        <p className="lead">
          <span>
          This is a public homepage of {name}{name ? ", whose WebID is" : "a user with WebID"}
          </span>
          <a href="{ownersProfile.uri}">
            <mark>{ownersProfile.uri}</mark>
          </a>.
        </p>

        <section>
          <h1>Data</h1>
          <div className="list-group">
            <a href="/profile/card#me" className="list-group-item">
              <span className="lead">Profile</span>
              <span className="badge">public</span>
            </a>
            <a href="/inbox/" className="list-group-item">
              <span className="lead">Inbox</span>
              <span className="badge">private</span>
            </a>
            <a href="/public/" className="list-group-item">
              <span className="lead">Public Folder</span>
              <span className="badge">public</span>
            </a>
            <a href="/private/" className="list-group-item">
              <span className="lead">Private Folder</span>
              <span className="badge">private</span>
            </a>
          </div>
        </section>

        <section>
          <h1>Apps</h1>
          <div className="list-group">
            <a href="https://github.com/solid/userguide" target="_blank" className="list-group-item">
              <span className="lead">Getting started with Solid and Data Browser</span>
            </a>
          </div>
        </section>

        <section className={ownersProfile.uri === webId ? '' : 'hidden'} id="account-settings">
          <h1>Account settings</h1>
          <div className="list-group">
            <a href="/account/delete/" className="list-group-item">
              <span className="lead">Delete account</span>
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
