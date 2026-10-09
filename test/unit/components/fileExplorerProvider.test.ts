import { afterEach, describe, expect, it, vi } from 'vitest'
import { store } from 'solid-logic'
import type { PaneDefinition } from 'pane-registry'

vi.mock('../../../src/utils/podUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/podUtils')>(),
  fetchResourceMetadata: async () => ({ modified: undefined, isPublic: false, canEdit: false, aclUri: undefined })
}))

import '../../../src/components/file-explorer-header'

afterEach(() => {
  document.body.replaceChildren()
})

type Provider = HTMLElement & {
  context: unknown
  subjectUri: string
  pane: Pick<PaneDefinition, 'name'>
  showHeader: boolean
  updateComplete: Promise<unknown>
}

async function renderProvider (paneName: string, showHeader = true) {
  const provider = document.createElement('file-explorer-provider') as Provider
  provider.context = { dom: document, session: { store } }
  provider.subjectUri = `${window.location.origin}/container/`
  provider.pane = { name: paneName }
  provider.showHeader = showHeader
  document.body.appendChild(provider)
  await provider.updateComplete
  return provider
}

describe('file explorer provider', () => {
  it.each(['profile', 'social'])('does not render the file explorer header for the %s pane', async (paneName) => {
    const provider = await renderProvider(paneName)

    expect(provider.shadowRoot!.querySelector('file-explorer-header')).toBeNull()
    expect(provider.shadowRoot!.querySelector('slot.pane')).not.toBeNull()
  })

  it.each(['folder', 'source'])('renders the file explorer header for the %s pane', async (paneName) => {
    const provider = await renderProvider(paneName)

    expect(provider.shadowRoot!.querySelector('file-explorer-header')).not.toBeNull()
  })

  it('still honours showHeader being off', async () => {
    const provider = await renderProvider('folder', false)

    expect(provider.shadowRoot!.querySelector('file-explorer-header')).toBeNull()
  })

  it('removes the header when the displayed pane changes to the profile pane', async () => {
    const provider = await renderProvider('folder')
    expect(provider.shadowRoot!.querySelector('file-explorer-header')).not.toBeNull()

    provider.pane = { name: 'profile' }
    await provider.updateComplete

    expect(provider.shadowRoot!.querySelector('file-explorer-header')).toBeNull()
  })
})
