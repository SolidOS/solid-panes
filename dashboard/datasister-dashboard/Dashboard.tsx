import React from 'react'
import { ProfileWidget } from './widgets/Profile'
import { BookmarksWidget } from './widgets/Bookmarks'
import { FolderWidget } from './widgets/Folder'
import { AppsWidget } from './widgets/Apps'

export const Dashboard: React.FC<{
}> = (props) => {
  return (
    <>
      <section className="section">
        <div className="columns">
          <div className="column">
            <ProfileWidget/>
          </div>
          <div className="column">
            <AppsWidget/>
          </div>
          <div className="column">
            <FolderWidget/>
          </div>
          <div className="column">
            <BookmarksWidget/>
          </div>
        </div>
      </section>
  </>)
}
