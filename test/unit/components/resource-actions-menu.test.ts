import { describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import * as UI from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'

import '../../../src/components/resource-actions-menu/ResourceActionsMenu'

describe('ResourceActionsMenu', () => {
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
})
