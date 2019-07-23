import React from 'react'
import { ProfileWidget } from './widgets/Profile'
import { ContactsWidget } from './widgets/Contacts'
import { BookmarksWidget } from './widgets/Bookmarks'
import { FolderWidget } from './widgets/Folder'
import { IsNotOwner } from './components/IsNotOwner'

export const Dashboard: React.FC<{
}> = (props) => {
  return (
    <>
      <section className="section">
        <div className="columns grid ids-container__four-column">
          <div className="column item">
            <ProfileWidget/>
          </div>
          <div className="column item">
            <ContactsWidget/>
          </div>
          <div className="column item">
            <FolderWidget/>
          </div>
          <div className="column item">
            <BookmarksWidget/>
          </div>
        </div>
      </section>
  </>)
}
