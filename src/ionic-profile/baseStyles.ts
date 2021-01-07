// this could be exported from solid-ui

export const grid = (min = 360, max = 500, gap = 30) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, ${max}px))`,
  gridGap: `${gap}px`
})
export const card = (maxWidth = 632) => ({
  fontFamily: 'sans-serif',
  borderRadius: '4px',
  boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
  maxWidth: `${maxWidth}px`,
  padding: '0'
})
export const fullWidth = () => ({
  width: '100%'
})
export const p = (value) => ({
  padding: `${value * 0.25}rem`
})
export const my = (value) => ({
  marginTop: `${value * 0.25}rem`,
  marginBottom: `${value * 0.25}rem`
})
export const heading = () => ({
  margin: '0',
  ...textCenter(),
  fontSize: ' 1.25rem',
  lineHeight: '1.75rem',
  color: 'rgba(17, 24, 39, 1)',
  ...fontSemibold()
})
export const textCenter = () => ({
  textAlign: 'center'
})
export const textGray = () => ({
  color: 'rgb(92,92,94)'
})
export const fontSemibold = () => ({
  fontWeight: '600'
})
