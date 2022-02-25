/*                            SOLID PANES
 **
 **     Panes are regions of the outline view in which a particular subject is
 ** displayed in a particular way.
 ** Different panes about the same subject are typically stacked vertically.
 ** Panes may be used naked or with a pane selection header.
 **
 ** The label() method has two functions: it determines whether the pane is
 ** relevant to a given subject, returning null if not.
 ** If it is relevant, then it returns a suitable tooltip for a control which selects the pane
 */

import versionInfo from './versionInfo'
import * as UI from 'solid-ui'
import { LiveStore } from 'rdflib'
import { solidLogicSingleton, store } from 'solid-logic'
import OutlineManager from './outline/manager.js'
import registerPanes from './registerPanes.js'
import {
  list,
  paneForIcon,
  paneForPredicate,
  register,
  byName
} from 'pane-registry'
import { createContext } from './outline/context'
import initMainPage from './mainPage'

function getOutliner (dom) {
  if (!dom.outlineManager) {
    const context = createContext(
      dom,
      { list, paneForIcon, paneForPredicate, register, byName },
            store as LiveStore,
            solidLogicSingleton
    )
    dom.outlineManager = new OutlineManager(context)
  }
  return dom.outlineManager
}

if (typeof window !== 'undefined') {
  getOutliner(window.document)
}

registerPanes((cjsOrEsModule: any) => register(cjsOrEsModule.default || cjsOrEsModule))

// This has common outline mode functionality for the default and other other panes
// A separate outline manager is required per DOM in cases like a browser extension
// where there are many occurrences of window and of window.document
// But each DOM should have just one outline manager.

export {
  OutlineManager,
  getOutliner,
  UI,
  versionInfo,
  initMainPage,
  list, // from paneRegistry
  paneForIcon, // from paneRegistry
  paneForPredicate, // from paneRegistry
  register, // from paneRegistry
  byName // from paneRegistry
}

// export for simpler access by non-node scripts
if (typeof window !== 'undefined') {
  ;(<any>window).panes = {
    getOutliner
  }
}
