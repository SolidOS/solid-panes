/*   Single audio play Pane
**
*/
const UI = require('solid-ui')
const ns = UI.ns
const kb = UI.store


module.exports =  {

  icon: UI.icons.iconBase + 'noun_534313.svg',

  name: 'audio',

  // Does the subject deserve an audio play pane?
  label: function(subject) {
    var kb = UI.store;
    var ns = UI.ns;
    var typeURIs = kb.findTypeURIs(subject);

    var prefix = $rdf.Util.mediaTypeClass('audio/*').uri.split('*')[0]
    for (var t in typeURIs) {
      if (t.startsWith(prefix)) return "Play audio"
    }
    return null;
  },


  render: function(subject, dom) {

    var options = { autoplay: false,  chain: true, loop: false}

    var removeExtension = function(str){
      var dot = str.lastIndexOf('.')
      if (dot <  0) return str // if any
      var slash = str.lastIndexOf('/')
      if (dot < slash) return str
      return str.slice(0, dot)
    }

    // True if there is another file like song.mp4 when this is "song 1.mp4"
    //
    var looksRedundant = function(x, contents) {
      var thisName = x.uri
      for (var k=0; k < contents.length; k++){
        var otherName = contents[k].uri
        if (thisName.length > otherName.length && thisName.startsWith(removeExtension(otherName))){
          return true
        }
        if (thisName.endsWith('.mp3') && otherName.endsWith('.m4a')
          && removeExtension(thisName) === removeExtension(otherName)){
          return true
        }
      }
      return false
    }

    // Alternative methods could include:
    // Accesing metadata in the audio contol, or paring the audio file
    var guessNames = function(x){
      var a = x.uri.split('/').slice(-3) // Hope artist, album, track
      var decode = function(str){
        try{
          return decodeURIComponent(str)
        }
        catch(e){
          return str
        }
      }
      artistRow.textContent = decode(a[0])
      albumRow.textContent = decode(a[1])
      trackRow.textContent = decode(removeExtension(a[2]))
    }

    var moveOn = function(current, level){
      level = level || 0
      var folder = kb.any(undefined, ns.ldp('contains'), current)
      if (!folder || !options.chain) return
      var contents = kb.each(folder, ns.ldp('contains'))
      if (contents.length < 2) return null
      var j
      contents.sort() // sort by URI which hopefully will get tracks in order
      for (var i=0; i < contents.length; i++){
        if (current === contents[i].uri){
          j = (i + 1) % contents.length
          if (j === 0){
            if (!options.chainAlbums){
              if (options.loop){
                return contents[j]
              }
              return null
            } else { // chain albums
              if (level === 1) return null; //limit of navigating treee
              var folder2 = moveOn(folder, level +1)
              if (folder2 && options.chainAlbums) {
                var contents = kb.each(folder2, ns.ldp('contains'))
                if (contents.length === 0) return null
                contents.sort()
                return contents[0] // Start off new album
              }
            }
          }
          return contents[j]
        }
      }
    }
    var endedListener = function(event){
      var folder = kb.any(undefined, ns.ldp('contains'), subject)
      if (!folder || !options.chain) return
      var contents = kb.each(folder, ns.ldp('contains'))
      if (contents.length < 2) return
      var current = event.target.getAttribute('src')
      var j
      contents.sort() // sort by URI which hopefully will get tracks in order
      for (var i=0; i < contents.length; i++){
        if (current === contents[i].uri){
          j = (i + 1) % contents.length
          while (looksRedundant(contents[j], contents)  && j){ // skip dups
            j = (j + 1) % contents.length
            if (j == 0){
              break
            }
          }
          if (!options.loop && j === 0) return
          guessNames(contents[j])
          controlRow.appendChild(audioControl(contents[j], true)) // Force autoplay
          controlRow.removeChild(event.target)
          return
        }
      }
    }

    var audioControl = function(song, autoplay){
      var audio = dom.createElement('audio')
      audio.setAttribute('controls', 'yes')
      audio.setAttribute('src', song.uri)
      if (autoplay) {
        audio.setAttribute('autoplay', 'autoplay') // Make this a personal preference
      }
      audio.addEventListener('ended', endedListener, false)
      return audio
    }

    var div = dom.createElement('div')
    var table = div.appendChild(dom.createElement('table'))
    var labelStyle = 'padding: 0.3em; color:white; background-color: black;'
    var artistRow = table.appendChild( dom.createElement('tr'))
    artistRow.style = labelStyle
    var albumRow = table.appendChild( dom.createElement('tr'))
    albumRow.style = labelStyle
    var trackRow = table.appendChild( dom.createElement('tr'))
    trackRow.style = labelStyle
    var controlRow = table.appendChild( dom.createElement('tr'))
    guessNames(subject)
    controlRow.appendChild(audioControl(subject, options.autoplay))

    if (!kb.holds(undefined, ns.ldp('contains'), subject) && subject.dir()){
      kb.fetcher.load(subject.dir()) // Prefetch enclosing @@ or playlist
    }

    return div;
  }
}

//ends
