/*   slideshow Pane
**
*/
var UI = require('solid-ui')



// tabulator.loadScript("js/panes/slideshow/better-simple-slideshow/js/better-simple-slideshow.js");

var makeBSS = require('better-simple-slideshow')
// load also js/panes/slideshow/better-simple-slideshow/css/simple-slideshow-styles.css

module.exports =  {

  icon: UI.icons.iconBase + 'noun_138712.svg',

  name: 'slideshow',

  // Does the subject deserve an slideshow pane?
  label: function(subject) {
    var kb = UI.store;
    var ns = UI.ns;
    var t = kb.findTypeURIs(subject);
    if (t[ns.ldp('Container').uri]|| t[ns.ldp('BasicContainer').uri]) {
      var contents = kb.each(subject, ns.ldp('contains'))
      var count = 0; contents.map(function(file){
          if(UI.widgets.isImage(file)) count++
      })
      return count > 0 ? "Slideshow" : null;
    }
    return null;
  },

  // See https://github.com/leemark/better-simple-slideshow
  // and follow instructions there
  render: function(subject, dom) {

    var styleSheet = 'http://leemark.github.io/better-simple-slideshow/css/simple-slideshow-styles.css'
    UI.widgets.addStyleSheet(dom, styleSheet)

    var kb = UI.store;
    var ns = UI.ns;
    var div = dom.createElement("div")
    div.setAttribute('class', 'bss-slides');

    var t = kb.findTypeURIs(subject);
    var noun, predicate;
    if (t[ns.ldp('BasicContainer').uri] || t[ns.ldp('Container').uri]) {
      noun = "image"
      predicate = ns.ldp('contains')
    }
    var images = kb.each(subject, predicate); // @@ random order?
    for (i=0; i<images.length; i++){
      if (!UI.widgets.isImage(images[i])) continue;
      var figure = div.appendChild(dom.createElement('figure'))
      var img = figure.appendChild(dom.createElement('img'))
      img.setAttribute('src', images[i].uri)
      img.setAttribute('width', '100%')
      var figcaption = figure.appendChild(dom.createElement('figcaption'))
    }
    var options =  {dom: dom};

    setTimeout(function(){
      makeBSS('.bss-slides', options);
    }, 1000) // Must run after the code which called this

    return div;
  }
}

//ends
