// This was a student project to
// allow the user to chose favoite CC licence terms and have them highlighted

// tabulator.options becaome UI.licenseOptions
// Possible future alternative directoons: Store licence preferences in a solid preferences file

const licenseURI = [
  'http://creativecommons.org/licenses/by-nc-nd/3.0/',
  'http://creativecommons.org/licenses/by-nc-sa/3.0/',
  'http://creativecommons.org/licenses/by-nc/3.0/',
  'http://creativecommons.org/licenses/by-nd/3.0/',
  'http://creativecommons.org/licenses/by-sa/3.0/',
  'http://creativecommons.org/licenses/by/3.0/'
]

const names = ['BY-NC-ND', 'BY-NC-SA', 'BY-NC', 'BY-ND', 'BY-SA', 'BY']

const UI = require('solid-ui')
const kb = UI.store

module.exports = function licenseOptions () {
  this.options = {}
  this.references = []
  this.checkedLicenses = []

  this.openCheckBoxWindow = function () {
    this.this.display = window.open(
      ' ',
      'NewWin',
      'menubar=0,location=no,status=no,directories=no,toolbar=no,scrollbars=yes,height=200,width=200'
    )
  }
  let message = "<font face='arial' size='2'><form name ='checkboxes'>"
  const lics = this.checkedLicenses
  for (let kk = 0; kk < lics.length; kk++) {
    message +=
      "<input type='checkbox' name = 'n" +
      kk +
      "' onClick = 'tabulator.options.submit()'" + // @@ FIXME
      (lics[kk] ? 'CHECKED' : '') +
      ' />CC: ' +
      names[kk] +
      '<br />'
  }

  message +=
    "<br /> <a onclick='tabulator.options.selectAll()'>[Select All] </a>" // @@ FIXME
  message += "<a onclick='tabulator.options.deselectAll()'> [Deselect All]</a>" // @@ FIXME
  message += '</form></font>'

  this.display.document.write(message)

  this.display.document.close()

  let i
  for (i = 0; i < 6; i++) {
    this.references[i] = this.this.display.document.checkboxes.elements[i]
  }

  this.selectAll = function () {
    let i
    for (i = 0; i < 6; i++) {
      this.display.document.checkboxes.elements[i].checked = true
      this.references[i].checked = true
      this.checkedLicenses[i] = true
    }
  }

  this.deselectAll = function () {
    let i
    for (i = 0; i < 6; i++) {
      this.display.document.checkboxes.elements[i].checked = false
      this.references[i].checked = false
      this.checkedLicenses[i] = false
    }
  }

  this.submit = function () {
    // alert('this.submit: checked=' + this.references[0].checked)
    for (let i = 0; i < 6; i++) {
      this.checkedLicenses[i] = !!this.references[i].checked
    }
  }

  this.checkLicence = function checkLicense (statement) {
    const licenses = kb.each(
      statement.why,
      kb.sym('http://creativecommons.org/ns#license')
    )
    UI.log.info('licenses:' + statement.why + ': ' + licenses)
    for (let i = 0; i < licenses.length; i++) {
      for (let j = 0; j < this.checkedLicenses.length; j++) {
        if (this.checkedLicenses[j] && licenses[i].uri === licenseURI[j]) {
          return true
          // theClass += ' licOkay' // icon_expand
          // break
        }
      }
    }
    return false
  }
  return this
}

// ends
