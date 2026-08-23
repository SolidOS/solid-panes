// Legacy outline manager APIs kept for backward compatibility.

export function createLegacyOutlineApis ({ outline, dom, kb }) {
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

  return {
    statusBarClick,
    GotoFormURI_enterKey,
    GotoFormURI,
    GotoURIinit,
    createTabURI
  }
}