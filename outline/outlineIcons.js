
// This is a system of tracking tooltip phrases used by the tabulator outliner


var outlineIcons = module.exports = {} // was tabulator.Icon

outlineIcons.src = [] // collect the URIs of the icon filterColumns
outlineIcons.tooltips = [] // look up tool tips from URL


////////////////////////// Common icons

outlineIcons.src.icon_expand = UI.icons.originalIconBase + 'tbl-expand-trans.png';
outlineIcons.src.icon_more = UI.icons.originalIconBase + 'tbl-more-trans.png'; // looks just like expand, diff semantics
// Icon.src.icon_expand = UI.icons.originalIconBase + 'clean/Icon.src.Icon.src.icon_expand.png';
outlineIcons.src.icon_collapse = UI.icons.originalIconBase + 'tbl-collapse.png';
outlineIcons.src.icon_internals = UI.icons.originalIconBase + 'tango/22-emblem-system.png'
outlineIcons.src.icon_instances = UI.icons.originalIconBase + 'tango/22-folder-open.png'
outlineIcons.src.icon_foaf = UI.icons.originalIconBase + 'foaf/foafTiny.gif';
outlineIcons.src.icon_social = UI.icons.originalIconBase + 'social/social.gif';
outlineIcons.src.icon_mb = UI.icons.originalIconBase + 'microblog/microblog.png';
outlineIcons.src.icon_shrink = UI.icons.originalIconBase + 'tbl-shrink.png';  // shrink list back up
outlineIcons.src.icon_rows = UI.icons.originalIconBase + 'tbl-rows.png';
// Icon.src.Icon.src.icon_columns = 'icons/tbl-columns.png';

// Status balls:

outlineIcons.src.icon_unrequested = UI.icons.originalIconBase + '16dot-blue.gif';
// outlineIcons.src.Icon.src.icon_parse = UI.icons.originalIconBase + '18x18-white.gif';
outlineIcons.src.icon_fetched = UI.icons.originalIconBase + '16dot-green.gif';
outlineIcons.src.icon_failed = UI.icons.originalIconBase + '16dot-red.gif';
outlineIcons.src.icon_requested = UI.icons.originalIconBase + '16dot-yellow.gif';
// Icon.src.icon_maximize = UI.icons.originalIconBase + 'clean/Icon.src.Icon.src.icon_con_max.png';

// Panes:
outlineIcons.src.icon_CVPane = UI.icons.originalIconBase + 'CV.png';
outlineIcons.src.icon_defaultPane = UI.icons.originalIconBase + 'about.png';
outlineIcons.src.icon_visit = UI.icons.originalIconBase + 'tango/22-text-x-generic.png';
outlineIcons.src.icon_dataContents = UI.icons.originalIconBase + 'rdf_flyer.24.gif';  //@@ Bad .. find better
outlineIcons.src.icon_n3Pane = UI.icons.originalIconBase + 'w3c/n3_smaller.png';  //@@ Bad .. find better
outlineIcons.src.icon_RDFXMLPane = UI.icons.originalIconBase + '22-text-xml4.png';  //@@ Bad .. find better
outlineIcons.src.icon_imageContents = UI.icons.originalIconBase + 'tango/22-image-x-generic.png'
outlineIcons.src.icon_airPane = UI.icons.originalIconBase + '1pt5a.gif';
outlineIcons.src.icon_LawPane = UI.icons.originalIconBase + 'law.jpg';
outlineIcons.src.icon_pushbackPane = UI.icons.originalIconBase + 'pb-logo.png';

// For photo albums (By albert08@csail.mit.edu)
outlineIcons.src.icon_photoPane = UI.icons.originalIconBase + 'photo_small.png';
outlineIcons.src.icon_tagPane = UI.icons.originalIconBase + 'tag_small.png';
outlineIcons.src.icon_TinyTag = UI.icons.originalIconBase + 'tag_tiny.png';
outlineIcons.src.icon_photoBegin = UI.icons.originalIconBase + 'photo_begin.png';
outlineIcons.src.icon_photoNext = UI.icons.originalIconBase + 'photo_next.png';
outlineIcons.src.icon_photoBack = UI.icons.originalIconBase + 'photo_back.png';
outlineIcons.src.icon_photoEnd = UI.icons.originalIconBase + 'photo_end.png';
outlineIcons.src.icon_photoImportPane = UI.icons.originalIconBase + 'flickr_small.png';
//Icon.src.icon_CloseButton = UI.icons.originalIconBase + 'close_tiny.png';
//Icon.src.icon_AddButton = UI.icons.originalIconBase + 'addphoto_tiny.png';

// For that one we need a document with grid lines.  Make data-x-generix maybe

// actions for sources;
outlineIcons.src.icon_retract = UI.icons.originalIconBase + 'retract.gif';
outlineIcons.src.icon_refresh = UI.icons.originalIconBase + 'refresh.gif';
outlineIcons.src.icon_optoff = UI.icons.originalIconBase + 'optional_off.PNG';
outlineIcons.src.icon_opton = UI.icons.originalIconBase + 'optional_on.PNG';
outlineIcons.src.icon_map = UI.icons.originalIconBase + 'compassrose.png';
outlineIcons.src.icon_retracted = outlineIcons.src.icon_unrequested
outlineIcons.src.icon_retracted = outlineIcons.src.icon_unrequested;

outlineIcons.src.icon_time = UI.icons.originalIconBase + 'icons/Wclocksmall.png';

// Within outline mode:

outlineIcons.src.icon_telephone = UI.icons.originalIconBase + 'silk/telephone.png';
outlineIcons.src.icon_time = UI.icons.originalIconBase + 'Wclocksmall.png';
outlineIcons.src.icon_remove_node = UI.icons.originalIconBase + 'tbl-x-small.png'
outlineIcons.src.icon_add_triple = UI.icons.originalIconBase + 'tango/22-list-add.png';
outlineIcons.src.icon_add_new_triple = UI.icons.originalIconBase + 'tango/22-list-add-new.png';
outlineIcons.src.icon_show_choices = UI.icons.originalIconBase + 'userinput_show_choices_temp.png'; // looks just like collapse, diff smmantics

// Inline Justification
outlineIcons.src.icon_display_reasons = UI.icons.originalIconBase + 'tango/22-help-browser.png';
outlineIcons.tooltips[outlineIcons.src.icon_display_reasons] = 'Display explanations';

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

///////////////////////////////// End comon area

outlineIcons.OutlinerIcon= function (src, width, alt, tooltip, filter)
{
	this.src=src;
	this.alt=alt;
	this.width=width;
	this.tooltip=tooltip;
	this.filter=filter;
       //filter: RDFStatement,('subj'|'pred'|'obj')->boolean, inverse->boolean (whether the statement is an inverse).
       //Filter on whether to show this icon for a term; optional property.
       //If filter is not passed, this icon will never AUTOMATICALLY be shown.
       //You can show it with termWidget.addIcon
	return this;
}

outlineIcons.termWidgets = {}
outlineIcons.termWidgets.optOn = new outlineIcons.OutlinerIcon(outlineIcons.src.icon_opton,20,'opt on','Make this branch of your query mandatory.');
outlineIcons.termWidgets.optOff = new outlineIcons.OutlinerIcon(outlineIcons.src.icon_optoff,20,'opt off','Make this branch of your query optional.');
outlineIcons.termWidgets.addTri = new outlineIcons.OutlinerIcon(outlineIcons.src.icon_add_triple,18,"add tri","Add one");
// Ideally: "New "+label(subject)
