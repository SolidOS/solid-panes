import { describe, expect, it } from 'vitest'
import { store } from 'solid-logic'
import { sym } from 'rdflib'

import '../../../src/components/file-explorer-header/FileExplorerProvider'

import {
  deriveDeleteRefreshTargetUri,
  deriveDeleteTargetUri
} from '../../../src/components/file-explorer-header/helper'

describe('FileExplorerProvider', () => {
  it('derives deleteTargetUri only for panes that create index.ttl#this', async () => {
    const mintClass = sym('https://example.com/ns#Notebook')

    const provider = document.createElement('file-explorer-provider') as any
    provider.context = { session: { store } }
    provider.subjectUri = 'https://example.com/workspace/index.ttl#this'
    provider.pane = {
      name: 'pad',
      mintClass,
      icon: undefined,
      label: () => 'Pad',
      render: () => document.createElement('div')
    } as any
    provider.relevantPanes = []

    store.add(
      sym('https://example.com/workspace/index.ttl#this'),
      sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      sym('https://example.com/ns#Notebook'),
      sym('https://example.com/workspace/index.ttl')
    )

    document.body.appendChild(provider)

    await provider.updateComplete

    expect(provider.fileExplorerContextValue.deleteTargetUri).toBe('https://example.com/workspace/')
    expect(provider.isContainerResourceValue).toBe(true)

    provider.pane = { name: 'source' } as any
    await provider.updateComplete

    expect(provider.fileExplorerContextValue.deleteTargetUri).toBeUndefined()
    expect(provider.isContainerResourceValue).toBe(false)
  })

  it('returns the parent of the deleted container for delete refresh navigation', () => {
    const mintClass = sym('https://example.com/ns#Notebook')

    store.add(
      sym('https://example.com/containerSharon/containeraddressbook/index.ttl#this'),
      sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      sym('https://example.com/ns#Notebook'),
      sym('https://example.com/containerSharon/containeraddressbook/index.ttl')
    )

    const deleteTargetUri = deriveDeleteTargetUri(
      store,
      'https://example.com/containerSharon/containeraddressbook/index.ttl#this',
      mintClass,
      undefined
    )

    expect(deleteTargetUri).toBe('https://example.com/containerSharon/containeraddressbook/')
    expect(
      deriveDeleteRefreshTargetUri(
        store,
        'https://example.com/containerSharon/containeraddressbook/index.ttl#this',
        mintClass,
        undefined
      )
    ).toBe('https://example.com/containerSharon/')
  })
})
