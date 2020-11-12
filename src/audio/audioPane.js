/*   Single audio play Pane
 **
 */
const UI = require('solid-ui')
const $rdf = require('rdflib')
const ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_534313.svg',

  name: 'audio',

  // Does the subject deserve an audio play pane?
  label: function (subject, context) {
    const kb = context.session.store
    const typeURIs = kb.findTypeURIs(subject)

    const prefix = $rdf.Util.mediaTypeClass('audio/*').uri.split('*')[0]
    for (const t in typeURIs) {
      if (t.startsWith(prefix)) return 'Play audio'
    }
    return null
  },

  render: function (subject, context) {
    const kb = context.session.store
    const dom = context.dom
    const options = {
      autoplay: false,
      chain: true,
      chainAlbums: true,
      loop: false
    }

    const removeExtension = function (str) {
      const dot = str.lastIndexOf('.')
      if (dot < 0) return str // if any
      const slash = str.lastIndexOf('/')
      if (dot < slash) return str
      return str.slice(0, dot)
    }

    // True if there is another file like song.mp3 when this is "song 1.mp3"
    // or this is song.m4a
    //
    const looksRedundant = function (x) {
      const folder = kb.any(undefined, ns.ldp('contains'), x)
      if (!folder) return false
      const contents = kb.each(folder, ns.ldp('contains'))
      if (contents.length < 2) return false
      const thisName = x.uri
      for (let k = 0; k < contents.length; k++) {
        const otherName = contents[k].uri
        if (
          thisName.length > otherName.length &&
          thisName.startsWith(removeExtension(otherName))
        ) {
          return true
        }
        if (
          thisName.endsWith('.m4a') &&
          otherName.endsWith('.mp3') &&
          removeExtension(thisName) === removeExtension(otherName)
        ) {
          return true
        }
      }
      return false
    }

    // Alternative methods could include:
    // Accesing metadata in the audio contol, or paring the audio file
    const guessNames = function (x) {
      const a = x.uri.split('/').slice(-3) // Hope artist, album, track
      const decode = function (str) {
        try {
          return decodeURIComponent(str)
        } catch (e) {
          return str
        }
      }
      artistRow.textContent = decode(a[0])
      albumRow.textContent = decode(a[1])
      trackRow.textContent = decode(removeExtension(a[2]))
    }

    var moveOn = function (current, level) {
      return new Promise(function (resolve) {
        level = level || 0
        if (!options.chain) return resolve(null)
        // Ideally navigate graph else cheat with URI munging:
        const folder =
          kb.any(undefined, ns.ldp('contains'), current) || current.dir()
        if (!folder) return resolve(null)
        kb.fetcher.load(folder).then(function (_xhr) {
          const contents = kb.each(folder, ns.ldp('contains')) // @@ load if not loaded
          // if (contents.length < 2) return resolve(null)   NO might move on from 1-track album
          let j
          contents.sort() // sort by URI which hopefully will get tracks in order
          for (let i = 0; i < contents.length; i++) {
            if (current.uri === contents[i].uri) {
              j = (i + 1) % contents.length
              if (j === 0) {
                if (!options.chainAlbums) {
                  if (options.loop) {
                    return resolve(contents[j])
                  }
                  return resolve(null) // No more music needed
                } else {
                  // chain albums
                  if (level === 1 || !options.chainAlbums) return resolve(null) // limit of navigating treee
                  moveOn(folder, level + 1).then(function (folder2) {
                    if (folder2) {
                      kb.fetcher.load(folder2).then(function (_xhr) {
                        const contents = kb.each(folder2, ns.ldp('contains'))
                        if (contents.length === 0) return resolve(null)
                        contents.sort()
                        console.log('New Album: ' + folder2)
                        return resolve(contents[0]) // Start off new album
                      })
                    }
                  })
                }
              } else {
                return resolve(contents[j])
              }
            }
          } // for
        })
      })
    }
    const endedListener = function (event) {
      const current = kb.sym(event.target.getAttribute('src'))
      if (!options.chain) return
      var tryNext = function (cur) {
        const current = cur
        moveOn(current).then(function (next) {
          if (!next) {
            console.log('No successor to ' + current)
            return
          }
          if (!looksRedundant(next)) {
            console.log('Moving on to ' + next)
            guessNames(next)
            controlRow.appendChild(audioControl(next, true)) // Force autoplay
            controlRow.removeChild(event.target)
          } else {
            console.log('Ignoring redundant ' + next)
            tryNext(next)
          }
        })
      }
      tryNext(current)
    }

    var audioControl = function (song, autoplay) {
      const audio = dom.createElement('audio')
      audio.setAttribute('controls', 'yes')
      audio.setAttribute('src', song.uri)
      if (autoplay) {
        audio.setAttribute('autoplay', 'autoplay') // Make this a personal preference
      }
      audio.addEventListener('ended', endedListener, false)
      return audio
    }

    const div = dom.createElement('div')
    const table = div.appendChild(dom.createElement('table'))
    const labelStyle = 'padding: 0.3em; color:white; background-color: black;'
    var artistRow = table.appendChild(dom.createElement('tr'))
    artistRow.style.cssText = labelStyle
    var albumRow = table.appendChild(dom.createElement('tr'))
    albumRow.style.cssText = labelStyle
    var trackRow = table.appendChild(dom.createElement('tr'))
    trackRow.style.cssText = labelStyle
    var controlRow = table.appendChild(dom.createElement('tr'))
    guessNames(subject)
    controlRow.appendChild(audioControl(subject, options.autoplay))

    if (!kb.holds(undefined, ns.ldp('contains'), subject) && subject.dir()) {
      kb.fetcher.load(subject.dir()) // Prefetch enclosing @@ or playlist
    }

    return div
  }
}

// ends
