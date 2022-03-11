// import { longChatPane as Pane } from 'chat-pane'
// import Pane from '../../src/profile/profile.view'
import Pane from 'profile-pane'
import * as UI from 'solid-ui'

console.log('Loaded pane into Solid Pane Tester. Check window.Pane and window.UI')
;(window as any).Pane = Pane
;(window as any).UI = UI

export default Pane
