import { describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { createPaneItem } from '../../../src/utils/paneUtils'

describe('explicit Storage navigation', () => {
  it('keeps the storage shell even when top-level navigation supplies solo and fullView', () => {
    const render = vi.fn()
    const storage = sym('https://pod.example/storage/')
    const pane = createPaneItem({ name: 'folder', render }, storage, 'folder', 'Storage', '')
    const context = {}

    pane.render(sym('https://pod.example/questionnaire/'), context, { solo: true, fullView: true })

    expect(render).toHaveBeenCalledWith(storage, context, { solo: false, fullView: false })
  })

  it('passes on the folder view the navigation chose', () => {
    const render = vi.fn()
    const storage = sym('https://pod.example/storage/')
    const pane = createPaneItem({ name: 'folder', render }, storage, 'folder', 'Storage', '')

    pane.render(storage, {}, { solo: true, folderView: 'storage' })

    expect(render).toHaveBeenCalledWith(storage, {}, { solo: false, fullView: false, folderView: 'storage' })
  })

  it('preserves solo rendering options for non-storage panes', () => {
    const render = vi.fn()
    const subject = sym('https://pod.example/profile/card#me')
    const pane = createPaneItem({ name: 'profile', render }, subject, 'profile', 'Profile', '')

    pane.render(subject, {}, { solo: true })

    expect(render).toHaveBeenCalledWith(subject, {}, { solo: true })
  })
})
