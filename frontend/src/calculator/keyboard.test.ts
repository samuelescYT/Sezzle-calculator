import { describe, expect, it } from 'vitest'
import { keyToAction } from './keyboard'

describe('keyToAction', () => {
  it.each(['0', '5', '9'])('maps digit %s', (key) => {
    expect(keyToAction(key)).toEqual({ type: 'digit', digit: key })
  })

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
  ])('maps %s to the %s operator', (key, operator) => {
    expect(keyToAction(key)).toEqual({ type: 'operator', operator })
  })

  it.each([
    ['.', 'decimal'],
    ['%', 'percent'],
    ['=', 'equals'],
    ['Enter', 'equals'],
    ['Backspace', 'backspace'],
    ['Escape', 'clear'],
    ['Delete', 'clear'],
  ])('maps %s to %s', (key, type) => {
    expect(keyToAction(key)).toEqual({ type })
  })

  it.each(['a', 'x', ' ', 'Tab', 'Shift', 'F5', '12'])('ignores %j', (key) => {
    expect(keyToAction(key)).toBeNull()
  })
})
