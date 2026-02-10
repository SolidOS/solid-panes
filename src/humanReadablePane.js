/*   Human-readable Pane
 **
 **  This outline pane contains the document contents for an HTML document
 **  This is for peeking at a page, because the user might not want to leave the data browser.
 */
import { icons, ns } from 'solid-ui'
import { Util } from 'rdflib'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Helper function to check if a URI has a markdown file extension
const isMarkdownFile = (uri) => {
  if (!uri) return false
  const path = uri.split('?')[0].split('#')[0] // Remove query string and fragment
  return /\.(md|markdown|mdown|mkd|mkdn)$/i.test(path)
}

// Cache for dokieli detection results (keyed by subject URI)
const dokieliCache = new Map()

const humanReadablePane = {
  icon: function (subject, context) {
    // Markdown files detected by extension
    if (subject && isMarkdownFile(subject.uri)) {
      return icons.iconBase + 'markdown.svg'
    }
    
    // Dokieli files detected by content check
    if (subject) {
      const kb = context.session.store
      
      // Check cache from previous detection
      const cachedResult = dokieliCache.get(subject.uri)
      if (cachedResult === 'dokieli') {
        return icons.iconBase + 'dokieli-logo.png'
      } else if (cachedResult === 'html') {
        return icons.originalIconBase + 'tango/22-text-x-generic.png'
      }
      
      // Check if content already fetched (synchronous)
      const responseText = kb.fetcher.getHeader(subject.doc(), 'content')
      if (responseText && responseText.length > 0) {
        const text = responseText[0]
        const isDokieli = text.includes('<script src="https://dokie.li/scripts/dokieli.js">') || 
                         text.includes('dokieli.css')
        dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
        return isDokieli 
          ? icons.iconBase + 'dokieli-logo.png'
          : icons.originalIconBase + 'tango/22-text-x-generic.png'
      }
      
      // Content not yet fetched - return a promise (async detection)
      const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
      const ct = cts ? cts[0].split(';', 1)[0].trim() : null
      
      if (ct === 'text/html') {
        return kb.fetcher._fetch(subject.uri)
          .then(response => response.text())
          .then(text => {
            const isDokieli = text.includes('<script src="https://dokie.li/scripts/dokieli.js">') || 
                             text.includes('dokieli.css')
            dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
            return isDokieli 
              ? icons.iconBase + 'dokieli-logo.png'
              : icons.originalIconBase + 'tango/22-text-x-generic.png'
          })
          .catch(() => {
            dokieliCache.set(subject.uri, 'html')
            return icons.originalIconBase + 'tango/22-text-x-generic.png'
          })
      }
    }
    
    // Default for all other human-readable content
    return icons.originalIconBase + 'tango/22-text-x-generic.png'
  },

  name: 'humanReadable',

  label: function (subject, context) {
    const kb = context.session.store

    //   See also the source pane, which has lower precedence.

    const allowed = [
      'text/plain',
      'text/html',
      'text/markdown',
      'application/xhtml+xml',
      'image/png',
      'image/jpeg',
      'application/pdf',
      'video/mp4'
    ]

    const hasContentTypeIn = function (kb, x, displayables) {
      const cts = kb.fetcher.getHeader(x, 'content-type')
      if (cts) {
        for (let j = 0; j < cts.length; j++) {
          for (let k = 0; k < displayables.length; k++) {
            if (cts[j].indexOf(displayables[k]) >= 0) {
              return true
            }
          }
        }
      }
      return false
    }

    // This data could come from a fetch OR from ldp container
    const hasContentTypeIn2 = function (kb, x, displayables) {
      const t = kb.findTypeURIs(x)
      for (let k = 0; k < displayables.length; k++) {
        if (Util.mediaTypeClass(displayables[k]).uri in t) {
          return true
        }
      }
      return false
    }

    if (!subject.uri) return null // no bnodes

    const t = kb.findTypeURIs(subject)
    if (t[ns.link('WebPage').uri]) return 'view'

    // Check file extension for markdown files
    if (isMarkdownFile(subject.uri)) {
      return 'View'
    }

    if (
      hasContentTypeIn(kb, subject, allowed) ||
      hasContentTypeIn2(kb, subject, allowed)
    ) {
      // For HTML files, check if it's dokieli (async check, store result for later)
      const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
      const ct = cts ? cts[0].split(';', 1)[0].trim() : null
      
      if (ct === 'text/html' && !dokieliCache.has(subject.uri)) {
        // Async check for dokieli, don't wait for result
        kb.fetcher._fetch(subject.uri)
          .then(response => response.text())
          .then(text => {
            const isDokieli = text.includes('<script src="https://dokie.li/scripts/dokieli.js">') || 
                             text.includes('dokieli.css')
            dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
          })
          .catch(() => {
            dokieliCache.set(subject.uri, 'html')
          })
      }
      
      return 'View'
    }

    return null
  },

  render: function (subject, context) {
    const myDocument = context.dom
    const div = myDocument.createElement('div')
    const kb = context.session.store

    const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
    const ct = cts ? cts[0].split(';', 1)[0].trim() : null // remove content-type parameters

    // Fallback: detect markdown by file extension if content-type is not text/markdown
    const isMarkdown = ct === 'text/markdown' || isMarkdownFile(subject.uri)

    if (ct) {
      // console.log('humanReadablePane: c-t:' + ct)
    } else {
      console.log('humanReadablePane: unknown content-type?')
    }

    //  @@ When we can, use CSP to turn off scripts within the iframe
    div.setAttribute('class', 'docView')

    // render markdown to html in a DIV element
    const renderMarkdownContent = function (frame) {
      kb.fetcher.webOperation('GET', subject.uri).then(response => {
        const markdownText = response.responseText
        const lines = Math.min(30, markdownText.split(/\n/).length + 5)
        const res = marked.parse(markdownText)
        const clean = DOMPurify.sanitize(res)
        frame.innerHTML = clean
        frame.setAttribute('class', 'doc')
        frame.setAttribute('style', `border: 1px solid; padding: 1em; height: ${lines}em; width: 800px; resize: both; overflow: auto;`)
      }).catch(error => {
        console.error('Error fetching markdown content:', error)
        frame.innerHTML = '<p>Error loading content</p>'
      })
    }

    const setIframeAttributes = (frame, lines) => {
      frame.setAttribute('src', subject.uri)
      frame.setAttribute('class', 'doc')
      frame.setAttribute('style', `border: 1px solid; padding: 1em; height: ${lines}em; width: 800px; resize: both; overflow: auto;`)
    }

    if (isMarkdown) {
      // For markdown, use a DIV element and render the content
      const frame = myDocument.createElement('DIV')
      renderMarkdownContent(frame)
      const tr = myDocument.createElement('TR')
      tr.appendChild(frame)
      div.appendChild(tr)
    } else {
      // For other content types, use IFRAME
      const frame = myDocument.createElement('IFRAME')

      // Apply sandbox for HTML/XHTML
      if (ct === 'text/html' || ct === 'application/xhtml+xml') {
        frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms')
      }

      // Fetch content to calculate lines dynamically
      kb.fetcher.webOperation('GET', subject.uri).then(response => {
        const blobText = response.responseText
        const newLines = blobText.includes('<script src="https://dokie.li/scripts/dokieli.js">') ? -10 : 5
        const lines = Math.min(30, blobText.split(/\n/).length + newLines)
        
        // Cache dokieli detection result
        const isDokieli = blobText.includes('<script src="https://dokie.li/scripts/dokieli.js">') || 
                         blobText.includes('dokieli.css')
        dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
        
        setIframeAttributes(frame, lines)
      }).catch(error => {
        console.error('Error fetching content for line calculation:', error)
        // Fallback to default height
        setIframeAttributes(frame, 30)
      })

      const tr = myDocument.createElement('TR')
      tr.appendChild(frame)
      div.appendChild(tr)
    }

    return div
  }
}

export default humanReadablePane
// ends
