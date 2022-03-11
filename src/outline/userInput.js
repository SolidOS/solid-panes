// Original author: kennyluck
//
// Kenny's Notes:
/* places to generate SPARQL update: clearInputAndSave() pasteFromClipboard()->insertTermTo();
                                  undetermined statement generated formUndetStat()
                                                                 ->fillInRequest()
   ontological issues
    temporarily using the tabont namespace
    clipboard: 'predicates' 'objects' 'all'(internal)
    request: 'from' 'to' 'message' 'Request'
*/

var UI = require('solid-ui')
const $rdf = UI.rdf
var panes = require('pane-registry')

var UserInputFormula // Formula to store references of user's work
var TempFormula // Formula to store incomplete triples (Requests),
// temporarily disjoint with kb to avoid bugs

module.exports = function UserInput (outline) {
  var kb = UI.store

  var myDocument = outline.document // is this ok?
  // UI.log.warn("myDocument when it's set is "+myDocument.location);
  this.menuId = 'predicateMenu1'

  /* //namespace information, as a subgraph of the knowledge base, is built in showMenu
    this.namespaces={};

    for (var name in UI.ns) {
        this.namespaces[name] = UI.ns[name]('').uri;
    }
    var NameSpaces=this.namespaces;
    */

  // hq, print and trim functions
  var qp = function qp (str) {
    console.log(str + '\n')
  }

  // var tabont = UI.ns.tabont;
  // var foaf = UI.ns.foaf
  const rdf = UI.ns.rdf
  // var RDFS = UI.ns.rdfs
  // var OWL = UI.ns.owl
  // var dc = UI.ns.dc
  // var rss = UI.ns.rss
  // var contact = UI.ns.contact
  // var mo = UI.ns.mo
  var bibo = UI.rdf.Namespace('http://purl.org/ontology/bibo/') // hql for pubsPane
  // var dcterms = UI.rdf.Namespace('http://purl.org/dc/terms/')
  var dcelems = UI.rdf.Namespace('http://purl.org/dc/elements/1.1/')

  var movedArrow = false // hq

  // var updateService=new updateCenter(kb);

  if (!UserInputFormula) {
    UserInputFormula = new UI.rdf.Formula()
    UserInputFormula.superFormula = kb
    // UserInputFormula.registerFormula("Your Work");
  }
  if (!TempFormula) TempFormula = new UI.rdf.IndexedFormula()
  // Use RDFIndexedFormula so add returns the statement
  TempFormula.name = 'TempFormula'
  if (!UI.store.updater) UI.store.updater = new UI.rdf.UpdateManager(kb)

  return {
    // updateService: updateService,

    sparqler: UI.store.updater,
    lastModified: null, // the last <input> being modified, .isNew indicates whether it's a new input
    lastModifiedStat: null, // the last statement being modified
    statIsInverse: false, // whether the statement is an inverse

    /**
     *  Triggering Events: event entry points, should be called only from outline.js but not anywhere else
     *                     in userinput.js, should be as short as possible, function names to be discussed
     */

    //  Called when the blue cross under the default pane is clicked.
    //  Add a new row to a property list ( P and O)
    addNewPredicateObject: function addNewPredicateObject (e) {
      if (UI.utils.getTarget(e).className !== 'bottom-border-active') return
      var This = outline.UserInput
      var target = UI.utils.getTarget(e)

      // UI.log.warn(ancestor(target,'TABLE').textContent);
      var insertTr = myDocument.createElement('tr')
      UI.utils
        .ancestor(target, 'DIV')
        .insertBefore(insertTr, UI.utils.ancestor(target, 'TR'))
      var tempTr = myDocument.createElement('tr')
      var reqTerm1 = This.generateRequest('(TBD)', tempTr, true)
      insertTr.appendChild(tempTr.firstChild)
      var reqTerm2 = This.generateRequest(
        '(Enter text or drag an object onto this field)',
        tempTr,
        false
      )
      insertTr.appendChild(tempTr.firstChild)
      // there should be an elegant way of doing this

      // Take the why of the last TR and write to it.
      if (
        UI.utils.ancestor(target, 'TR').previousSibling && // there is a previous predicate/object line
        UI.utils.ancestor(target, 'TR').previousSibling.AJAR_statement
      ) {
        const preStat = UI.utils.ancestor(target, 'TR').previousSibling
          .AJAR_statement
        // This should always(?) input a non-inverse statement
        This.formUndetStat(
          insertTr,
          preStat.subject,
          reqTerm1,
          reqTerm2,
          preStat.why,
          false
        )
      } else {
        // no previous row: write to the document defining the subject
        var subject = UI.utils.getAbout(
          kb,
          UI.utils.ancestor(target.parentNode.parentNode, 'TD')
        )
        var doc = kb.sym(UI.rdf.Util.uri.docpart(subject.uri))
        This.formUndetStat(insertTr, subject, reqTerm1, reqTerm2, doc, false)
      }

      outline.walk('moveTo', insertTr.firstChild)
      UI.log.info(
        'addNewPredicateObject: selection = ' +
          outline
            .getSelection()
            .map(function (item) {
              return item.textContent
            })
            .join(', ')
      )
      this.startFillInText(outline.getSelection()[0])
    },

    //  Called when a blue cross on a predicate is clicked
    //  tr.AJAR_inverse stores whether the clicked predicate is an inverse one
    //  tr.AJAR_statement (an incomplete statement in TempFormula) stores the destination(why), now
    //  determined by the preceding one (is this good?)
    addNewObject: function addNewObject (e) {
      var predicateTd = UI.utils.getTarget(e).parentNode.parentNode
      // var predicateTerm = UI.utils.getAbout(kb, predicateTd)
      var isInverse = predicateTd.parentNode.AJAR_inverse
      // var titleTerm=UI.utils.getAbout(kb,UI.utils.ancestor(predicateTd.parentNode,'TD'));
      // set pseudo lastModifiedStat here
      this.lastModifiedStat = predicateTd.parentNode.AJAR_statement

      var insertTr = this.appendToPredicate(predicateTd)
      var reqTerm = this.generateRequest(' (Error) ', insertTr, false)
      const preStat = insertTr.previousSibling.AJAR_statement
      if (!isInverse) {
        this.formUndetStat(
          insertTr,
          preStat.subject,
          preStat.predicate,
          reqTerm,
          preStat.why,
          false
        )
      } else {
        this.formUndetStat(
          insertTr,
          reqTerm,
          preStat.predicate,
          preStat.object,
          preStat.why,
          true
        )
      }

      outline.walk('moveTo', insertTr.lastChild)
      this.startFillInText(insertTr.lastChild)
      // this.statIsInverse=false;
    },

    //  Called when delete is pressed
    Delete: function Delete (selectedTd) {
      this.deleteTriple(selectedTd, false)
    },
    //  Called when enter is pressed
    Enter: function Enter (selectedTd) {
      this.literalModification(selectedTd)
    },
    //  Called when a selected cell is clicked again
    Click: function Click (e) {
      var target = UI.utils.getTarget(e)
      if (UI.utils.getTerm(target).termType !== 'Literal') return
      this.literalModification(target)
      // this prevents the generated inputbox to be clicked again
      e.preventDefault()
      e.stopPropagation()
    },
    //  Called when paste is called (Ctrl+v)
    pasteFromClipboard: function pasteFromClipboard (address, selectedTd) {
      function termFrom (fromCode) {
        var term = outline.clipboard[fromCode].shift()
        if (term === null) {
          UI.log.warn('no more element in clipboard!')
          return
        }
        switch (fromCode) {
          case 'predicates':
          case 'objects':
            var allArray = outline.clipboard.all
            for (var i = 0; true; i++) {
              if (term.sameTerm(allArray[i])) {
                allArray.splice(i, 1)
                break
              }
            }
            break
          case 'all':
            throw new Error(
              'hostorical code not understood - what is theCollection?'
            )
          /*
            var isObject = term.sameTerm(theCollection('objects').elements[0])
            isObject ? outline.clipboard.objecs.shift() : outline.clipboard.predicates.shift() // drop the corresponding term
            return [term, isObject]
            break
            */
        }
        return term
      }
      var term
      switch (selectedTd.className) {
        case 'undetermined selected':
          term = selectedTd.nextSibling
            ? termFrom('predicates')
            : termFrom('objects')
          if (!term) return
          break
        case 'pred selected': // paste objects into this predicate
          term = termFrom('objects')
          if (!term) return
          break
        case 'selected': // header <TD>, undetermined generated
          var returnArray = termFrom('all')
          if (!returnArray) return
          term = returnArray[0]
          this.insertTermTo(selectedTd, term, returnArray[1])
          return
      }
      this.insertTermTo(selectedTd, term)
    },

    /**
     *  Intermediate Processing:
     */

    // a general entry point for any event except Click&Enter(goes to literalModification)
    // do a little inference to pick the right input box
    startFillInText: function startFillInText (selectedTd) {
      switch (this.whatSortOfEditCell(selectedTd)) {
        case 'DatatypeProperty-like':
          // this.clearMenu();
          // selectedTd.className='';
          UI.utils.emptyNode(selectedTd)
          this.lastModified = this.createInputBoxIn(
            selectedTd,
            ' (Please Input) '
          )
          this.lastModified.isNew = false

          this.lastModified.select()
          break
        case 'predicate':
          // the goal is to bring back all the menus (with autocomplete functionality
          // this.performAutoCompleteEdit(selectedTd,['PredicateAutoComplete',
          //                        this.choiceQuery('SuggestPredicateByDomain')]);
          this.performAutoCompleteEdit(selectedTd, 'PredicateAutoComplete')
          break
        case 'ObjectProperty-like':
        case 'no-idea':
          // menu should be either function that
          this.performAutoCompleteEdit(selectedTd, 'GeneralAutoComplete')

        /*
                //<code time="original">
                emptyNode(selectedTd);
                this.lastModified=this.createInputBoxIn(selectedTd,"");
                this.lastModified.select();
                this.lastModified.addEventListener('keypress',this.AutoComplete,false);
                //this pops up the autocomplete menu
                this.AutoComplete(1);
                //</code>
                */
      }
    },

    literalModification: function literalModification (selectedTd) {
      UI.log.debug(
        'entering literal Modification with ' +
          selectedTd +
          selectedTd.textContent
      )
      // var This=outline.UserInput;
      if (selectedTd.className.indexOf(' pendingedit') !== -1) {
        UI.log.warn(
          'The node you attempted to edit has a request still pending.\n' +
            'Please wait for the request to finish (the text will turn black)\n' +
            'before editing this node again.'
        )
        return true
      }

      var target = selectedTd
      var about = this.getStatementAbout(target) // timbl - to avoid alert from random clicks
      if (!about) return
      try {
        var obj = UI.utils.getTerm(target)
        var trNode = UI.utils.ancestor(target, 'TR')
      } catch (e) {
        UI.log.warn('userinput.js: ' + e + UI.utils.getAbout(kb, selectedTd))
        UI.log.error(target + ' getStatement Error:' + e)
      }

      try {
        var tdNode = trNode.lastChild
      } catch (e) {
        UI.log.error(e + '@' + target)
      }
      // seems to be a event handling problem of firefox3
      /*
        if (e.type!='keypress'&&(selectedTd.className=='undetermined selected'||selectedTd.className=='undetermined')){
            this.Refill(e,selectedTd);
            return;
        }
        */
      // ignore clicking trNode.firstChild (be careful for <div> or <span>)
      // if (e.type!='keypress'&&target!=tdNode && UI.utils.ancestor(target,'TD')!=tdNode) return;

      if (obj.termType === 'Literal') {
        tdNode.removeChild(tdNode.firstChild) // remove the text

        if (obj.value.match('\n')) {
          // match a line feed and require <TEXTAREA>
          var textBox = myDocument.createElement('textarea')
          textBox.appendChild(myDocument.createTextNode(obj.value))
          textBox.setAttribute(
            'rows',
            (obj.value.match(/\n/g).length + 1).toString()
          )
          // g is for global(??)
          textBox.setAttribute('cols', '100') // should be the size of <TD>
          textBox.setAttribute('class', 'textinput')
          tdNode.appendChild(textBox)
          this.lastModified = textBox
        } else {
          this.lastModified = this.createInputBoxIn(tdNode, obj.value)
        }
        this.lastModified.isNew = false
        // Kenny: What should be expected after you click a editable text element?
        // Choice 1
        this.lastModified.select()
        // Choice 2 - direct the key cursor to where you click (failed attempt)
        // --------------------------------------------------------------------------
        // duplicate the event so user can edit without clicking twice
        // var e2=myDocument.createEvent("MouseEvents");
        // e2.initMouseEvent("click",true,true,window,0,0,0,0,0,false,false,false,false,0,null);
        // inputBox.dispatchEvent(e2);
        // ---------------------------------------------------------------------------
      }

      return true // this is not a valid modification
    },

    /**
     *  UIs: input event handlers, menu generation
     */
    performAutoCompleteEdit: function performAutoCompleteEdit (
      selectedTd,
      menu
    ) {
      UI.utils.emptyNode(selectedTd)
      qp('perform AutoCompleteEdit. THIS IS=' + this)
      this.lastModified = this.createInputBoxIn(selectedTd, '')
      this.lastModified.select()
      this.lastModified.addEventListener(
        'keypress',
        this.getAutoCompleteHandler(menu),
        false
      )
      /* keypress!?
           This is what I hate about UI programming.
           I shall write something about this but not now.
        */
      // this pops up the autocomplete menu
      // Pops up the menu even though no keypress has occurred
      // 1 is a dummy variable for the "enterEvent"
      this.getAutoCompleteHandler(menu)(1)
    },
    backOut: function backOut () {
      this.deleteTriple(this.lastModified.parentNode, true)
      this.lastModified = null
    },

    clearMenu: function clearMenu () {
      var menu = myDocument.getElementById(this.menuID)
      if (menu) {
        menu.parentNode.removeChild(menu)
        // emptyNode(menu);
      }
    },

    /* goes here when either this is a literal or escape from menu and then input text */
    clearInputAndSave: function clearInputAndSave (e) {
      if (!this.lastModified) return
      if (!this.lastModified.isNew) {
        try {
          var obj = this.getStatementAbout(this.lastModified).object
        } catch (e) {
          return
        }
      }
      var s = this.lastModifiedStat // when 'isNew' this is set at addNewObject()

      if (this.lastModified.value !== this.lastModified.defaultValue) {
        if (this.lastModified.value === '') {
          // ToDo: remove this
          this.lastModified.value = this.lastModified.defaultValue
          this.clearInputAndSave()
          return
        } else if (this.lastModified.isNew) {
          s = new UI.rdf.Statement(
            s.subject,
            s.predicate,
            kb.literal(this.lastModified.value),
            s.why
          )
          // TODO: DEFINE ERROR CALLBACK
          var defaultpropview = this.views.defaults[s.predicate.uri]
          var trCache = UI.utils.ancestor(this.lastModified, 'TR')
          try {
            UI.store.updater.update([], [s], function (
              uri,
              success,
              errorBody
            ) {
              if (!success) {
                UI.log.error(
                  'Error occurs while inserting ' +
                    s +
                    '\n\n' +
                    errorBody +
                    '\n'
                )
                // UI.log.warn("Error occurs while inserting "+s+'\n\n'+errorBody);
                outline.UserInput.deleteTriple(trCache.lastChild, true)
              }
            })
          } catch (e) {
            UI.log.error('Error inserting fact ' + s + ':\n\t' + e + '\n')
            return
          }
          s = kb.add(
            s.subject,
            s.predicate,
            kb.literal(this.lastModified.value),
            s.why
          )
        } else {
          if (this.statIsInverse) {
            UI.log.error(
              "Invalid Input: a literal can't be a subject in RDF/XML"
            )
            this.backOut()
            return
          }
          var s1, s2, s3
          switch (obj.termType) {
            case 'Literal':
              // generate path and nailing from current values

              // TODO: DEFINE ERROR CALLBACK
              var valueCache = this.lastModified.value
              trCache = UI.utils.ancestor(this.lastModified, 'TR')
              var oldValue = this.lastModified.defaultValue
              s2 = $rdf.st(
                s.subject,
                s.predicate,
                kb.literal(this.lastModified.value),
                s.why
              )
              try {
                UI.store.updater.update([s], [s2], function (
                  uri,
                  success,
                  errorBody
                ) {
                  if (success) {
                    obj.value = valueCache
                  } else {
                    UI.log.warn(
                      'Error occurs while editing ' + s + '\n\n' + errorBody
                    )
                    trCache.lastChild.textContent = oldValue
                  }
                  trCache.lastChild.className = trCache.lastChild.className.replace(
                    / pendingedit/g,
                    ''
                  )
                })
              } catch (e) {
                UI.log.warn('Error occurs while editing ' + s + ':\n\t' + e)
                return
              }
              // obj.value=this.lastModified.value;
              // UserInputFormula.statements.push(s);
              break
            case 'BlankNode': // a request refill with text
              // var newStat
              var textTerm = kb.literal(this.lastModified.value, '')
              // <Feature about="labelChoice">
              if (s.predicate.termType === 'Collection') {
                // case: add triple   ????????? Weird - tbl
                var selectedPredicate = s.predicate.elements[0] //    @@ TBL elements is a list on the predicate??
                if (kb.any(undefined, selectedPredicate, textTerm)) {
                  if (!e) {
                    // keyboard
                    var tdNode = this.lastModified.parentNode
                    e = {}
                    e.pageX = UI.utils.findPos(tdNode)[0]
                    e.pageY = UI.utils.findPos(tdNode)[1] + tdNode.clientHeight
                  }
                  this.showMenu(e, 'DidYouMeanDialog', undefined, {
                    dialogTerm: kb.any(undefined, selectedPredicate, textTerm),
                    bnodeTerm: s.subject
                  })
                } else {
                  s1 = UI.utils.ancestor(
                    UI.utils.ancestor(this.lastModified, 'TR').parentNode,
                    'TR'
                  ).AJAR_statement
                  s2 = $rdf.st(s.subject, selectedPredicate, textTerm, s.why)
                  var type = kb.the(s.subject, rdf('type'))
                  s3 = kb.anyStatementMatching(
                    s.subject,
                    rdf('type'),
                    type,
                    s.why
                  )
                  // TODO: DEFINE ERROR CALLBACK
                  // because the table is repainted, so...
                  trCache = UI.utils.ancestor(
                    UI.utils.ancestor(this.lastModified, 'TR'),
                    'TD'
                  ).parentNode
                  try {
                    UI.store.updater.update([], [s1, s2, s3], function (
                      uri,
                      success,
                      errorBody
                    ) {
                      if (!success) {
                        console.log(
                          'Error occurs while editing ' +
                            s1 +
                            '\n\n' +
                            errorBody
                        )
                        outline.UserInput.deleteTriple(trCache.lastChild, true) // @@@@ This
                      }
                    })
                  } catch (e) {
                    console.log(
                      'Error occurs while editing ' + s1 + ':\n\t' + e
                    )
                    return
                  }
                  kb.remove(s)
                  kb.add(s.subject, selectedPredicate, textTerm, s.why) // was: newStat =
                  // a subtle bug occurs here, if foaf:nick hasn't been dereferneced,
                  // this add will cause a repainting
                }
                var enclosingTd = UI.utils.ancestor(
                  this.lastModified.parentNode.parentNode,
                  'TD'
                )
                const defaultPane = panes.byName('default') // @@ check
                outline.outlineExpand(enclosingTd, s.subject, {
                  pane: defaultPane,
                  already: true
                })
                outline.walk('right', outline.focusTd)
                // </Feature>
              } else {
                this.fillInRequest(
                  'object',
                  this.lastModified.parentNode,
                  kb.literal(this.lastModified.value)
                )
                return // The new Td is already generated by fillInRequest, so it's done.
              }
              break
          }
        }
      } else if (this.lastModified.isNew) {
        // generate 'Request', there is no way you can input ' (Please Input) '
        var trNode = UI.utils.ancestor(this.lastModified, 'TR')
        var reqTerm = this.generateRequest(
          '(To be determined. Re-type of drag an object onto this field)'
        )
        var preStat = trNode.previousSibling.AJAR_statement // the statement of the same predicate
        this.formUndetStat(
          trNode,
          preStat.subject,
          preStat.predicate,
          reqTerm,
          preStat.why,
          false
        )
        // this why being the same as the previous statement
        this.lastModified = null

        // UI.log.warn("test .isNew)");
        return
      } else if (s.predicate.termType === 'Collection') {
        kb.removeMany(s.subject)
        var upperTr = UI.utils.ancestor(
          UI.utils.ancestor(this.lastModified, 'TR').parentNode,
          'TR'
        )
        preStat = upperTr.AJAR_statement
        reqTerm = this.generateRequest(
          '(To be determined. Re-type of drag an object onto this field)'
        )
        this.formUndetStat(
          upperTr,
          preStat.subject,
          preStat.predicate,
          reqTerm,
          preStat.why,
          false
        )
        outline.replaceTD(
          outline.outlineObjectTD(reqTerm, defaultpropview),
          upperTr.lastChild
        )
        this.lastModified = null
        return
      } else if (this.statIsInverse) {
        /*
      if ((s.object.termType === 'BlankNode' && !this.statIsInverse) ||
                  s.subject.termType === 'BlankNode' && this.statIsInverse) {
        this.backOut()
        return
      */
        if (s.subject.termType === 'BlankNode') {
          this.backOut()
          return
        }
      } else {
        if (s.object.termType === 'BlankNode') {
          this.backOut()
          return
        }
      }
      // case modified - literal modification only(for now).
      trNode = UI.utils.ancestor(this.lastModified, 'TR')
      // var defaultpropview = this.views.defaults[s.predicate.uri]

      if (!this.statIsInverse) {
        // this is for an old feature
        // outline.replaceTD(outline.outlineObjectTD(s.object, defaultpropview),trNode.lastChild);
        outline.replaceTD(
          outline.outlineObjectTD(
            kb.literal(this.lastModified.value),
            defaultpropview
          ),
          trNode.lastChild
        )
      } else {
        outline.replaceTD(
          outline.outlineObjectTD(s.subject, defaultpropview),
          trNode.lastChild
        )
      }
      if (this.lastModified.value !== this.lastModified.defaultValue) {
        trNode.lastChild.className += ' pendingedit'
      }
      // trNode.AJAR_statement=s;//you don't have to set AJAR_inverse because it's not changed
      // This is going to be painful when predicate-edit allowed
      this.lastModified = null
    },

    /* deletes the triple corresponding to selectedTd, remove that Td. */
    deleteTriple: function deleteTriple (selectedTd, isBackOut) {
      // ToDo: complete deletion of a node
      UI.log.debug('deleteTriple entered')

      // allow a pending node to be deleted if it's a backout sent by SPARQL update callback
      if (!isBackOut && selectedTd.className.indexOf(' pendingedit') !== -1) {
        console.log(
          'The node you attempted to edit has a request still pending.\n' +
            'Please wait for the request to finish (the text will turn black)\n' +
            'before editing this node again.'
        )
        outline.walk('up')
        return
      }
      var removedTr
      // var afterTr
      var s = this.getStatementAbout(selectedTd)
      if (
        !isBackOut &&
        !kb.whether(s.object, rdf('type'), UI.ns.link('Request')) &&
        // Better to check whether provenance is internal?
        !kb.whether(s.predicate, rdf('type'), UI.ns.link('Request')) &&
        !kb.whether(s.subject, rdf('type'), UI.ns.link('Request'))
      ) {
        UI.log.debug('about to send SPARQLUpdate')
        try {
          UI.store.updater.update([s], [], function (uri, success, errorBody) {
            if (success) {
              removefromview()
            } else {
              // removedTr.AJAR_statement=kb.add(s.subject,s.predicate,s.object,s.why);
              console.log(
                'Error occurs while deleting ' + s + '\n\n' + errorBody
              )
              selectedTd.className = selectedTd.className.replace(
                / pendingedit/g,
                ''
              )
            }
          })
          selectedTd.className += ' pendingedit'
        } catch (e) {
          UI.log.error(e)
          UI.log.warn('Error deleting statement ' + s + ':\n\t' + e)
          return
        }

        UI.log.debug('SPARQLUpdate sent')
      } else {
        // removal of an undetermined statement associated with pending TRs
        // TempFormula.remove(s);
      }
      UI.log.debug('about to remove ' + s)

      UI.log.debug('removed')
      outline.walk('up')
      removedTr = selectedTd.parentNode
      // afterTr = removedTr.nextSibling
      function removefromview () {
        var trIterator
        for (
          trIterator = removedTr;
          trIterator.childNodes.length === 1;
          trIterator = trIterator.previousSibling
        );
        if (trIterator === removedTr) {
          var theNext = trIterator.nextSibling
          if (theNext.nextSibling && theNext.childNodes.length === 1) {
            var predicateTd = trIterator.firstChild
            predicateTd.setAttribute(
              'rowspan',
              parseInt(predicateTd.getAttribute('rowspan')) - 1
            )
            theNext.insertBefore(trIterator.firstChild, theNext.firstChild)
          }
          removedTr.parentNode.removeChild(removedTr)
        } else {
          // !DisplayOptions["display:block on"].enabled){
          predicateTd = trIterator.firstChild
          predicateTd.setAttribute(
            'rowspan',
            parseInt(predicateTd.getAttribute('rowspan')) - 1
          )
          removedTr.parentNode.removeChild(removedTr)
        }
      }
      if (isBackOut) removefromview()
    },

    /* clipboard principle: copy wildly, paste carefully
      ToDoS:
      1. register Subcollection?
      2. copy from more than one selectedTd: 1.sequece 2.collection
      3. make a clipboard class?
    */
    clipboardInit: function clipboardInit () {
      outline.clipboard = {}
      outline.clipboard.objects = []
      outline.clipboard.predicates = []
      outline.clipboard.all = []
    },

    copyToClipboard: function copyToClipboard (address, selectedTd) {
      /*
        var clip  = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
        if (!clip) return false;
        var clipid = Components.interfaces.nsIClipboard;

        var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
        if (!trans) return false;

        var copytext = "Tabulator!!";

        var str   = Components.classes["@mozilla.org/supports-string;1"].
                           createInstance(Components.interfaces.nsISupportsString);
        if (!str) return false;

        str.data  = copytext;

        trans.addDataFlavor("text/x-moz-url");
        trans.setTransferData("text/x-mox-url", str, copytext.length * 2);

        clip.setData(trans, null, clipid.kGlobalClipboard);
        */

      var term = UI.utils.getTerm(selectedTd)
      switch (selectedTd.className) {
        case 'selected': // table header
        case 'obj selected':
          // var objects = outline.clipboard.objects
          outline.clipboard.objects.unshift(term)
          break
        case 'pred selected':
        case 'pred internal selected':
          outline.clipboard.predicates.unshift(term)
      }

      outline.clipboard.all.unshift(term)
    },

    insertTermTo: function insertTermTo (selectedTd, term, isObject) {
      switch (selectedTd.className) {
        case 'undetermined selected':
          var defaultpropview = this.views.defaults[
            selectedTd.parentNode.AJAR_statement.predicate.uri
          ]
          this.fillInRequest(
            selectedTd.nextSibling ? 'predicate' : 'object',
            selectedTd,
            term
          )
          break
        case 'pred selected': // paste objects into this predicate
          var insertTr = this.appendToPredicate(selectedTd)
          var preStat = selectedTd.parentNode.AJAR_statement
          defaultpropview = this.views.defaults[preStat.predicate.uri]
          insertTr.appendChild(outline.outlineObjectTD(term, defaultpropview))
          // modify store and update here
          var isInverse = selectedTd.parentNode.AJAR_inverse
          if (!isInverse) {
            insertTr.AJAR_statement = kb.add(
              preStat.subject,
              preStat.predicate,
              term,
              preStat.why
            )
          } else {
            insertTr.AJAR_statemnet = kb.add(
              term,
              preStat.predicate,
              preStat.object,
              preStat.why
            )
          }

          try {
            UI.store.updater.update([], [insertTr.AJAR_statement], function (
              uri,
              success,
              errorBody
            ) {
              if (!success) {
                UI.log.error(
                  'userinput.js (pred selected): Fail trying to insert statement ' +
                    insertTr.AJAR_statement +
                    ': ' +
                    errorBody
                )
              }
            })
          } catch (e) {
            UI.log.error(
              'Exception trying to insert statement ' +
                insertTr.AJAR_statement +
                ': ' +
                UI.utils.stackString(e)
            )
            return
          }
          insertTr.AJAR_inverse = isInverse
          UserInputFormula.statements.push(insertTr.AJAR_statement)
          break

        case 'selected': // header <TD>, undetermined generated
          var paneDiv = UI.utils.ancestor(selectedTd, 'TABLE').lastChild
          var newTr = paneDiv.insertBefore(
            myDocument.createElement('tr'),
            paneDiv.lastChild
          )
          // var titleTerm=UI.utils.getAbout(kb,UI.utils.ancestor(newTr,'TD'));
          preStat = newTr.previousSibling.AJAR_statement
          if (typeof isObject === 'undefined') isObject = true
          if (isObject) {
            // object inserted
            this.formUndetStat(
              newTr,
              preStat.subject,
              this.generateRequest('(TBD)', newTr, true),
              term,
              preStat.why,
              false
            )
            // defaultpropview temporaily not dealt with
            newTr.appendChild(outline.outlineObjectTD(term))
            outline.walk('moveTo', newTr.firstChild)
            this.startFillInText(newTr.firstChild)
          } else {
            // predicate inserted
            // existing predicate not expected
            var reqTerm = this.generateRequest(
              '(To be determined. Re-type of drag an object onto this field)',
              newTr
            )
            this.formUndetStat(
              newTr,
              preStat.subject,
              term,
              reqTerm,
              preStat.why,
              false
            )

            newTr.insertBefore(
              outline.outlinePredicateTD(term, newTr, false, false),
              newTr.firstChild
            )
            outline.walk('moveTo', newTr.lastChild)
            this.startFillInText(newTr.lastChild)
          }
          break
      }
    },

    Refill: function Refill (e, selectedTd) {
      UI.log.info('Refill' + selectedTd.textContent)
      var isPredicate = selectedTd.nextSibling
      var predicateQuery
      if (isPredicate) {
        // predicateTd
        if (selectedTd.nextSibling.className === 'undetermined') {
          /* Make set of proprties to propose for a predicate.
            The  naive approach is to take those which have a class
            of the subject as their domain.  But in fact we must offer anything which
            is not explicitly excluded, by having a domain disjointWith a
            class of the subject. */

          /* SELECT ?pred
               WHERE{
                   ?pred a rdf:Property.
                   ?pred rdfs:domain subjectClass.
               }
            */
          /*  SELECT ?pred ?class
                WHERE{
                   ?pred a rdf:Property.
                   subjectClass owl:subClassOf ?class.
                   ?pred rdfs:domain ?class.
               }
            */
          /*  SELECT ?pred
                WHERE{
                   subject a ?subjectClass.
                   ?pred rdfs:domain ?subjectClass.
                }
            */
          var subject = UI.utils.getAbout(
            kb,
            UI.utils.ancestor(selectedTd, 'TABLE').parentNode
          )
          var subjectClass = kb.any(subject, rdf('type'))
          var sparqlText = []
          var endl = '.\n'
          sparqlText[0] =
            'SELECT ?pred WHERE{\n?pred ' +
            rdf('type') +
            rdf('Property') +
            '.\n' +
            '?pred ' +
            UI.ns.rdfs('domain') +
            subjectClass +
            '.}' // \n is required? SPARQL parser bug?
          sparqlText[1] =
            'SELECT ?pred ?class\nWHERE{\n' +
            '?pred ' +
            rdf('type') +
            rdf('Property') +
            '.\n' +
            subjectClass +
            UI.ns.rdfs('subClassOf') +
            ' ?class.\n' +
            '?pred ' +
            UI.ns.rdfs('domain') +
            ' ?class.\n}'
          sparqlText[2] =
            'SELECT ?pred WHERE{\n' +
            subject +
            rdf('type') +
            kb.variable('subjectClass') +
            endl +
            kb.variable('pred') +
            UI.ns.rdfs('domain') +
            kb.variable('subjectClass') +
            endl +
            '}'
          predicateQuery = sparqlText.map($rdf.SPARQLToQuery)
        } else {
          // ------selector
          /* SELECT ?pred
               WHERE{
                   ?pred a rdf:Property.
                   ?pred rdfs:domain subjectClass.
                   ?pred rdfs:range objectClass.
               }
            */
          // Candidate
          /* SELECT ?pred
               WHERE{
                   subject a ?subjectClass.
                   object a ?objectClass.
                   ?pred rdfs:domain ?subjectClass.
                   ?pred rdfs:range ?objectClass.
            */
          subject = UI.utils.getAbout(
            kb,
            UI.utils.ancestor(selectedTd, 'TABLE').parentNode
          )
          subjectClass = kb.any(subject, rdf('type'))
          var object = selectedTd.parentNode.AJAR_statement.object
          // var objectClass = (object.termType === 'Literal') ? UI.ns.rdfs('Literal') : kb.any(object, rdf('type'))
          // var sparqlText="SELECT ?pred WHERE{\n?pred "+rdf('type')+rdf('Property')+".\n"+
          //               "?pred "+UI.ns.rdfs('domain')+subjectClass+".\n"+
          //               "?pred "+UI.ns.rdfs('range')+objectClass+".\n}"; // \n is required? SPARQL parser bug?
          sparqlText =
            'SELECT ?pred WHERE{' +
            subject +
            rdf('type') +
            '?subjectClass' +
            '.\n' +
            object +
            rdf('type') +
            '?objectClass' +
            '.\n' +
            '?pred ' +
            UI.ns.rdfs('domain') +
            '?subjectClass' +
            '.\n' +
            '?pred ' +
            UI.ns.rdfs('range') +
            '?objectClass' +
            '.\n}' // \n is required? SPARQL parser bug?
          predicateQuery = $rdf.SPARQLToQuery(sparqlText)
        }

        // -------presenter
        // ToDo: how to sort selected predicates?
        this.showMenu(e, 'GeneralPredicateChoice', predicateQuery, {
          isPredicate: isPredicate,
          selectedTd: selectedTd
        })
      } else {
        // objectTd
        var predicateTerm = selectedTd.parentNode.AJAR_statement.predicate
        if (
          kb.whether(
            predicateTerm,
            rdf('type'),
            UI.ns.owl('DatatypeProperty')
          ) ||
          predicateTerm.termType === 'Collection' ||
          kb.whether(predicateTerm, UI.ns.rdfs('range'), UI.ns.rdfs('Literal'))
        ) {
          selectedTd.className = ''
          UI.utils.emptyNode(selectedTd)
          this.lastModified = this.createInputBoxIn(
            selectedTd,
            ' (Please Input) '
          )
          this.lastModified.isNew = false

          this.lastModified.select()
        }

        // show menu for rdf:type
        if (
          selectedTd.parentNode.AJAR_statement.predicate.sameTerm(rdf('type'))
        ) {
          const sparqlText =
            'SELECT ?class WHERE{?class ' +
            rdf('type') +
            UI.ns.rdfs('Class') +
            '.}'
          // I should just use kb.each
          var classQuery = $rdf.SPARQLToQuery(sparqlText)
          this.showMenu(e, 'TypeChoice', classQuery, {
            isPredicate: isPredicate,
            selectedTd: selectedTd
          })
        }
      }
    },

    // This is where pubsPane.js comes in, with: outline.UserInput.getAutoCompleteHandler("JournalTAC")(e);
    getAutoCompleteHandler: function getAutoCompleteHandler (mode) {
      qp('\n\n***** In getAutoCompleteHandler ****** mode = ' + mode)
      if (mode === 'PredicateAutoComplete') {
        mode = 'predicate'
      } else if (mode !== 'JournalTAC') {
        // hq  // why? -tim  - not 'predicate' below
        mode = 'all'
      }

      var InputBox
      if (mode === 'JournalTAC') {
        // hq  // Better to pass in InputBox as a param
        InputBox = myDocument.getElementById('inpid_journal_title')
      } else {
        InputBox = this.lastModified || outline.getSelection()[0].firstChild
      }
      qp('InputBox=' + InputBox) // hq
      qp('InputBox.value=' + InputBox.value) // hq

      return function (enterEvent) {
        qp('ENTER EVENT=' + enterEvent)
        // Firefox 2.0.0.6 makes this not working? 'this' becomes [object HTMLInputElement]
        //                                           but not [wrapped ...]
        // var InputBox=(typeof enterEvent=='object')?this:this.lastModified;//'this' is the <input> element
        qp('1. outside (if eneterEvent)')
        var e = {}
        var tdNode = InputBox.parentNode
        if (!mode) mode = tdNode.nextSibling ? 'predicate' : 'all'
        e.pageX = UI.utils.findPos(tdNode)[0]
        e.pageY = UI.utils.findPos(tdNode)[1] + tdNode.clientHeight
        qp('epX=' + e.pageX + ', epY=' + e.pageY + ', mode=' + mode)
        var menu = myDocument.getElementById(outline.UserInput.menuID)
        function setHighlightItem (item) {
          if (!item) return // do not make changes
          if (menu.lastHighlight) menu.lastHighlight.className = ''
          menu.lastHighlight = item
          menu.lastHighlight.className = 'activeItem'
          outline.showURI(UI.utils.getAbout(kb, menu.lastHighlight))
        }
        if (enterEvent) {
          // either the real event of the pseudo number passed by OutlineKeypressPanel
          qp('2. in (if enterEvent).  with type = ' + typeof enterEvent)
          var newText = InputBox.value

          if (typeof enterEvent === 'object') {
            qp(
              '3. in typeof enterEvent is object, will switch to keys, arrows, etc. keycode = ' +
                enterEvent.keyCode
            )
            enterEvent.stopPropagation()
            if (menu && !menu.lastHighlight) {
              // this ensures the following operation valid
              setHighlightItem(menu.firstChild.firstChild)
            }
            switch (enterEvent.keyCode) {
              case 13: // enter
              case 9: // tab
                qp('handler: Enter or Tab')
                if (!menu) {
                  outline.UserInput.clearInputAndSave()
                  return
                }
                if (!menu.lastHighlight) {
                  if (mode === 'JournalTAC') {
                    outline.UserInput.clearMenu()
                    qp('no lastH')
                    return 'no lastH'
                  }
                  return
                } // warning?

                if (menu.lastHighlight.tagName === 'INPUT') {
                  switch (menu.lastHighlight.value) {
                    case 'New...':
                      qp('subcase New')
                      outline.UserInput.createNew()
                      break
                    case 'GiveURI':
                      qp('subcase GiveURI')
                      outline.UserInput.inputURI()
                      break
                  }
                } else {
                  // pubsPane Stuff:
                  if (mode === 'JournalTAC') {
                    qp('movedArrow? ' + movedArrow)
                    // Enter only works if arrows have been moved
                    if (movedArrow && menu.lastHighlight) {
                      // Get the title from the DOM
                      // tr, th, div, innerHTML
                      var jtitle =
                        menu.lastHighlight.firstChild.firstChild.innerHTML
                      // tr, th, td, innerHTML
                      var juri =
                        menu.lastHighlight.firstChild.nextSibling.innerHTML
                      // clearing out the &lt; and &gt; from juri
                      juri = juri.slice(4, -4)
                      return ['gotdptitle', jtitle, juri]
                    }
                    // If doesn't qualify to be autocomplete, return this random string, since pubsPane checks for "gotdptitle"
                    return 'asGivenTxt'
                  }

                  var inputTerm = UI.utils.getAbout(kb, menu.lastHighlight)
                  var fillInType = mode === 'predicate' ? 'predicate' : 'object'
                  outline.UserInput.clearMenu()
                  outline.UserInput.fillInRequest(
                    fillInType,
                    InputBox.parentNode,
                    inputTerm
                  )
                  // if (outline.UserInput.fillInRequest(fillInType,InputBox.parentNode,inputTerm))
                  //    outline.UserInput.clearMenu();
                }
                qp('outside')
                return
              case 38: // up
                qp('handler: Arrow UP')
                movedArrow = true // hq
                if (
                  newText === '' &&
                  menu.lastHighlight.tagName === 'TR' &&
                  !menu.lastHighlight.previousSibling
                ) {
                  setHighlightItem(menu.firstChild.firstChild)
                } else {
                  setHighlightItem(menu.lastHighlight.previousSibling)
                }
                return "I'm a little Arrow Up"
              case 40: // down
                qp('handler: Arrow Down')
                movedArrow = true // hq
                if (menu.lastHighlight.tagName === 'INPUT') {
                  setHighlightItem(menu.childNodes[1].firstChild)
                } else {
                  setHighlightItem(menu.lastHighlight.nextSibling)
                }
                return "I'm a little Down Arrow"
              case 37: // left
              case 39: // right
                qp('handler: Arrow left, right')
                if (menu.lastHighlight.tagName === 'INPUT') {
                  if (enterEvent.keyCode === 37) {
                    setHighlightItem(menu.lastHighlight.previousSibling)
                  } else {
                    setHighlightItem(menu.lastHighlight.nextSibling)
                  }
                }
                return
              case 8: // backspace
                qp('handler: Backspace')
                newText = newText.slice(0, -1)
                break
              case 27: // esc to enter literal
                qp('handler: Esc')
                if (!menu) {
                  outline.UserInput.backOut()
                  return
                }
                outline.UserInput.clearMenu()
                // Not working? I don't know.
                // InputBox.removeEventListener('keypress',outline.UserInput.Autocomplete,false);
                return
              // break
              default:
                qp('handler: Default')
                movedArrow = false // hq
                // we need this because it is keypress, seeAlso performAutoCompleteEdit
                qp('oldtext=' + newText)
                newText += String.fromCharCode(enterEvent.charCode)
                qp('charcodent=' + enterEvent.charCode)
                qp('strcharcod=' + String.fromCharCode(enterEvent.charCode))
                console.log('DEFAULT txtstr=' + newText + '\n') // hq
            }
          } // endif typeof(event) === object

          // UI.log.warn(InputBox.choices.length);
          // for(i=0;InputBox.choices[i].label<newText;i++); //O(n) ToDo: O(log n)
          if (mode === 'all') {
            qp('generalAC after switch, newText=' + newText + 'mode is all')
            outline.UserInput.clearMenu()
            // outline.UserInput.showMenu(e,'GeneralAutoComplete',undefined,{'isPredicate':false,'selectedTd':tdNode,'choices':InputBox.choices, 'index':i});
            outline.UserInput.showMenu(e, 'GeneralAutoComplete', undefined, {
              inputText: newText,
              selectedTd: tdNode
            })
            if (newText.length === 0) outline.UserInput.WildCardButtons()
          } else if (mode === 'predicate') {
            qp(
              'predicateAC after switch, newText=' +
                newText +
                'mode is predicate'
            )
            outline.UserInput.clearMenu()
            outline.UserInput.showMenu(e, 'PredicateAutoComplete', undefined, {
              inputText: newText,
              isPredicate: true,
              selectedTd: tdNode
            })
          } else if (mode === 'JournalTAC') {
            // hq
            qp('JouralTAC after switch, newText=' + newText)
            outline.UserInput.clearMenu()
            // Goto showMenu
            outline.UserInput.showMenu(
              e,
              'JournalTitleAutoComplete',
              undefined,
              { inputText: newText },
              'orderisuseless'
            )
          }
          menu = myDocument.getElementById(outline.UserInput.menuID)
          if (!menu) {
            qp('No menu element.  Do not show menu.')
            return
          }
          qp('at end of handler\n^^^^^^^^^^^^^^^^^\n\n')
          setHighlightItem(menu.firstChild.firstChild)
          outline.showURI(UI.utils.getAbout(kb, menu.lastHighlight))
          return 'nothing to return'
        }
      } // end of return function
    },

    // Add the buttons which allow the suer to craete a new object
    // Or reference an exiting one with a URI.
    //
    WildCardButtons: function WildCardButtons () {
      var menuDiv = myDocument.getElementById(outline.UserInput.menuID)
      var div = menuDiv.insertBefore(
        myDocument.createElement('div'),
        menuDiv.firstChild
      )
      var input1 = div.appendChild(myDocument.createElement('input'))
      var input2 = div.appendChild(myDocument.createElement('input'))
      input1.type = 'button'
      input1.value = 'New...'
      input2.type = 'button'
      input2.value = 'Know its URI'

      function highlightInput (e) {
        // same as the one in newMenu()
        var menu = myDocument.getElementById(outline.UserInput.menuID)
        if (menu.lastHighlight) menu.lastHighlight.className = ''
        menu.lastHighlight = UI.utils.ancestor(UI.utils.getTarget(e), 'INPUT')
        if (!menu.lastHighlight) return // mouseover <TABLE>
        menu.lastHighlight.className = 'activeItem'
      }
      div.addEventListener('mouseover', highlightInput, false)
      input1.addEventListener('click', this.createNew, false)
      input2.addEventListener('click', this.inputURI, false)
    },
    // ToDo: shrink rows when \n+backspace
    Keypress: function (e) {
      if (e.keyCode === 13) {
        if (outline.targetOf(e).tagName !== 'TEXTAREA') {
          this.clearInputAndSave()
        } else {
          // <TEXTAREA>
          var preRows = parseInt(this.lastModified.getAttribute('rows'))
          this.lastModified.setAttribute('rows', (preRows + 1).toString())
          e.stopPropagation()
        }
      }
      // Remark by Kenny: If the user wants to input more lines into an one-line-only blank.
      //                 Direct him/her to a new blank (how?)
    },

    Mousedown: function (e) {
      qp('MOUSING DOWN')
      // temporary key ctrl+s or q for swiching mode
      // This was in HCIOptions "right click to switch mode":
      window.addEventListener(
        'keypress',
        function (e) {
          if (e.ctrlKey && (e.charCode === 115 || e.charCode === 113)) {
            UserInput.switchMode()
          }
        },
        false
      )
      window.addEventListener('mousedown', UserInput.Mousedown, false)
      document.getElementById('outline').oncontextmenu = function () {
        return false
      }

      if (e.button === 2) {
        // right click
        UserInput.switchMode()
        if (e) {
          e.preventDefault()
          e.stopPropagation()
        }
      }
    },

    Mouseover: function Mouseover (e) {
      this.className = 'bottom-border-active'
      if (this._tabulatorMode === 1) {
        switch (UI.utils.getTarget(e).tagName) {
          case 'TD':
            var preTd = UI.utils.getTarget(e)
            if (preTd.className === 'pred') preTd.style.cursor = 'copy'
            break
          // Uh...I think I might have to give up this
          case 'DIV':
            var border = UI.utils.getTarget(e)
            if (UI.utils.getTarget(e).className === 'bottom-border') {
              border.style.borderColor = 'rgb(100%,65%,0%)'
              border.style.cursor = 'copy'
            }
            break
          default:
        }
      }
    },

    Mouseout: function (e) {
      this.className = 'bottom-border'
      if (this._tabulatorMode === 1) {
        var border = UI.utils.getTarget(e)
        if (UI.utils.getTarget(e).className === 'bottom-border') {
          border.style.borderColor = 'transparent'
          border.style.cursor = 'auto'
        }
      }
    },

    /**
     * Utilities
     */

    whatSortOfEditCell: function whatSortOfEditCell (selectedTd) {
      if (selectedTd.nextSibling) return 'predicate'
      var predicateTerm = this.getStatementAbout(selectedTd).predicate
      // var predicateTerm=selectedTd.parentNode.AJAR_statement.predicate;
      if (
        kb.whether(
          predicateTerm,
          UI.ns.rdf('type'),
          UI.ns.owl('DatatypeProperty')
        ) ||
        kb.whether(predicateTerm, UI.ns.rdfs('range'), UI.ns.rdfs('Literal')) ||
        predicateTerm.termType === 'Collection'
      ) {
        return 'DatatypeProperty-like'
      } else if (
        kb.whether(predicateTerm, rdf('type'), UI.ns.owl('ObjectProperty'))
      ) {
        return 'ObjectProperty-like'
      } else {
        return 'no-idea'
      }
    },

    getStatementAbout: function getStatementAbout (something) {
      // var trNode=something.parentNode;
      var trNode = UI.utils.ancestor(something, 'TR')
      if (!trNode) {
        throw new Error('No ancestor TR for the TD we clicked on:' + something)
      }
      try {
        var statement = trNode.AJAR_statement
      } catch (e) {
        throw new Error(
          'No AJAR_statement!' +
            something +
            something.textContent +
            ' has ancestor ' +
            trNode
        ) // was commented out @@
        // throw 'TR not a statement TR' // was commented out @@
      }
      // Set last modified here, I am not sure this will be ok.
      this.lastModifiedStat = trNode.AJAR_statement
      this.statIsInverse = trNode.AJAR_inverse

      return statement
    },

    createInputBoxIn: function createInputBoxIn (tdNode, defaultText) {
      function UpAndDown (e) {
        if (e.keyCode === 38 || e.keyCode === 40) {
          outline.OutlinerKeypressPanel(e)
          outline.UserInput.clearInputAndSave()
        }
      }
      UI.log.info(
        'myDocument in createInputBoxIn is now ' + myDocument.location
      )
      UI.log.info('outline.document is now ' + outline.document.location)
      var inputBox = myDocument.createElement('input')
      inputBox.setAttribute('value', defaultText)
      inputBox.setAttribute('class', 'textinput')
      // inputBox.setAttribute('size','100');//should be the size of <TD>
      if (tdNode.className !== 'undetermined selected') {
        inputBox.setAttribute('size', '100') // should be the size of <TD>
        inputBox.addEventListener('keypress', UpAndDown, false)
      }
      tdNode.appendChild(inputBox)
      return inputBox
    },

    // called when 'New...' is clicked(eventlistener) or enter is pressed while 'New...' is highlighted
    createNew: function createNew (_e) {
      outline.UserInput.clearMenu()
      var selectedTd = outline.getSelection()[0]
      var targetdoc = selectedTd.parentNode.AJAR_statement.why
      var newTerm = kb.nextSymbol(targetdoc)
      outline.UserInput.fillInRequest('object', selectedTd, newTerm)
      // selection is changed
      outline.outlineExpand(outline.getSelection()[0], newTerm)
    },

    inputURI: function inputURI (_e) {
      var This = outline.UserInput
      This.clearMenu()
      var selectedTd = outline.getSelection()[0]
      UI.utils.emptyNode(selectedTd)
      var tiptext = ' (Type a URI) '
      This.lastModified = This.createInputBoxIn(selectedTd, tiptext)
      This.lastModified.select()
      function typeURIhandler (e) {
        e.stopPropagation()
        switch (e.keyCode) {
          case 13: // enter
          case 9: // tab
            // this is input box
            if (this.value !== tiptext) {
              var newuri = this.value // @@ Removed URI "fixup" code
              This.fillInRequest('object', selectedTd, kb.sym(newuri))
            }
        }
      }
      This.lastModified.addEventListener('keypress', typeURIhandler, false)
      /*
        if (false && UI.isExtension){
            var selectedTd = outline.getSelection()[0];
            emptyNode(selectedTd);
            var textbox = myDocument.createElementNS(kXULNS,'textbox');
            textbox.setAttribute('type','autocomplete');
            textbox.setAttribute('autocompletesearch','history');
            selectedTd.appendChild(textbox);

            urlbar = gURLBar.cloneNode(false);
            selectedTd.appendChild(urlbar);
            urlbar.mController = gURLBar.mController;

        }
        */
    },

    appendToPredicate: function appendToPredicate (predicateTd) {
      var isEnd = false
      var trIterator
      try {
        for (
          trIterator = predicateTd.parentNode.nextSibling;
          trIterator.childNodes.length === 1 && trIterator.AJAR_statement;
          // number of nodes as condition, also beware of toggle Trs that don't have AJAR_statement
          trIterator = trIterator.nextSibling
        ) {}
      } catch (e) {
        isEnd = true
      }
      // if(!isEnd && HCIoptions["bottom insert highlights"].enabled) trIterator=trIterator.previousSibling;

      var insertTr = myDocument.createElement('tr')
      // style stuff, I'll have to investigate appendPropertyTRs() somehow
      insertTr.style.colspan = '1'
      insertTr.style.display = 'block'

      insertTr.style.display = ''
      if (predicateTd.hasAttribute('rowspan')) {
        predicateTd.setAttribute(
          'rowspan',
          parseInt(predicateTd.getAttribute('rowspan')) + 1
        )
      }

      if (!predicateTd.hasAttribute('rowspan')) {
        predicateTd.setAttribute('rowspan', '2')
      }

      if (!isEnd) {
        trIterator.parentNode.insertBefore(insertTr, trIterator)
      } else {
        var table = predicateTd.parentNode.parentNode
        if (table.className === 'defaultPane') {
          table.insertBefore(insertTr, table.lastChild)
        } else {
          table.appendChild(insertTr)
        }
      }

      return insertTr
    },

    bnode2symbol: function bnode2symbol (bnode, symbol) {
      kb.copyTo(bnode, symbol, ['two-direction', 'delete'])
    },

    generateRequest: function generateRequest (
      tipText,
      trNew,
      isPredicate,
      notShow
    ) {
      var trNode
      if (!notShow) {
        if (trNew) {
          trNode = trNew
        } else {
          trNode = UI.utils.ancestor(this.lastModified, 'TR')
        }
        UI.utils.emptyNode(trNode)
      }

      // create the undetermined term
      // Choice 1:
      // var reqTerm=kb.literal("TBD");
      // this is troblesome since RDFIndexedFormula does not allow me to add <x> <y> "TBD". twice
      // Choice 2: Use a variable.
      // Agreed. Kenny wonders whether there is RDF/XML representation of a variable.
      // labelPriority[UI.ns.link('message').uri] = 20;

      // We must get rid of this clutter in the store. "OK, will be stroed in a seperate formula to avoid bugs", Kenny says
      var tp = TempFormula
      var reqTerm = tp.bnode()
      tp.add(reqTerm, UI.ns.rdf('type'), UI.ns.link('Request'))
      if (tipText.length < 10) {
        tp.add(reqTerm, UI.ns.link('message'), tp.literal(tipText))
      } else {
        tp.add(reqTerm, UI.ns.link('message'), tp.literal(tipText))
      }
      tp.add(reqTerm, UI.ns.link('to'), tp.literal('The User'))
      tp.add(reqTerm, UI.ns.link('from'), tp.literal('The User'))

      // append the undetermined td
      if (!notShow) {
        var newNode
        if (isPredicate) {
          newNode = trNode.appendChild(
            outline.outlinePredicateTD(reqTerm, trNode, false, false)
          )
        } else {
          newNode = trNode.appendChild(outline.outlineObjectTD(reqTerm))
        }
        newNode.className = 'undetermined'
        newNode.textContent = tipText
      }

      return reqTerm
    },

    showMenu: function showMenu (
      e,
      menuType,
      inputQuery,
      extraInformation,
      _order
    ) {
      // ToDo:order, make a class?
      UI.log.info('myDocument is now ' + myDocument.location)
      UI.log.info('outline.doucment is now ' + outline.document.location)
      var This = this
      var menu = myDocument.createElement('div')
      qp('\n**** In showMenu, menuType = ' + menuType + '\n')
      if (extraInformation) {
        for (var x in extraInformation) {
          console.log('\t extra ' + x + ': ' + extraInformation[x] + '\n')
        }
      }
      console.log('CREATED MENU\n') // hq
      menu.id = this.menuID
      menu.className = 'outlineMenu'
      // menu.addEventListener('click',false);
      menu.style.top = e.pageY + 'px'
      menu.style.left = e.pageX + 'px'

      /// /For pubsPane
      // This is for setting the location of the dropdown menu, because
      // JournalTitleAutoComplete is called with a keypress, and not mouse actions
      // Get Offset of an HTML element
      var getOffset = function getOffset (el) {
        var _lf = 0
        var _tp = 0
        var oldlf = 0
        var oldtp = 0
        var newlf = 0
        var newtp = 0

        // repeatedly get ancestor's positions
        // TODO: STILL a small offset/bug
        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
          newlf = el.offsetLeft
          newtp = el.offsetTop

          // only change if the new parent's offset is different
          if (newlf !== oldlf) {
            _lf += el.offsetLeft - el.scrollLeft
          }
          if (newtp !== oldtp) {
            _tp += el.offsetTop - el.scrollTop
          }

          oldlf = newlf
          oldtp = newtp

          el = el.parentNode
        }
        // there is a constant offset
        return { top: _tp + 54, left: _lf - 38 }
      }
      // Change the position of menu in pubsPane's journal Title AC
      if (menuType === 'JournalTitleAutoComplete') {
        // hql
        var loc = getOffset(myDocument.getElementById('inpid_journal_title'))
        loc.left -= myDocument.getElementById('inpid_journal_title').scrollTop
        menu.style.top = loc.top + 'px'
        menu.style.left = loc.left + 'px'
      }
      console.log(
        'menu at top=' + menu.style.top + ' left=' + menu.style.left + '\n'
      ) // hql
      // \\\\\\\hql

      myDocument.body.appendChild(menu)
      var table = menu.appendChild(myDocument.createElement('table'))

      menu.lastHighlight = null
      function highlightTr (e) {
        if (menu.lastHighlight) menu.lastHighlight.className = ''
        menu.lastHighlight = UI.utils.ancestor(UI.utils.getTarget(e), 'TR')
        if (!menu.lastHighlight) return // mouseover <TABLE>
        menu.lastHighlight.className = 'activeItem'
      }

      table.addEventListener('mouseover', highlightTr, false)

      // setting for action after selecting item
      switch (menuType) {
        case 'DidYouMeanDialog':
          var selectItem = function selectItem (e) {
            qp('DID YOU MEAN SELECT ITEM!!!!!')
            var target = UI.utils.ancestor(UI.utils.getTarget(e), 'TR')
            if (target.childNodes.length === 2 && target.nextSibling) {
              // Yes
              kb.add(bnodeTerm, IDpredicate, IDterm) // used to connect the two
              outline.UserInput.clearMenu()
            } else if (target.childNodes.length === 2) {
              outline.UserInput.clearMenu()
            }
          }
          break
        case 'LimitedPredicateChoice':
          var clickedTd = extraInformation.clickedTd
          selectItem = function selectItem (e) {
            qp('LIMITED P SELECT ITEM!!!!')
            var selectedPredicate = UI.utils.getAbout(kb, UI.utils.getTarget(e))
            var predicateChoices =
              clickedTd.parentNode.AJAR_statement.predicate.elements
            for (var i = 0; i < predicateChoices.length; i++) {
              if (predicateChoices[i].sameTerm(selectedPredicate)) {
                predicateChoices.unshift(predicateChoices.splice(i, 1)[0])
              }
            }
            outline.UserInput.clearMenu()

            // refresh the choice
            var tr = clickedTd.parentNode
            var newTd = outline.outlinePredicateTD(
              tr.AJAR_statement.predicate,
              tr
            )
            tr.insertBefore(newTd, clickedTd)
            tr.removeChild(clickedTd)
            This.lastModified.select()
          }
          break
        case 'PredicateAutoComplete':
        case 'GeneralAutoComplete':
        case 'GeneralPredicateChoice':
        case 'JournalTitleAutoComplete': // hql
        case 'TypeChoice':
          // Clickable menu
          var isPredicate = extraInformation.isPredicate
          var selectedTd = extraInformation.selectedTd
          selectItem = function selectItem (e) {
            qp('WOOHOO')
            var inputTerm = UI.utils.getAbout(kb, UI.utils.getTarget(e))
            qp('GENERAL SELECT ITEM!!!!!!=' + inputTerm)
            qp('target=' + UI.utils.getTarget(e))
            if (isPredicate) {
              qp('1')
              if (
                outline.UserInput.fillInRequest(
                  'predicate',
                  selectedTd,
                  inputTerm
                )
              ) {
                qp('2')
                outline.UserInput.clearMenu()
              }
            } else {
              qp('3')
              // thisInput.fillInRequest('object',selectedTd,inputTerm); //why is this not working?
              if (
                outline.UserInput.fillInRequest('object', selectedTd, inputTerm)
              ) {
                qp('4')
                outline.UserInput.clearMenu()
              }
            }
          }
          break
        default:
          throw new Error('userinput: unexpected mode')
      }
      // hq: this line makes the menu clickable
      table.addEventListener('click', selectItem, false)

      // Add Items to the list
      // build NameSpaces here from knowledge base
      var NameSpaces = {}
      // for each (ontology in ontologies)
      kb.each(undefined, UI.ns.rdf('type'), UI.ns.owl('Ontology')).map(
        function (ontology) {
          var label = UI.utils.label(ontology)
          if (!label) return
          // this is like extracting metadata from URI. Maybe it's better not to take the abbrevs.
          var match = label.value.match(/\((.+?)\)/)
          if (match) {
            NameSpaces[match[1]] = ontology.uri
          } else {
            NameSpaces[label.value] = ontology.uri
          }
        }
      )
      function addMenuItem (predicate) {
        if (table.firstChild && table.firstChild.className === 'no-suggest') {
          table.removeChild(table.firstChild)
        }
        var Label = UI.utils.predicateLabelForXML(predicate, false)
        // Label = Label.slice(0,1).toUpperCase() + Label.slice(1);

        if (!predicate.uri) return // bnode
        var theNamespace = '??'
        for (var name in NameSpaces) {
          UI.log.debug(NameSpaces[name])
          if (UI.rdf.Util.string_startswith(predicate.uri, NameSpaces[name])) {
            theNamespace = name
            break
          }
        }

        var tr = table.appendChild(myDocument.createElement('tr'))
        tr.setAttribute('about', predicate)
        var th = tr.appendChild(myDocument.createElement('th'))
        th.appendChild(myDocument.createElement('div')).appendChild(
          myDocument.createTextNode(Label)
        )
        tr.appendChild(myDocument.createElement('td')).appendChild(
          myDocument.createTextNode(theNamespace.toUpperCase())
        )
      }
      function addPredicateChoice (selectedQuery) {
        return function (bindings) {
          var predicate = bindings[selectedQuery.vars[0]]
          addMenuItem(predicate)
        }
      }
      function clearMenu (e) {
        This.clearMenu()
        e.stopPropagation()
      }
      var inputText
      switch (menuType) {
        case 'DidYouMeanDialog':
          var dialogTerm = extraInformation.dialogTerm
          var bnodeTerm = extraInformation.bnodeTerm
          // have to do style instruction passing
          menu.style.width = 'auto'

          var h1 = table.appendChild(myDocument.createElement('tr'))
          var h1th = h1.appendChild(myDocument.createElement('th'))
          h1th.appendChild(myDocument.createTextNode('Did you mean...'))
          var plist = kb.statementsMatching(dialogTerm)
          var i
          for (i = 0; i < plist.length; i++) {
            if (
              kb.whether(
                plist[i].predicate,
                rdf('type'),
                UI.ns.owl('InverseFunctionalProperty')
              )
            ) {
              break
            }
          }
          var IDpredicate = plist[i].predicate
          var IDterm = kb.any(dialogTerm, plist[i].predicate)
          var text =
            UI.utils.label(dialogTerm) +
            ' who has ' +
            UI.utils.label(IDpredicate) +
            ' ' +
            IDterm +
            '?'
          var h2 = table.appendChild(myDocument.createElement('tr'))
          var h2th = h2.appendChild(myDocument.createElement('th'))
          h2th.appendChild(myDocument.createTextNode(text))
          h1th.setAttribute('colspan', '2')
          h2th.setAttribute('colspan', '2')
          var ans1 = table.appendChild(myDocument.createElement('tr'))
          ans1
            .appendChild(myDocument.createElement('th'))
            .appendChild(myDocument.createTextNode('Yes'))
          ans1
            .appendChild(myDocument.createElement('td'))
            .appendChild(myDocument.createTextNode('BOOLEAN'))
          var ans2 = table.appendChild(myDocument.createElement('tr'))
          ans2
            .appendChild(myDocument.createElement('th'))
            .appendChild(myDocument.createTextNode('No'))
          ans2
            .appendChild(myDocument.createElement('td'))
            .appendChild(myDocument.createTextNode('BOOLEAN'))
          break
        case 'PredicateAutoComplete': // Prompt user  for possible relationships for new data
          inputText = extraInformation.inputText
          /*   The labeller functionality code ahs been lost or dropped -- reinstate this? */
          // @@ TODO: Write away the need for exception on next line
          // eslint-disable-next-line no-case-declarations
          const predicates = outline.labeller.searchAdv(
            inputText,
            undefined,
            'predicate'
          )
          // @@ TODO: Write away the need for exception on next line
          // eslint-disable-next-line no-case-declarations
          let results = [] // @@ fixme
          for (let i = 0; i < predicates.length; i++) {
            var tempQuery = {}
            tempQuery.vars = []
            tempQuery.vars.push('Kenny')
            var tempBinding = {}
            tempBinding.Kenny = kb.fromNT(predicates[i].NT)
            try {
              addPredicateChoice(tempQuery)(tempBinding)
            } catch (e) {
              throw new Error("I'll deal with bnodes later...[Kenny]" + e)
            } // I'll deal with bnodes later...
          }

          // @@ TODO: Write away the need for exception on next line
          // eslint-disable-next-line no-case-declarations
          let entries = results[0]
          if (entries.length === 0) {
            console.log('cm length 0\n') // hq
            this.clearMenu()
            return
          }
          for (let i = 0; i < entries.length && i < 10; i++) {
            // do not show more than 30 items
            addMenuItem(entries[i][1])
          }
          break
        case 'GeneralAutoComplete':
          inputText = extraInformation.inputText
          try {
            results = outline.labeller.search(inputText)
          } catch (e) {
            console.log(
              'GeneralAutoComplete: debug me ' +
                extraInformation.selectedTd.textContent +
                '\n' +
                e +
                '\n'
            )
          }
          entries = results[0] // [label, subject,priority]
          var types = results[1]
          if (entries.length === 0) {
            console.log('cm length 0\n') // hq
            this.clearMenu()
            return
          }
          for (let i = 0; i < entries.length && i < 10; i++) {
            // do not show more than 30 items
            // console.log("\nGEN ENTRIES["+i+"] = "+entries[i]+"\n");//hq
            var thisNT = entries[i][1].toNT()
            // console.log("thisNT="+thisNT+"\n");
            var tr = table.appendChild(myDocument.createElement('tr'))
            tr.setAttribute('about', thisNT)
            var th = tr.appendChild(myDocument.createElement('th'))
            th.appendChild(myDocument.createElement('div')).appendChild(
              myDocument.createTextNode(entries[i][0])
            )
            // var theTerm = entries[i][1]
            // var type=theTerm?kb.any(kb.fromNT(thisNT),rdf('type')):undefined;
            var type = types[i]
            var typeLabel = type ? UI.utils.label(type) : ''
            tr.appendChild(myDocument.createElement('td')).appendChild(
              myDocument.createTextNode(typeLabel)
            )
          }
          /* var choices=extraInformation.choices;
                var index=extraInformation.index;
                for (var i=index-10;i<index+20;i++){ //show 30 items
                    if (i<0) i=0;
                    if (i==choices.length) break;
                    var thisNT=choices[i].NT;
                    var tr=table.appendChild(myDocument.createElement('tr'));
                    tr.setAttribute('about',thisNT);
                    var th=tr.appendChild(myDocument.createElement('th'))
                    th.appendChild(myDocument.createElement('div')).appendChild(myDocument.createTextNode(choices[i].label));
                    var theTerm=kb.fromNT(thisNT);
                    var type=theTerm?kb.any(kb.fromNT(thisNT),rdf('type')):undefined;
                    var typeLabel=type?label(type):"";
                    tr.appendChild(myDocument.createElement('td')).appendChild(myDocument.createTextNode(typeLabel));
                }
                */
          break
        case 'JournalTitleAutoComplete': // hql
          // HEART OF JOURNAL TITLE AUTOCOMPLETE

          // extraInformatin is from above getAutoCompleteHandler
          inputText = extraInformation.inputText
          console.log('testing searching text= ' + inputText + ' =====\n')
          console.log('\n===start JournalTitleAutoComplete\n')

          // Gets all the URI's with type Journal in the knowledge base
          var juris = kb.each(undefined, rdf('type'), bibo('Journal'))

          var matchedtitle = [] // debugging display before inserts into menu

          for (let i = 0; i < juris.length; i++) {
            var juri = juris[i]
            var jtitle = kb.each(juri, dcelems('title'), undefined)

            var jtstr = jtitle + ''

            var matchstr = inputText.toLowerCase()
            var jTitleLowerCase = jtstr.toLowerCase()

            // If the inputText as a whole is contained in a journal title
            if (jTitleLowerCase.search(matchstr) !== -1) {
              qp('FOUND A Journal Title Match!!!!!!')
              matchedtitle.push(jtitle)

              // Add it as a row to the menu:
              // === Title, URI ==
              const tr = table.appendChild(myDocument.createElement('tr'))
              tr.setAttribute('about', 'journalTitle')
              const th = tr.appendChild(myDocument.createElement('th'))
              th.appendChild(myDocument.createElement('div')).appendChild(
                myDocument.createTextNode(jtitle)
              )
              tr.appendChild(myDocument.createElement('td')).appendChild(
                myDocument.createTextNode(juri)
              )
            }
          }

          console.log('matched: ' + matchedtitle + '\n')

          console.log("\\\\done showMenu's JTAutocomplete\n")
          break
        case 'LimitedPredicateChoice':
          var choiceTerm = UI.utils.getAbout(kb, extraInformation.clickedTd)
          // because getAbout relies on kb.fromNT, which does not deal with
          // the 'Collection' termType. This termType is ambiguous anyway.
          choiceTerm.termType = 'Collection'
          var choices = kb.each(choiceTerm, UI.ns.link('element'))
          for (let i = 0; i < choices.length; i++) {
            addMenuItem(choices[i])
          }
          break
        default:
          tr = table.appendChild(myDocument.createElement('tr'))
          tr.className = 'no-suggest'
          th = tr.appendChild(myDocument.createElement('th'))
          th.appendChild(myDocument.createElement('div')).appendChild(
            myDocument.createTextNode(
              'No suggested choices. Try to type instead.'
            )
          )
          tr.appendChild(myDocument.createElement('td')).appendChild(
            myDocument.createTextNode('OK')
          )
          // var This = this
          tr.addEventListener('click', clearMenu, 'false')

          var nullFetcher = function () {}
          switch (inputQuery.constructor.name) {
            case 'Array':
              for (let i = 0; i < inputQuery.length; i++) {
                kb.query(
                  inputQuery[i],
                  addPredicateChoice(inputQuery[i]),
                  nullFetcher
                )
              }
              break
            case 'undefined':
              throw new Error('addPredicateChoice: query is not defined')
            // break
            default:
              kb.query(inputQuery, addPredicateChoice(inputQuery), nullFetcher)
          }
      }
    }, // funciton showMenu

    /* When a blank is filled. This happens even for blue-cross editing. */
    fillInRequest: function fillInRequest (type, selectedTd, inputTerm) {
      var tr = selectedTd.parentNode
      var stat
      var isInverse
      stat = tr.AJAR_statement
      isInverse = tr.AJAR_inverse

      var reqTerm = type === 'object' ? stat.object : stat.predicate
      var newStat
      var doNext = false

      // RDF Event

      var eventhandler
      if (kb.any(reqTerm, UI.ns.link('onfillin'))) {
        /*    2017 -- Not sure what is supposed to happen here -- timbl @@@@
        eventhandler = function(subject) {
          return kb.any(reqTerm, UI.ns.link('onfillin')).value)
        }
        */
      }

      if (type === 'predicate') {
        // ToDo: How to link two things with an inverse relationship
        const newTd = outline.outlinePredicateTD(inputTerm, tr, false, false)
        if (selectedTd.nextSibling.className !== 'undetermined') {
          var s = new UI.rdf.Statement(
            stat.subject,
            inputTerm,
            stat.object,
            stat.why
          )

          try {
            UI.store.updater.update([], [s], function (
              uri,
              success,
              errorBody
            ) {
              if (success) {
                newStat = kb.anyStatementMatching(
                  stat.subject,
                  inputTerm,
                  stat.object,
                  stat.why
                )
                tr.AJAR_statement = newStat
                newTd.className = newTd.className.replace(/ pendingedit/g, '')
              } else {
                // outline.UserInput.deleteTriple(newTd,true);
                // Warn the user that the write has failed.
                UI.log.warn(
                  'Failure occurs (#2) while inserting ' +
                    tr.AJAR_statement +
                    '\n\n' +
                    errorBody
                )
              }
            })
          } catch (e) {
            UI.log.error(e)
            // Warn the user that the write has failed.
            UI.log.warn(
              'Error when insert (#2) of statement ' + s + ':\n\t' + e
            )
            return
          }

          newTd.className += ' pendingedit'
          this.lastModified = null
        } else {
          this.formUndetStat(
            tr,
            stat.subject,
            inputTerm,
            stat.object,
            stat.why,
            false
          )
          outline.walk('right')
          doNext = true
        }
        outline.replaceTD(newTd, selectedTd)
        TempFormula.remove(stat)
      } else if (type === 'object') {
        // Object value has been edited
        const newTd = outline.outlineObjectTD(inputTerm)
        outline.replaceTD(newTd, selectedTd)
        if (
          !selectedTd.previousSibling ||
          selectedTd.previousSibling.className !== 'undetermined'
        ) {
          let s
          if (!isInverse) {
            s = new UI.rdf.Statement(
              stat.subject,
              stat.predicate,
              inputTerm,
              stat.why
            )
          } else {
            s = new UI.rdf.Statement(
              inputTerm,
              stat.predicate,
              stat.object,
              stat.why
            )
          }

          try {
            UI.store.updater.update([], [s], function (
              uri,
              success,
              _errorBody
            ) {
              UI.log.info(
                '@@ usinput.js (object) callback ok=' +
                  success +
                  ' for statement:' +
                  s +
                  '\n '
              )
              var newStats
              if (success) {
                newTd.className = newTd.className.replace(/ pendingedit/g, '') // User feedback
                if (!isInverse) {
                  newStats = kb.statementsMatching(
                    stat.subject,
                    stat.predicate,
                    inputTerm,
                    stat.why
                  )
                } else {
                  newStats = kb.statementsMatching(
                    inputTerm,
                    stat.predicate,
                    stat.object,
                    stat.why
                  )
                }
                if (!newStats.length) {
                  UI.log.error("userinput.js 1711: Can't find statememt!")
                }
                tr.AJAR_statement = newStats[0]
              } else {
                UI.log.warn(
                  'userinput.js (object): Fail trying to insert statement ' + s
                )
                // outline.UserInput.deleteTriple(newTd,true);
              }
            })
          } catch (e) {
            // outline.UserInput.deleteTriple(newTd,true);
            UI.log.error(
              'userinput.js (object): exception trying to insert statement ' +
                s +
                ': ' +
                UI.utils.stackString(e)
            )
            UI.log.warn('Error trying to insert statement ' + s + ':\n' + e)
            return
          }

          this.lastModified = null
          newTd.className += ' pendingedit'
        } else {
          // ?this.formUndetStat(tr...)
          outline.walk('left')
          doNext = true
        }
        // removal of the undetermined statement
        TempFormula.remove(stat)
      }
      // do not throw away user's work even update fails
      UserInputFormula.statements.push(newStat)
      if (eventhandler) eventhandler(stat.subject)
      if (doNext) {
        this.startFillInText(outline.getSelection()[0])
      } else {
        return true
      } // can clearMenu
    },

    formUndetStat: function formUndetStat (
      trNode,
      subject,
      predicate,
      object,
      why,
      inverse
    ) {
      trNode.AJAR_inverse = inverse
      trNode.AJAR_statement = TempFormula.add(subject, predicate, object, why)
      return trNode.AJAR_statement
    }
  }
}
