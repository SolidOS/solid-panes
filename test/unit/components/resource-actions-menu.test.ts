import { afterEach, describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import * as UI from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'

import '../../../src/components/resource-actions-menu/ResourceActionsMenu'

describe('ResourceActionsMenu', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes the container root when the selected resource is index.ttl#this', async () => {
    const deleteResourceAndTypeIndexIfExists = vi
      .spyOn(solidLogicSingleton.resource, 'deleteResourceAndTypeIndexIfExists')
      .mockResolvedValue(undefined as any)

    const showDialogSpy = vi.spyOn(UI, 'showDialog').mockImplementation((_DialogComponent, config) => {
      config?.onClose?.(true)
      return document.createElement('div') as any
    })

    const onBack = vi.fn()
    const refresh = vi.fn()
    const menu = document.createElement('resource-actions-menu') as any
    menu.store = {
      fetcher: {
        load: vi.fn().mockResolvedValue(undefined)
      },
      sym
    }
    menu.subjectUri = 'https://example.com/workspace/index.ttl#this'
    menu.deleteTargetUri = 'https://example.com/workspace/'
    menu.fileExplorerContext = { onBack, refresh }

    await menu.handleDelete(new Event('click'))

    expect(showDialogSpy).toHaveBeenCalledTimes(1)
    expect(deleteResourceAndTypeIndexIfExists).toHaveBeenCalledWith(
      sym('https://example.com/workspace/'),
      solidLogicSingleton.authn.currentUser()
    )
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(onBack).not.toHaveBeenCalled()
  })

  it('shows a generic delete prompt when the pre-delete load fails', async () => {
    const deleteResourceAndTypeIndexIfExists = vi
      .spyOn(solidLogicSingleton.resource, 'deleteResourceAndTypeIndexIfExists')
      .mockResolvedValue(undefined as any)

    vi.spyOn(UI, 'showDialog').mockImplementation((_DialogComponent, config) => {
      const props = config?.props as any
      expect(props?.resourceNode).toBeUndefined()
      expect(props?.resourceDetailsLoaded).toBe(false)
      config?.onClose?.(true)
      return document.createElement('div') as any
    })

    const refresh = vi.fn()
    const menu = document.createElement('resource-actions-menu') as any
    menu.store = {
      fetcher: {
        load: vi.fn().mockRejectedValue(new Error('load failed'))
      },
      sym
    }
    menu.subjectUri = 'https://example.com/workspace/index.ttl#this'
    menu.deleteTargetUri = 'https://example.com/workspace/'
    menu.fileExplorerContext = { refresh }

    await menu.handleDelete(new Event('click'))

    expect(deleteResourceAndTypeIndexIfExists).toHaveBeenCalledWith(
      sym('https://example.com/workspace/'),
      solidLogicSingleton.authn.currentUser()
    )
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
