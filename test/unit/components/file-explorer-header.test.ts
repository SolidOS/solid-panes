import { describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { html } from 'lit'
import { solidLogicSingleton } from 'solid-logic'

import '../../../src/components/file-explorer-header/FileExplorerHeader'

describe('FileExplorerHeader', () => {
  it('reloads delete authorization when the effective delete target changes', async () => {
    const fetchMetadataWithDelete = vi.spyOn(solidLogicSingleton.resource, 'fetchMetadataWithDelete').mockImplementation(async (resource: any) => {
      return {
        modified: undefined,
        access: {
          canEdit: false,
          isPublic: false,
          canDelete: resource?.value?.endsWith('/workspace/') ?? false
        },
        aclUri: undefined
      } as any
    })

    const header = document.createElement('file-explorer-header') as any
    header.render = () => html``
    header.fileExplorerContext = {
      store: {},
      subjectUri: 'https://example.com/workspace/index.ttl#this',
      deleteTargetUri: undefined
    }

    document.body.appendChild(header)
    await header.updateComplete
    await header.updateComplete

    expect(fetchMetadataWithDelete).toHaveBeenCalledWith(sym('https://example.com/workspace/index.ttl#this'))
    expect(header.responseMetadata.access.canDelete).toBe(false)

    header.fileExplorerContext = {
      store: {},
      subjectUri: 'https://example.com/workspace/index.ttl#this',
      deleteTargetUri: 'https://example.com/workspace/'
    }
    header.requestUpdate()

    await header.updateComplete
    await header.updateComplete

    expect(fetchMetadataWithDelete).toHaveBeenCalledWith(sym('https://example.com/workspace/'))
    expect(header.responseMetadata.access.canDelete).toBe(true)
  })
})
