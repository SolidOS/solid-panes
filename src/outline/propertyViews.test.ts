/* eslint-env jest */
import { sym } from 'rdflib'
import propertyViews from './propertyViews'
import viewAsImage from './viewAsImage'

describe('property views', () => {
  it.each([
    'http://xmlns.com/foaf/0.1/depiction',
    'http://xmlns.com/foaf/0.1/img',
    'http://xmlns.com/foaf/0.1/thumbnail',
    'http://xmlns.com/foaf/0.1/logo',
    'http://schema.org/image'
  ])('renders %s as image', (property) => {
    const asImage = viewAsImage(document)
    const views = propertyViews(document)
    const view = views.defaults[property]
    const result = view(sym('https://pod.example/img.jpg'))
    expect(result).toBeInstanceOf(HTMLImageElement)
    expect(result).toHaveAttribute('src', 'https://pod.example/img.jpg')
  })

  it.each([
    'http://xmlns.com/foaf/0.1/mbox'
  ])('renders %s as anchor', (property) => {
    const asImage = viewAsImage(document)
    const views = propertyViews(document)
    const view = views.defaults[property]
    const result = view(sym('mailto:alice@mail.example'))
    expect(result).toBeInstanceOf(HTMLAnchorElement)
    expect(result).toHaveAttribute('href', 'mailto:alice@mail.example')
  })
})
