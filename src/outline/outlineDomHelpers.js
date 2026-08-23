import { uri } from 'rdflib'
import { utils } from 'solid-ui'

export function createOutlineDomHelpers ({
  dom,
  UI,
  kb,
  outlineIcons,
  expandMouseDownListener,
  selectableTDClickListener,
  setSelected,
  viewAsBoringDefault,
  removeNodeIconMouseDownListener
}) {
  // old name: appendRemoveIcon
  // Used by outlineCollapse when a row in the main OutlineView is collapsed back
  // to a summary object and needs to keep the remove/delete affordance on that
  // outline row.
  function appendRemoveIcon (node, subject, removeNode) {
    const image = utils.AJARImage(
      outlineIcons.src.icon_remove_node,
      'remove',
      undefined,
      dom
    )
    image.addEventListener('click', removeNodeIconMouseDownListener)
    image.node = removeNode
    image.setAttribute('about', subject.toNT())
    image.style.marginLeft = '5px'
    image.style.marginRight = '10px'
    node.appendChild(image)
    return image
  }

  const termWidget = {}
  globalThis.termWidget = termWidget

  termWidget.construct = function (domArg) {
    domArg = domArg || document
    const iconContainer = domArg.createElement('div')
    iconContainer.setAttribute(
      'style',
      'margin: 0.2em; border: none; padding: 0; vertical-align: top;'
    )
    iconContainer.setAttribute('class', 'iconTD')
    iconContainer.setAttribute('notSelectable', 'true')
    iconContainer.style.width = '0px'
    return iconContainer
  }

  termWidget.addIcon = function (iconHost, icon, listener) {
    const iconTD = iconHost.childNodes[1]
    if (!iconTD) return
    let width = iconTD.style.width
    const img = utils.AJARImage(icon.src, icon.alt, icon.tooltip, dom)
    width = parseInt(width)
    width = width + icon.width
    iconTD.style.width = width + 'px'
    iconTD.appendChild(img)
    if (listener) {
      img.addEventListener('click', listener)
    }
  }

  termWidget.removeIcon = function (iconHost, icon) {
    const iconTD = iconHost.childNodes[1]
    let baseURI
    if (!iconTD) return
    let width = iconTD.style.width
    width = parseInt(width)
    width = width - icon.width
    iconTD.style.width = width + 'px'
    for (let x = 0; x < iconTD.childNodes.length; x++) {
      const elt = iconTD.childNodes[x]
      const eltSrc = elt.src

      try {
        baseURI = dom.location.href.split('?')[0]
      } catch (e) {
        baseURI = ''
      }
      const relativeIconSrc = uri.join(icon.src, baseURI)
      if (eltSrc === relativeIconSrc) {
        iconTD.removeChild(elt)
      }
    }
  }

  termWidget.replaceIcon = function (iconHost, oldIcon, newIcon, listener) {
    termWidget.removeIcon(iconHost, oldIcon)
    termWidget.addIcon(iconHost, newIcon, listener)
  }

  // old name: outlineObjectTD
  function outlineObjectDiv (
    obj,
    view,
    deleteNode,
    statement
  ) {
    const objectDiv = dom.createElement('div')
    objectDiv.classList.add('obj')
    objectDiv.setAttribute('notSelectable', 'false')
    objectDiv.setAttribute('role', 'option')
    objectDiv.setAttribute('tabindex', '0')
    objectDiv.setAttribute('data-outline-node', 'object')
    if (!obj) {
      objectDiv.textContent = 'No object available.'
      return objectDiv
    }
    const theClass = 'obj'

    if (
      obj.termType === 'NamedNode' ||
      obj.termType === 'BlankNode' ||
      (obj.termType === 'Literal' &&
        obj.value.slice &&
        (obj.value.slice(0, 6) === 'ftp://' ||
          obj.value.slice(0, 8) === 'https://' ||
          obj.value.slice(0, 7) === 'http://'))
    ) {
      objectDiv.setAttribute('about', obj.toNT())
      objectDiv.appendChild(
        UI.utils.AJARImage(
          UI.icons.originalIconBase + 'tbl-expand-trans.png',
          'expand',
          undefined,
          dom
        )
      ).addEventListener('click', expandMouseDownListener)
    }
    objectDiv.setAttribute('class', theClass)
    if (kb.whether(obj, UI.ns.rdf('type'), UI.ns.link('Request'))) {
      objectDiv.className = 'undetermined'
    }

    if (!view) {
      view = viewAsBoringDefault
    }
    objectDiv.appendChild(view(obj))
    if (deleteNode) {
      appendRemoveIcon(objectDiv, obj, deleteNode)
    }

    objectDiv.tabulatorSelect = function () {
      setSelected(this, true)
    }
    objectDiv.tabulatorDeselect = function () {
      setSelected(this, false)
    }

    objectDiv.addEventListener('click', selectableTDClickListener)
    return objectDiv
  }

  // old name: outlinePredicateTD
  function outlinePredicateDiv (
    predicate,
    newTr,
    inverse,
    internal
  ) {
    const predicateTD = dom.createElement('div')
    predicateTD.setAttribute('about', predicate.toNT())
    predicateTD.setAttribute('class', internal ? 'pred internal' : 'pred')
    predicateTD.setAttribute('role', 'row')
    predicateTD.setAttribute('data-outline-node', 'predicate')

    let lab
    switch (predicate.termType) {
      case 'BlankNode':
        predicateTD.className = 'undetermined'
        break
      case 'NamedNode':
        lab = UI.utils.predicateLabelForXML(predicate, inverse)
        break
      case 'Collection':
        lab = UI.utils.predicateLabelForXML(predicate.elements[0], inverse)
    }
    lab = lab ? lab.slice(0, 1).toUpperCase() + lab.slice(1) : '...'

    const labelTD = dom.createElement('div')
    labelTD.classList.add('labelTD')
    labelTD.setAttribute('notSelectable', 'true')
    labelTD.appendChild(dom.createTextNode(lab))
    predicateTD.appendChild(labelTD)
    labelTD.style.width = '100%'
    predicateTD.appendChild(termWidget.construct(dom))
    for (const w in outlineIcons.termWidgets) {
      if (!newTr || !newTr.AJAR_statement) break
      if (
        outlineIcons.termWidgets[w].filter &&
        outlineIcons.termWidgets[w].filter(
          newTr.AJAR_statement,
          'pred',
          inverse
        )
      ) {
        termWidget.addIcon(predicateTD, outlineIcons.termWidgets[w])
      }
    }

    predicateTD.tabulatorSelect = function () {
      setSelected(this, true)
    }
    predicateTD.tabulatorDeselect = function () {
      setSelected(this, false)
    }
    predicateTD.addEventListener('click', selectableTDClickListener)
    return predicateTD
  }

  return {
    appendRemoveIcon,
    outlineObjectDiv,
    outlinePredicateDiv,
    termWidget
  }
}