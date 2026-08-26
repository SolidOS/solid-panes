type RenderExpandedProviderArgs = {
  dom: Document
  context: any
  paneRegistry: any
  getRelevantPanes: (subject: any, context: any) => Promise<any[]>
  getPane: (relevantPanes: any[], subject: any) => any
  renderPaneIntoProvider: (provider: any, subject: any, pane: any, options: any) => void
  openPaneInPlace: (subject: any, pane: any) => void
  collapseMouseDownListener: (event: any) => void
  isWebIdUri: (subject: any) => boolean
}

export function createOutlineRenderHelpers ({
  dom,
  context,
  paneRegistry,
  getRelevantPanes,
  getPane,
  renderPaneIntoProvider,
  openPaneInPlace,
  collapseMouseDownListener,
  isWebIdUri
}: RenderExpandedProviderArgs) {
  async function renderExpandedProvider (subject: any, requiredPane: any, options: any = {}, provider?: any) {
    provider = provider || dom.createElement('file-explorer-provider')
    provider.classList.add('paneView', 'tdFlex')
    provider.setAttribute('notSelectable', 'true')
    provider.setAttribute('about', subject.toNT())
    if (options.hover) {
      provider.classList.add('hoverControl')
    }
    provider.context = context
    provider.subjectUri = subject.uri
    provider.onBack = () => collapseMouseDownListener({ target: provider })

    const relevantPanes = options.hideList
      ? []
      : await getRelevantPanes(subject, context)

    provider.relevantPanes = relevantPanes
    provider.pane = requiredPane || getPane(relevantPanes, subject)
    const isRootResource = !!(subject && subject.uri && subject.site && subject.site().uri === subject.uri)
    provider.showHeader = !isRootResource && !isWebIdUri(subject)
    provider.paneRenderOptions = options
    provider.soloPane = options.solo
    provider.openPane = (paneSubject, paneName) => openPaneInPlace(paneSubject, paneRegistry.byName(paneName))
    provider.handleSharingClick = () => openPaneInPlace(subject, paneRegistry.byName('sharing'))

    if (provider.pane) {
      renderPaneIntoProvider(provider, subject, provider.pane, options)
    }
    return provider
  }

  function renderSubjectProvider (subject: any, host: any, requiredPane?: any, options?: any) {
    if (!host) {
      const provider = dom.createElement('file-explorer-provider')
      renderExpandedProvider(subject, requiredPane, options, provider)
      return provider
    }

    const existingProvider = host.matches?.('file-explorer-provider')
      ? host
      : host.firstElementChild || host
    renderExpandedProvider(subject, requiredPane, options, existingProvider)
    return host
  }

  return {
    renderExpandedProvider,
    renderSubjectProvider
  }
}