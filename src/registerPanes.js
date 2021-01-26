module.exports = function registerPanes (register) {
  /*  Note that the earliest panes have priority. So the most specific ones are first.
   **
   */
  // Developer designed:

  register(require('profile-pane')) // View someone's public profile - dominates all other panes.

  register(require('./profile/editProfile.view')) // Edit my profile. App. 201900802
  register(require('./trustedApplications/trustedApplications.view')) // must be registered before basicPreferences
  register(require('./dashboard/dashboardPane'))
  register(require('./dashboard/basicPreferences')) // 20190702
  register(require('issue-pane'))
  register(require('contacts-pane'))
  register(require('activitystreams-pane'))
  register(require('markdown-pane').Pane)

  register(require('./pad/padPane'))
  // register(require('./argument/argumentPane.js')) // A position in an argument tree

  register(require('./transaction/pane.js'))
  register(require('./transaction/period.js'))

  const chatPanes = require('chat-pane')
  // FIXME: https://github.com/solid/chat-pane/issues/40
  if (chatPanes.longChatPane) {
    register(chatPanes.longChatPane) // Long pane must have prio in case short pane tries to do a long pane
    register(chatPanes.shortChatPane) // was './chat/chatPane.js'
  } else {
    register(chatPanes)
  }
  // register(require('./publication/publicationPane.js'))
  register(require('meeting-pane'))
  register(require('./tabbed/tabbedPane'))
  register(require('./schedule/schedulePane.js'))

  register(require('./trip/tripPane.js'))
  // register(require('./airPane.js'))

  // Content views

  register(require('./imagePane.js')) // Basic image view
  register(require('./playlist/playlistPane.js')) // Basic playlist view

  register(require('./video/videoPane.js')) // Video clip player
  register(require('./audio/audioPane.js')) // Audio clip player

  register(require('./dokieli/dokieliPane.js')) // Should be above dataContentPane
  register(require('folder-pane')) // Should be above dataContentPane
  register(require('./classInstancePane.js')) // Should be above dataContentPane
  // register(require('./dynamic/dynamicPanes.js')) // warp etc  warp broken 2017/8
  register(require('./slideshow/slideshowPane.js'))

  register(require('./socialPane.js'))

  register(require('./humanReadablePane.js')) // A web page as a web page -- how to escape to tabr?
  register(require('./dataContentPane.js')) // Preferred for a data file

  register(require('source-pane')) // edit source
  register(require('./n3Pane.js'))
  register(require('./RDFXMLPane.js'))

  // User configured - data driven
  register(require('./form/pane.js'))

  // Generic:

  register(require('./attach/attachPane.js'))
  register(require('./tableViewPane.js'))

  // Fallback totally generic:
  register(require('./defaultPane.js'))

  register(require('./ui/pane.js'))

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
  register(require('./sharing/sharingPane'))

  // The internals pane is always (almost?) the last as it is the least user-friendly
  register(require('./internal/internalPane'))

  register(require('./home/homePane'))

  // ENDS
}
