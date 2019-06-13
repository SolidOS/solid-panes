import * as React from 'react'
import $rdf, { NamedNode } from 'rdflib'
import vocab from 'solid-namespace'
import { TrustedApplication, Mode } from './model'

const ns = vocab($rdf)

type AddOrUpdate = (origin: string, modes: Mode[]) => Promise<void>
interface Props {
  apps: Array<Exclude<TrustedApplication, { subject: NamedNode}>>;
  onSaveApp: AddOrUpdate;
  onDeleteApp: (origin: string) => Promise<void>;
}

export const View: React.FC<Props> = (props) => {
  return (
    <>
      <p>Here you can manage the applications you trust.</p>,
      <table className="results">
        <thead>
          <tr>
            <th>Application URL</th>
            <th>Access modes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.apps.map((app) => (
            <ApplicationRow
              key={app.origin}
              app={app}
              onSave={props.onSaveApp}
              onDelete={props.onDeleteApp}
            />
          ))}
        </tbody>
      </table>
      <NewApplication onSave={props.onSaveApp}/>
      <h4>Notes</h4>
      <ol>
        <li>Trusted applications will get access to all resources that you have access to.</li>
        <li>You can limit which modes they have by default.</li>
        <li>They will not gain more access than you have.</li>
      </ol>
      <p>
        Application URLs must be valid URL.
        Examples are http://localhost:3000, https://trusted.app, and https://sub.trusted.app.
      </p>
    </>
  )
}

const ApplicationRow: React.FC<{
  app: TrustedApplication,
  onSave: AddOrUpdate,
  onDelete: (origin: string) => Promise<void>
}> = (props) => {
  const initialModes = {
    read: props.app.modes.indexOf('read') !== -1,
    append: props.app.modes.indexOf('append') !== -1,
    write: props.app.modes.indexOf('write') !== -1,
    control: props.app.modes.indexOf('control') !== -1
  }
  const [modes, setModes] = React.useState<{[ key: string]: boolean}>(initialModes)

  const setMode = (mode: Mode, checked: boolean) => {
    setModes({ ...modes, [mode]: checked })
  }
  const getCheckboxHandler = (mode: Mode) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => setMode(mode, event.target.checked)
  }

  const submitHandler = (event: React.FormEvent) => {
    event.preventDefault()

    const newModes = Object.keys(modes).filter(mode => modes[mode]) as Mode[]
    props.onSave(props.app.origin, newModes)
  }

  return (
    <tr>
      <td>
        <p>{props.app.origin}</p>
      </td>
      <td>
        <form onSubmit={submitHandler}>
          <div className="input-wrap">
            <label className="checkbox">
              <input
                type="checkbox"
                onChange={getCheckboxHandler('read')}
                checked={modes.read}
                name="read"
                id="read"
              />
              Read
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                onChange={getCheckboxHandler('append')}
                checked={modes.append}
                name="append"
                id="append"
              />
              Append
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                onChange={getCheckboxHandler('write')}
                checked={modes.write}
                name="write"
                id="write"
              />
              Write
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                onChange={getCheckboxHandler('control')}
                checked={modes.control}
                name="control"
                id="control"
              />
              Control
            </label>
          </div>
          <button type="submit">Save</button>
        </form>
      </td>
      <td>
        <button onClick={() => props.onDelete(props.app.origin)}>Delete</button>
      </td>
    </tr>
  )
}

const NewApplication: React.FC<{ onSave: AddOrUpdate }> = (props) => {
  const [origin, setOrigin] = React.useState()
  const [modes, setModes] = React.useState<{[ key: string]: boolean}>({
    read: false,
    append: false,
    write: false,
    control: false
  })

  const setMode = (mode: Mode, checked: boolean) => {
    setModes({ ...modes, [mode]: checked })
  }
  const getCheckboxHandler = (mode: Mode) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => setMode(mode, event.target.checked)
  }

  const submitHandler = (event: React.FormEvent) => {
    event.preventDefault()

    const newModes = Object.keys(modes).filter(mode => modes[mode]) as Mode[]
    props.onSave(origin, newModes)
  }

  return (
    <form onSubmit={submitHandler}>
      <div className="input-wrap">
        <label>App URL:</label>
        <input
          type="url"
          onChange={(e) => setOrigin(e.target.value)}
          name="origin"
          id="origin"
          placeholder="https://example.com"
        />
      </div>
      <div className="input-wrap">
        <label className="checkbox">
          <input
            type="checkbox"
            onChange={getCheckboxHandler('read')}
            name="read"
            id="read"
          />
          Read
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            onChange={getCheckboxHandler('append')}
            name="append"
            id="append"
          />
          Append
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            onChange={getCheckboxHandler('write')}
            name="write"
            id="write"
          />
          Write
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            onChange={getCheckboxHandler('control')}
            name="control"
            id="control"
          />
          Control
        </label>
      </div>
      <button type="submit">Add</button>
    </form>
  )
}
