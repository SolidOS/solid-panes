import { NamedNode } from 'rdflib'
import S, { DataSignal } from 's-js'
import solidUi from 'solid-ui'

const { ns } = solidUi

export class TrustedApplication {
  public isNew: boolean
  public subject: DataSignal<string>
  public origin: DataSignal<string>
  public modes: Mode[]

  private constructor (_subject: string, _origin: string, _modes: string[]) {
    this.subject = S.value(_subject)
    this.isNew = !_origin
    this.origin = S.value(_origin)
    this.modes = ['Read', 'Write', 'Append', 'Control'].map(mode => ({
      name: mode,
      value: ns.acl(mode),
      isChecked: S.value(_modes.some(appMode => appMode === ns.acl(mode).value))
    }))
  }

  static createNew (_subject: NamedNode): TrustedApplication {
    return new TrustedApplication(_subject.value, '', [ns.acl('Read').value])
  }

  static fromNamedNodes (_subject: NamedNode, _origin: NamedNode | null, _modes: NamedNode[]): TrustedApplication {
    return new TrustedApplication(_subject.value, _origin ? _origin.value : '', _modes.map(mode => mode.value))
  }

  static copy (app: TrustedApplication): TrustedApplication {
    const modes = app.modes.filter(mode => mode.isChecked()).map(mode => ns.acl(mode.name).value)
    return new TrustedApplication(app.subject(), app.origin(), modes)
  }
}

type Mode = {
  name: string
  value: string
  isChecked: DataSignal<boolean>
}
