import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Fetcher, graph, literal, sym, UpdateManager } from 'rdflib'
import type { DataBrowserContext } from 'pane-registry'
import internalPane from '../../src/internal/internalPane'

vi.mock('../../src/components/resource-action-dialog/ResourceActionDialog', () => ({}))

class TestResourceActionDialog extends HTMLElement {
  static confirmed = true

  title = ''
  message = ''
  confirmation = false

  open () {
    return Promise.resolve(this.confirmation ? TestResourceActionDialog.confirmed : false)
  }
}

if (!customElements.get('solid-panes-resource-action-dialog')) {
  customElements.define('solid-panes-resource-action-dialog', TestResourceActionDialog)
}

beforeEach(() => {
  TestResourceActionDialog.confirmed = true
  document.body.replaceChildren()
})

async function flushPromises () {
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('Under The Hood RDF bookkeeping', () => {
  it('keeps display-only statements out of the live store so the document can be unloaded', () => {
    const store = graph()
    const fetcher = new Fetcher(store)
    store.updater = new UpdateManager(store)
    const subject = sym('https://example.test/file.ttl')
    const predicate = sym('https://example.test/title')
    store.add(subject, predicate, literal('A real file'), subject)
    const originalStatements = store.statementsMatching(subject).slice()
    const appendPropertyTRs = vi.fn()
    const context = {
      dom: document,
      session: {
        store,
        paneRegistry: { byName: () => internalPane }
      },
      getOutliner: () => ({ appendPropertyTRs })
    } as unknown as DataBrowserContext

    internalPane.render(subject, context)
    internalPane.render(subject, context)

    expect(appendPropertyTRs.mock.calls[0][1]).toEqual(expect.arrayContaining([
      expect.objectContaining({ predicate: sym('http://www.w3.org/2007/ont/link#uri') })
    ]))
    expect(store.statementsMatching(subject)).toEqual(originalStatements)
    expect(store.statements).toEqual(originalStatements)
    expect(() => fetcher.unload(subject)).not.toThrow()
    expect(store.statementsMatching(subject)).toEqual([])
    expect(store.statements).toEqual([])
  })
})

describe('Under The Hood deletion', () => {
  function renderDeletionPane () {
    const store = graph()
    store.fetcher = new Fetcher(store)
    store.updater = new UpdateManager(store)
    const subject = sym('https://example.test/file.ttl')
    const recursiveDelete = vi.fn(() => Promise.resolve())
    const appendPropertyTRs = vi.fn()
    const context = {
      dom: document,
      session: {
        store,
        logic: { resource: { recursiveDelete } },
        paneRegistry: { byName: () => internalPane }
      },
      getOutliner: () => ({ appendPropertyTRs })
    } as unknown as DataBrowserContext

    const pane = internalPane.render(subject, context)
    document.body.appendChild(pane)
    const deleteButton = pane.querySelector('.internalPaneDeleteButton') as HTMLButtonElement
    return { subject, recursiveDelete, deleteButton }
  }

  it('deletes the resource once and emits the success event after confirmation', async () => {
    const { subject, recursiveDelete, deleteButton } = renderDeletionPane()
    const deleted = vi.fn()
    document.addEventListener('solid-resource-deleted', deleted)

    deleteButton.click()
    await flushPromises()
    expect(recursiveDelete).toHaveBeenCalledOnce()
    expect(recursiveDelete).toHaveBeenCalledWith(subject)
    expect(deleted).toHaveBeenCalledOnce()
    expect(deleted).toHaveBeenCalledWith(expect.objectContaining({
      detail: { resource: subject }
    }))
    expect(deleteButton.disabled).toBe(false)

    document.removeEventListener('solid-resource-deleted', deleted)
  })

  it('does not delete when cancellation is selected', async () => {
    TestResourceActionDialog.confirmed = false
    const { recursiveDelete, deleteButton } = renderDeletionPane()

    deleteButton.click()
    await Promise.resolve()

    expect(recursiveDelete).not.toHaveBeenCalled()
    expect(deleteButton.disabled).toBe(false)
  })

  it('shows an error dialog without emitting success when deletion fails', async () => {
    const { recursiveDelete, deleteButton } = renderDeletionPane()
    const error = new Error('delete failed')
    recursiveDelete.mockRejectedValueOnce(error)
    const deleted = vi.fn()
    document.addEventListener('solid-resource-deleted', deleted)

    deleteButton.click()
    await flushPromises()

    const dialogs = Array.from(document.querySelectorAll('solid-panes-resource-action-dialog')) as TestResourceActionDialog[]
    expect(recursiveDelete).toHaveBeenCalledOnce()
    expect(deleted).not.toHaveBeenCalled()
    expect(dialogs.at(-1)).toMatchObject({
      title: 'Unable to delete resource',
      message: expect.stringContaining('delete failed')
    })
    expect(deleteButton.disabled).toBe(false)

    document.removeEventListener('solid-resource-deleted', deleted)
  })

  it('prevents a second deletion request while the first is pending', async () => {
    let resolveDelete: (() => void) | undefined
    const deletion = new Promise<void>(resolve => {
      resolveDelete = resolve
    })
    const { recursiveDelete, deleteButton } = renderDeletionPane()
    recursiveDelete.mockReturnValueOnce(deletion)

    deleteButton.click()
    await flushPromises()
    expect(deleteButton.disabled).toBe(true)

    deleteButton.click()
    expect(recursiveDelete).toHaveBeenCalledOnce()

    resolveDelete!()
    await deletion
    await flushPromises()
    expect(deleteButton.disabled).toBe(false)
  })
})
