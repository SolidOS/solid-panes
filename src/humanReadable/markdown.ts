import { LiveStore, NamedNode } from "rdflib"
import { marked } from "marked"
import DOMPurify from 'dompurify'
import { configurePreviewFrame } from './previewFrame'

 // render markdown to html in a DIV element
export const renderMarkdownContent = function (store: LiveStore, subject: NamedNode, frame: HTMLDivElement) {
      store.fetcher.webOperation('GET', subject.uri).then(response => {
        const markdownText = response.responseText ?? ''
        const res = marked.parse(markdownText, { async: false })
        const clean = DOMPurify.sanitize(res)
        frame.innerHTML = clean
        configurePreviewFrame(frame, 'markdown')
      }).catch(error => {
        console.error('Error fetching markdown content:', error)
        frame.innerHTML = '<p>Error loading content</p>'
      })
    }
