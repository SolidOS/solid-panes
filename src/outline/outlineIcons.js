// This is a system of tracking tooltip phrases used by the tabulator outliner

import * as UI from 'solid-ui'
import { lucideIcons } from '../icons/lucide'

export const outlineIcons = {}

outlineIcons.src = [] // collect the URIs of the icon filterColumns
outlineIcons.tooltips = [] // look up tool tips from URL

/// /////////////////////// Common icons

outlineIcons.src.icon_expand = lucideIcons.chevronRight
outlineIcons.src.icon_more = lucideIcons.ellipsis
outlineIcons.src.icon_collapse = lucideIcons.chevronDown
outlineIcons.src.icon_internals = lucideIcons.slidersHorizontal
outlineIcons.src.icon_instances = lucideIcons.folderOpen
outlineIcons.src.icon_foaf = lucideIcons.usersRound
outlineIcons.src.icon_social = lucideIcons.usersRound
outlineIcons.src.icon_mb = lucideIcons.messageSquareText
outlineIcons.src.icon_shrink = lucideIcons.chevronsUp
outlineIcons.src.icon_rows = lucideIcons.table

// Status balls:

outlineIcons.src.icon_unrequested = lucideIcons.dotBlue
outlineIcons.src.icon_fetched = lucideIcons.dotGreen
outlineIcons.src.icon_failed = lucideIcons.dotRed
outlineIcons.src.icon_requested = lucideIcons.dotYellow

// Panes:
outlineIcons.src.icon_CVPane = UI.icons.originalIconBase + 'CV.png' // legacy
outlineIcons.src.icon_defaultPane = lucideIcons.info
outlineIcons.src.icon_visit = lucideIcons.info
outlineIcons.src.icon_dataContents = lucideIcons.code
outlineIcons.src.icon_n3Pane = lucideIcons.braces
outlineIcons.src.icon_RDFXMLPane = lucideIcons.code
outlineIcons.src.icon_imageContents = lucideIcons.image
outlineIcons.src.icon_airPane = UI.icons.originalIconBase + '1pt5a.gif' // legacy
outlineIcons.src.icon_LawPane = UI.icons.originalIconBase + 'law.jpg' // legacy
outlineIcons.src.icon_pushbackPane = UI.icons.originalIconBase + 'pb-logo.png' // legacy

// For photo albums (By albert08@csail.mit.edu)
outlineIcons.src.icon_photoPane = lucideIcons.image
outlineIcons.src.icon_tagPane = UI.icons.originalIconBase + 'tag_small.png' // legacy
outlineIcons.src.icon_TinyTag = UI.icons.originalIconBase + 'tag_tiny.png' // legacy
outlineIcons.src.icon_photoBegin = UI.icons.originalIconBase + 'photo_begin.png' // legacy
outlineIcons.src.icon_photoNext = UI.icons.originalIconBase + 'photo_next.png' // legacy
outlineIcons.src.icon_photoBack = UI.icons.originalIconBase + 'photo_back.png' // legacy
outlineIcons.src.icon_photoEnd = UI.icons.originalIconBase + 'photo_end.png' // legacy
outlineIcons.src.icon_photoImportPane = UI.icons.originalIconBase + 'flickr_small.png' // legacy

// actions for sources;
outlineIcons.src.icon_retract = UI.icons.originalIconBase + 'retract.gif' // legacy
outlineIcons.src.icon_refresh = lucideIcons.refreshCw
outlineIcons.src.icon_optoff = UI.icons.originalIconBase + 'optional_off.PNG' // legacy
outlineIcons.src.icon_opton = UI.icons.originalIconBase + 'optional_on.PNG' // legacy
outlineIcons.src.icon_map = lucideIcons.map
outlineIcons.src.icon_retracted = outlineIcons.src.icon_unrequested

outlineIcons.src.icon_time = UI.icons.originalIconBase + 'Wclocksmall.png' // legacy

// Within outline mode:

outlineIcons.src.icon_telephone = UI.icons.originalIconBase + 'silk/telephone.png' // legacy
outlineIcons.src.icon_remove_node = UI.icons.originalIconBase + 'tbl-x-small.png' // legacy
outlineIcons.src.icon_add_triple = UI.icons.originalIconBase + 'tango/22-list-add.png' // legacy
outlineIcons.src.icon_add_new_triple = UI.icons.originalIconBase + 'tango/22-list-add-new.png' // legacy
outlineIcons.src.icon_show_choices = UI.icons.originalIconBase + 'userinput_show_choices_temp.png' // legacy

// Inline Justification
outlineIcons.src.icon_display_reasons = lucideIcons.circleHelp || UI.icons.originalIconBase + 'tango/22-help-browser.png' // help-circle if available
outlineIcons.tooltips[outlineIcons.src.icon_display_reasons] = 'Display explanations'

// Other tooltips
outlineIcons.tooltips[outlineIcons.src.icon_add_triple] = 'Add more'
outlineIcons.tooltips[outlineIcons.src.icon_add_new_triple] = 'Add one'
outlineIcons.tooltips[outlineIcons.src.icon_remove_node] = 'Remove'
outlineIcons.tooltips[outlineIcons.src.icon_expand] = 'View details.'
outlineIcons.tooltips[outlineIcons.src.icon_collapse] = 'Hide details.'
outlineIcons.tooltips[outlineIcons.src.icon_shrink] = 'Shrink list.'
outlineIcons.tooltips[outlineIcons.src.icon_internals] = 'Under the hood'
outlineIcons.tooltips[outlineIcons.src.icon_instances] = 'List'
outlineIcons.tooltips[outlineIcons.src.icon_foaf] = 'Friends'
outlineIcons.tooltips[outlineIcons.src.icon_rows] = 'Make a table of data like this'
// Note the string '[Tt]his resource' can be replaced with an actual URI by the code
outlineIcons.tooltips[outlineIcons.src.icon_unrequested] = 'Fetch this.'
outlineIcons.tooltips[outlineIcons.src.icon_fetched] = 'Fetched successfully.'
outlineIcons.tooltips[outlineIcons.src.icon_failed] = 'Failed to load. Click to retry.'
outlineIcons.tooltips[outlineIcons.src.icon_requested] = 'This is being fetched. Please wait...'

outlineIcons.tooltips[outlineIcons.src.icon_visit] = 'View document'
outlineIcons.tooltips[outlineIcons.src.icon_retract] = 'Remove this source and all its data from tabulator.'
outlineIcons.tooltips[outlineIcons.src.icon_refresh] = 'Refresh this source and reload its triples.'

/// ////////////////////////////// End comon area

outlineIcons.OutlinerIcon = function (src, width, alt, tooltip, filter) {
  this.src = src
  this.alt = alt
  this.width = width
  this.tooltip = tooltip
  this.filter = filter
  // filter: RDFStatement,('subj'|'pred'|'obj')->boolean, inverse->boolean (whether the statement is an inverse).
  // Filter on whether to show this icon for a term; optional property.
  // If filter is not passed, this icon will never AUTOMATICALLY be shown.
  // You can show it with termWidget.addIcon
  return this
}

outlineIcons.termWidgets = {}
outlineIcons.termWidgets.optOn = new outlineIcons.OutlinerIcon(
  outlineIcons.src.icon_opton,
  20,
  'opt on',
  'Make this branch of your query mandatory.'
)
outlineIcons.termWidgets.optOff = new outlineIcons.OutlinerIcon(
  outlineIcons.src.icon_optoff,
  20,
  'opt off',
  'Make this branch of your query optional.'
)
outlineIcons.termWidgets.addTri = new outlineIcons.OutlinerIcon(
  outlineIcons.src.icon_add_triple,
  18,
  'add tri',
  'Add one'
)
// Ideally: "New "+label(subject)
