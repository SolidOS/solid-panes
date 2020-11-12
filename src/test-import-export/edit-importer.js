'use strict'
/*   Profile Editing Appp Pane
 **
 ** Unlike view panes, this is available any place whatever the real subject,
 ** and allows the user to edit their own profile.
 **
 ** Usage: paneRegistry.register('profile/profilePane')
 ** or standalone script adding onto existing mashlib.
 */
exports.__esModule = true
// import UI from 'solid-ui'
// import solidUi, { SolidUi } from 'solid-ui'
// @@ TODO: Write away the need for exception on next line
// eslint-disable-next-line camelcase
const solid_UI_1 = require('solid-UI')
const UI2 = require('solid-UI')
// let panes: any
// let UI
const UI0 = require('solid-ui')
console.log('UI0.rdf ' + UI0.rdf)
console.log('UI1.rdf ' + solid_UI_1.default.rdf)
console.log('UI2.rdf ' + UI2.rdf)
const thisPane = { foo: 'bar' }
exports.default = thisPane
// ENDS
