/* eslint-env jest */
import * as React from 'react'
import {
  render,
  fireEvent
} from '@testing-library/react'
import { View } from './view'
import { workaroundActError } from './actErrorWorkaround'

workaroundActError()

it('should properly render markdown', () => {
  const { container } = render(<View markdown='Some **awesome** markdown' onSave={jest.fn()}/>)

  expect(container).toMatchSnapshot()
})

describe('Edit mode', () => {
  it('should properly render the edit form', () => {
    const { container, getByRole } = render(<View markdown='Arbitrary markdown' onSave={jest.fn()}/>)

    const editButton = getByRole('button')
    editButton.click()

    expect(container).toMatchSnapshot()
  })

  it('should call the onSave handler after saving the new content', () => {
    const mockHandler = jest.fn().mockReturnValue(Promise.resolve())
    const { getByRole, getByDisplayValue } = render(<View markdown='Arbitrary markdown' onSave={mockHandler}/>)

    const editButton = getByRole('button')
    editButton.click()

    const textarea = getByDisplayValue('Arbitrary markdown')
    fireEvent.change(textarea, { target: { value: 'Some _other_ markdown' } })

    const renderButton = getByRole('button')
    renderButton.click()

    expect(mockHandler.mock.calls.length).toBe(1)
    expect(mockHandler.mock.calls[0][0]).toBe('Some _other_ markdown')
  })
})
