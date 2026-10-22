import { describe, expect, it, vi } from 'vitest'
import * as $rdf from 'rdflib'
import dokieliPane from '../../src/dokieli/dokieliPane'
import padPane from '../../src/pad/padPane'
import { schedulePane } from '../../src/schedule/schedulePane'
import { authn } from 'solid-logic'

describe('pane creation promise contracts', () => {
  it('rejects when Dokieli cannot write its document', async () => {
    const error = new Error('write failed')
    const context = {
      session: {
        store: {
          sym: (uri: string) => $rdf.sym(uri),
          fetcher: {
            webOperation: vi.fn().mockRejectedValue(error)
          }
        }
      }
    }

    await expect(dokieliPane.mintNew(context as any, {
      newBase: 'https://pod.example/docs/'
    })).rejects.toBe(error)
  })

  it('rejects immediately when schedule creation has no user', async () => {
    vi.spyOn(authn, 'currentUser').mockReturnValue(null)
    const alert = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})

    await expect(schedulePane.mintNew({
      session: { store: {} }
    } as any, {
      newBase: 'https://pod.example/schedule/'
    })).rejects.toThrow('logged-in user')

    expect(alert).toHaveBeenCalledOnce()
    alert.mockRestore()
  })

  it('rejects once and stops the schedule agenda after a data write fails', async () => {
    const put = vi.fn((doc, statements, contentType, callback) => {
      callback(doc.uri, false, 'write failed')
      callback(doc.uri, false, 'write failed again')
    })
    const context = {
      session: {
        store: {
          sym: (uri: string) => $rdf.sym(uri),
          add: vi.fn(),
          statementsMatching: vi.fn().mockReturnValue([]),
          any: vi.fn().mockReturnValue(null),
          fetcher: {
            webCopy: vi.fn(),
            webOperation: vi.fn(),
            load: vi.fn()
          },
          updater: { put }
        }
      }
    }

    await expect(schedulePane.mintNew(context as any, {
      newBase: 'https://pod.example/schedule/',
      noIndexHTML: true,
      me: $rdf.sym('https://pod.example/profile#me')
    })).rejects.toThrow('write failed')

    expect(put).toHaveBeenCalledOnce()
    expect(context.session.store.fetcher.webOperation).not.toHaveBeenCalled()
  })

  it('rejects Pad minting when its resource write fails', async () => {
    const store = {
      updater: {
        put: vi.fn((_doc, _statements, _contentType, callback) => {
          const callbackFn = callback as any
          callbackFn(
            'https://pod.example/pad/index.ttl',
            false,
            'write failed'
          )
        })
      },
      sym: (uri: string) => $rdf.sym(uri),
      add: vi.fn(),
      statementsMatching: vi.fn().mockReturnValue([])
    }

    await expect((padPane as any).mintNew({
      session: { store }
    }, {
      newBase: 'https://pod.example/pad/'
    })).rejects.toThrow('write failed')
  })
})
