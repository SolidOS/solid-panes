/*   Human-readable Pane
**
**  This outline pane contains the document contents for an HTML document
**  This is for peeking at a page, because the user might not want to leave the tabulator.
*/
var UI = require('solid-ui')

module.exports = {

    icon: UI.icons.originalIconBase + 'tango/22-text-x-generic.png',

    name: 'humanReadable',

    label: function(subject, myDocument) {
        // Prevent infinite recursion with iframe loading a web page which uses tabulator which shows iframe...
        if (tabulator.isExtension && myDocument.location == subject.uri) return null;
        var kb = UI.store;
        var ns = UI.ns;

        //   See aslo tthe source pane, which has lower precedence.

        var allowed = ['text/plain',
                       'text/html','application/xhtml+xml',
                        'image/png', 'image/jpeg', 'application/pdf'];

        var hasContentTypeIn = function(kb, x, displayables) {
            var cts = kb.fetcher.getHeader(x, 'content-type');
            if (cts) {
                for (var j=0; j<cts.length; j++) {
                    for (var k=0; k < displayables.length; k++) {
                        if (cts[j].indexOf(displayables[k]) >= 0) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        if (!subject.uri) return null; // no bnodes

        var t = kb.findTypeURIs(subject);
        if (t[ns.link('WebPage').uri]) return "view";

        if (subject.uri && hasContentTypeIn(kb, subject, allowed)) return "View";

        return null;
    },

    render: function(subject, myDocument) {
        var div = myDocument.createElement("div")
        var kb = UI.store

        //  @@ When we can, use CSP to turn off scripts within the iframe
        div.setAttribute('class', 'docView')
        var iframe = myDocument.createElement("IFRAME")
        iframe.setAttribute('src', subject.uri)    // allow-same-origin
        iframe.setAttribute('class', 'doc')

        var cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
        var ct = cts? cts[0] : null
        if (ct){
          console.log('humanReadablePane: c-t:' + ct)
        } else {
          console.log('humanReadablePane: unknown content-type?')
        }

        // @@ NOte beflow - if we set ANY sandbox, then Chrome and Safari won't display it if it is PDF.
        // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe
        // You can;'t have any sandbox and allow plugins.
        // We could sandbox only HTML files I suppose.
        // HTML5 bug: https://lists.w3.org/Archives/Public/public-html/2011Jun/0330.html

        // iframe.setAttribute('sandbox', 'allow-same-origin allow-forms'); // allow-scripts ?? no documents should be static

        iframe.setAttribute('style', 'resize = both; height: 120em; width:80em;')
//        iframe.setAttribute('height', '480')
//        iframe.setAttribute('width', '640')
        var tr = myDocument.createElement('TR')
        tr.appendChild(iframe)
        div.appendChild(tr)
        return div
    }
};
//ends
