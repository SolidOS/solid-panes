import { ns } from 'solid-ui'
import viewAsImage from './viewAsImage'
import viewAsMbox from './viewAsMbox'

/** some builtin simple views **/

export default (dom) => {
  // view that applies to items that are objects of certain properties.
  const views = {
    properties: [],
    defaults: [],
    classes: []
  } // views

  const asImage = viewAsImage(dom)
  const asMbox = viewAsMbox(dom)

  viewsAddPropertyView(views, ns.foaf('depiction').uri, asImage, true)
  viewsAddPropertyView(views, ns.foaf('img').uri, asImage, true)
  viewsAddPropertyView(views, ns.foaf('thumbnail').uri, asImage, true)
  viewsAddPropertyView(views, ns.foaf('logo').uri, asImage, true)
  viewsAddPropertyView(views, ns.schema('image').uri, asImage, true)
  viewsAddPropertyView(views, ns.foaf('mbox').uri, asMbox, true)
  return views
}

/** add a property view function **/
function viewsAddPropertyView (views, property, pviewfunc, isDefault) {
  if (!views.properties[property]) {
    views.properties[property] = []
  }
  views.properties[property].push(pviewfunc)
  if (isDefault) {
    // will override an existing default!
    views.defaults[property] = pviewfunc
  }
} // addPropertyView
