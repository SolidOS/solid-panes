import profilePane from 'profile-pane'
// import editProfileView from './profile/editProfile.view'
import trustedApplications from './trustedApplications/trustedApplications.view'
import dashboardPane from './dashboard/dashboardPane'
import basicPreferences from './dashboard/basicPreferences'
import issuePane from 'issue-pane'
import contactsPane from 'contacts-pane'
import activityStreamsPane from 'activitystreams-pane'
import padPane from './pad/padPane'
// import argumentPane from './argument/argumentPane.js'
import transactionPane from './transaction/pane.js'
import financialPeriodPane from './transaction/period.js'
import meetingPane from 'meeting-pane'
import tabbedPane from './tabbed/tabbedPane'
import { longChatPane, shortChatPane } from 'chat-pane'
import { schedulePane } from './schedule/schedulePane.js'
// import publicationPane from './publication/publicationPane.js'
import tripPane from './trip/tripPane.js'
import { imagePane } from './imagePane.js'
import playListPane from './playlist/playlistPane.js'
import videoPane from './video/videoPane.js'
import audioPane from './audio/audioPane.js'
import dokieliPane from './dokieli/dokieliPane.js'
import folderPane from 'folder-pane'
import { classInstancePane } from './classInstancePane.js'
import { slideshowPane }  from './slideshow/slideshowPane.js'
import { socialPane } from './socialPane.js'
import humanReadablePane from './humanReadablePane.js'

import { dataContentPane } from './dataContentPane.js'
import sourcePane from 'source-pane'
import { n3Pane } from './n3Pane.js'
import { RDFXMLPane } from './RDFXMLPane.js'
import { formPane } from './form/pane.js'
import { tableViewPane } from './tableViewPane.js'
import { defaultPane } from './defaultPane.js'
import uiPane from './ui/pane.js'

import sharingPane from './sharing/sharingPane'
import internalPane from './internal/internalPane'

import homePane from './home/homePane'

export function registerPanes (register) {
  /*  Note that the earliest panes have priority. So the most specific ones are first.
   **
   */
  // Developer designed:

  register(profilePane) // View someone's public profile - dominates all other panes.
  const editProfileView = profilePane.editor ;
  if (!editProfileView) {
    console.log("@@@ editProfileView", "profilePane is not providing an editor pane")
  }

  register(editProfileView) // Edit my profile. 

  register(trustedApplications) // must be registered before basicPreferences
  register(dashboardPane)
  register(basicPreferences)
  register(issuePane)
  register(contactsPane)
  register(activityStreamsPane)

  register(padPane)
  // register(argumentPane) // A position in an argument tree

  register(transactionPane)
  register(financialPeriodPane)

  register(meetingPane)
  register(tabbedPane)

  register(longChatPane) // Long pane must have prio in case short pane tries to do a long pane
  register(shortChatPane) // was './chat/chatPane.js'

  // register(publicationPane)  // Suppress for now

  register(schedulePane)   // doodle poll

  register(tripPane)
  // register(require('./airPane.js'))

  // Content views

  register(imagePane) // Basic image view
  register(playListPane) // Basic playlist view

  register(videoPane) // Video clip player
  register(audioPane) // Audio clip player

  register(dokieliPane) // Should be above dataContentPane
  register(folderPane) // Should be above dataContentPane
  register(classInstancePane) // Should be above dataContentPane
  // register(require('./dynamic/dynamicPanes.js')) // warp etc  warp broken 2017/8
  register(slideshowPane)

  register(socialPane)

  register(humanReadablePane) // A web page as a web page -- how to escape to tabr?
  // register(require('markdown-pane').Pane) // replaced by markdown in humanReadablePane

  register(dataContentPane) // Preferred for a data file
  register(sourcePane) // edit source
  register(n3Pane)
  register(RDFXMLPane)

  // User configured - data driven
  register(formPane)

  // Generic:

  register(tableViewPane)

  // Fallback totally generic:
  register(defaultPane)

  register(uiPane)

  // register(require("categoryPane.js"))  // Not useful enough
  // register(require("pubsPane.js")) // not finished

  // @@ jambo commented these things out to pare things down temporarily.
  // Note must use // not /* to comment out to make sure expander sees it
  // register(require("lawPane.js"))

  // register(require('./microblogPane/microblogPane.js'))

  // register(require("./social/pane.js")) // competitor to other social
  // register(require("./airPane.js"))
  // register(require("./lawPane.js"))
  // register(require("pushbackPane.js"))
  // register(require("CVPane.js"))
  // register(require("photoPane.js"))
  // register(require("tagPane.js"))
  // register(require("photoImportPane.js"))

  // The sharing pane is fairly generic and administrative  201
  register(sharingPane)

  // The internals pane is always (almost?) the last as it is the least user-friendly
  register(internalPane)

  register(homePane) // This is a global pane

  // ENDS
}
