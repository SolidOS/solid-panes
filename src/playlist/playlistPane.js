/*   Playlist Pane
 **
 **  This pane allows playlists and playlists slots to be viewed
 **  seeAlso: http://smiy.sourceforge.net/pbo/spec/playbackontology.html
 */
const UI = require('solid-ui')
const $rdf = require('rdflib')
const ns = UI.ns

module.exports = {
  icon: UI.icons.iconBase + 'noun_1619.svg',

  name: 'playlistSlot',

  audience: [ns.solid('PowerUser')],

  label: function (subject, context) {
    const kb = context.session.store

    if (
      !kb.anyStatementMatching(
        subject,
        UI.ns.rdf('type'),
        kb.sym('http://purl.org/ontology/pbo/core#PlaylistSlot')
      )
    ) {
      return null
    }

    return 'playlist slot'
  },

  render: function (subject, context) {
    const myDocument = context.dom
    function isVideo (src, _index) {
      if (!src) {
        return {
          html5: true
        }
      }

      const youtube = src.match(
        /\/\/(?:www\.)?youtu(?:\.be|be\.com)\/(?:watch\?v=|embed\/)?([a-z0-9\-_%]+)/i
      )
      const vimeo = src.match(/\/\/(?:www\.)?vimeo.com\/([0-9a-z\-_]+)/i)
      const dailymotion = src.match(/\/\/(?:www\.)?dai.ly\/([0-9a-z\-_]+)/i)
      const vk = src.match(
        /\/\/(?:www\.)?(?:vk\.com|vkontakte\.ru)\/(?:video_ext\.php\?)(.*)/i
      )

      if (youtube) {
        return {
          youtube: youtube
        }
      } else if (vimeo) {
        return {
          vimeo: vimeo
        }
      } else if (dailymotion) {
        return {
          dailymotion: dailymotion
        }
      } else if (vk) {
        return {
          vk: vk
        }
      }
    }

    const link = function (contents, uri) {
      if (!uri) return contents
      const a = myDocument.createElement('a')
      a.setAttribute('href', uri)
      a.appendChild(contents)
      a.addEventListener('click', UI.widgets.openHrefInOutlineMode, true)
      return a
    }

    const text = function (str) {
      return myDocument.createTextNode(str)
    }

    const kb = context.session.store
    const obj = kb.any(
      subject,
      $rdf.sym('http://purl.org/ontology/pbo/core#playlist_item')
    )
    let index = kb.any(
      subject,
      $rdf.sym('http://purl.org/ontology/olo/core#index')
    )

    let uri = obj.uri
    const video = isVideo(uri)

    const div = myDocument.createElement('div')
    let img
    if (video && video.youtube) {
      uri = uri.replace('watch?v=', 'embed/')
      div.setAttribute('class', 'imageView')
      img = myDocument.createElement('IFRAME')
      img.setAttribute('src', uri)
      img.setAttribute('width', 560)
      img.setAttribute('height', 315)
      img.setAttribute('frameborder', 0)
      img.setAttribute('style', 'max-width: 850px; max-height: 100%;')
      img.setAttribute('allowfullscreen', 'true')
    } else {
      div.setAttribute('class', 'imageView')
      img = myDocument.createElement('IMG')
      img.setAttribute('src', obj.value)
      img.setAttribute('width', 560)
      img.setAttribute('height', 315)
      img.setAttribute('style', 'max-width: 560; max-height: 315;')
    }

    if (index) {
      const sl = kb.statementsMatching(
        null,
        $rdf.sym('http://purl.org/ontology/olo/core#index')
      )
      const slots = []
      for (let i = 0; i < sl.length; i++) {
        if (sl[i]) {
          slots.push(parseInt(sl[i].object.value, 10))
        }
      }

      index = parseInt(index.value, 10)
      var descDiv = myDocument.createElement('div')

      const pIndex =
        slots[(slots.indexOf(index) - 1 + slots.length) % slots.length]
      const nIndex =
        slots[(slots.indexOf(index) + 1 + slots.length) % slots.length]

      const prev = link(text('<<'), subject.uri.split('#')[0] + '#' + pIndex)

      descDiv.appendChild(prev)

      const indexDiv = myDocument.createElement('span')
      indexDiv.innerHTML = ' Playlist slot : ' + index + ' '

      descDiv.appendChild(indexDiv)

      const next = link(text('>>'), subject.uri.split('#')[0] + '#' + nIndex)
      descDiv.appendChild(next)
    }

    const tr = myDocument.createElement('TR') // why need tr?
    tr.appendChild(img)
    if (descDiv) {
      tr.appendChild(descDiv)
    }
    div.appendChild(tr)
    return div
  }
}

// ends
