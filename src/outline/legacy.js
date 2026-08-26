// Legacy outline manager APIs kept for backward compatibility.

import * as UI from 'solid-ui'

export function createLegacyOutlineApis ({ outline, dom, kb, expandedProviderTR }) {
  function propertyTable (subject, table, requiredPane, options) {
    UI.log.debug('Property block for: ' + subject)
    subject = kb.canon(subject)
    // if (!requiredPane) requiredPane = panes.defaultPane;

    if (!table) {
      const provider = dom.createElement('file-explorer-provider')
      expandedProviderTR(subject, requiredPane, options, provider)
      return provider
    } else {
      const existingProvider = table.matches?.('file-explorer-provider')
        ? table
        : table.firstElementChild || table
      expandedProviderTR(subject, requiredPane, options, existingProvider)
      UI.log.info('Re-expand: ' + table)
      return table
    }
  }

  // Builds one old-style property row inside the outline table view. Likely to
  // shrink away once the remaining table-based outline path disappears.
  function propertyTR (doc, st, inverse) {
    const tr = doc.createElement('div')
    tr.AJAR_statement = st
    tr.AJAR_inverse = inverse
    tr.setAttribute('predTR', 'true')
    tr.setAttribute('role', 'row')
    const predicateTD = outline.outlinePredicateDiv(st.predicate, tr, inverse)
    tr.appendChild(predicateTD)
    return tr
  }

  // Legacy helper: used only by the old outline row delete affordance.
  function removeAndRefresh (d) {
    const parent = d.parentNode
    const grandParent = parent.parentNode
    const placeholder = dom.createElement('div')
    placeholder.classList.add('placeholderTable')
    grandParent.replaceChild(placeholder, parent)
    parent.removeChild(d)
    grandParent.replaceChild(parent, placeholder) // Attempt to
  }

  // Legacy compatibility: keep this for older panes and toolbar handlers that
  // still call the status bar click behavior directly.
  function statusBarClick (event) {
    const target = outline.targetOf(event)
    if (target.label) {
      window.content.location = target.label
      // The following alternative does not work in the extension.
      // var s = store.sym(target.label);
      // outline.GotoSubject(s, true);
    }
  }

  // Legacy compatibility: kept for older forms and keyboard handlers that still
  // route enter-key behavior through the outline manager.
  function GotoFormURI_enterKey (e) {
    if (e.keyCode === 13) outline.GotoFormURI(e)
  }

  // Legacy compatibility: kept for code that still jumps to a URI from the
  // outline manager instead of calling GotoSubject directly.
  function GotoFormURI (_e) {
    const uri = dom.getElementById('UserURI').value
    const subject = kb.sym(uri)
    outline.GotoSubject(subject, true)
  }

  // Legacy compatibility: kept for callers that expect the old non-expanding
  // URI initialization path on the outline manager.
  function GotoURIinit (uri) {
    const subject = kb.sym(uri)
    outline.GotoSubject(subject)
  }

  // Legacy compatibility: kept for older UI code that still asks the outline
  // manager to build a tab-style URI from the current form field.
  function createTabURI () {
    dom.getElementById('UserURI').value =
      dom.URL + '?uri=' + dom.getElementById('UserURI').value
  }

  // Legacy helper: kept for the old outline row delete affordance.
  // This is not part of the new folder-pane sidebar/content-view path.
  function removeNodeIconMouseDownListener (e) {
    const target = outline.targetOf(e)
    let node = target.node
    if (node.childNodes.length > 1) node = target.parentNode // parallel outline view @@ Hack
    removeAndRefresh(node)
  }

  return {
    propertyTable,
    propertyTR,
    statusBarClick,
    GotoFormURI_enterKey,
    GotoFormURI,
    GotoURIinit,
    createTabURI,
    removeNodeIconMouseDownListener
  }
}