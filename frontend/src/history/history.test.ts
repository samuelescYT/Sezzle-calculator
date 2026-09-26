import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addEntry,
  browserStorage,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from './history'

const entry = (n: number): HistoryEntry => ({ expression: `${n} + 1 =`, result: n + 1 })

describe('addEntry', () => {
  it('appends the newest entry at the end', () => {
    expect(addEntry([entry(1)], entry(2))).toEqual([entry(1), entry(2)])
  })

  it('does not mutate the original history', () => {
    const history = [entry(1)]
    addEntry(history, entry(2))
    expect(history).toEqual([entry(1)])
  })

  it(`keeps only the last ${HISTORY_LIMIT} entries, dropping the oldest`, () => {
    const full = Array.from({ length: HISTORY_LIMIT }, (_, i) => entry(i))

    const next = addEntry(full, entry(99))

    expect(next).toHaveLength(HISTORY_LIMIT)
    expect(next[0]).toEqual(entry(1))
    expect(next.at(-1)).toEqual(entry(99))
  })
})

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the browser localStorage', () => {
    expect(browserStorage()).toBe(localStorage)
  })

  it('returns null when localStorage is blocked', () => {
    const spy = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(browserStorage()).toBeNull()
    spy.mockRestore()
  })

  it('round-trips the history', () => {
    saveHistory(localStorage, [entry(1), entry(2)])
    expect(loadHistory(localStorage)).toEqual([entry(1), entry(2)])
  })

  it('removes the key when the history is empty', () => {
    saveHistory(localStorage, [entry(1)])
    saveHistory(localStorage, [])
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull()
  })

  it('loads an empty history when nothing is saved', () => {
    expect(loadHistory(localStorage)).toEqual([])
  })

  it('loads an empty history without storage', () => {
    expect(loadHistory(null)).toEqual([])
    expect(() => saveHistory(null, [entry(1)])).not.toThrow()
  })

  it.each([
    ['invalid JSON', '{not json'],
    ['a non-array', '{"expression":"1 + 1 =","result":2}'],
  ])('ignores %s', (_, raw) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, raw)
    expect(loadHistory(localStorage)).toEqual([])
  })

  it('drops malformed entries', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([entry(1), null, { expression: 5, result: 1 }, { expression: 'x', result: 'y' }, entry(2)]),
    )
    expect(loadHistory(localStorage)).toEqual([entry(1), entry(2)])
  })

  it(`caps a tampered history at ${HISTORY_LIMIT} entries`, () => {
    const tooMany = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => entry(i))
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(tooMany))

    const loaded = loadHistory(localStorage)

    expect(loaded).toHaveLength(HISTORY_LIMIT)
    expect(loaded[0]).toEqual(entry(5))
  })

  it('keeps working when saving fails', () => {
    const storage = { setItem: vi.fn(() => { throw new DOMException('full', 'QuotaExceededError') }) } as unknown as Storage
    expect(() => saveHistory(storage, [entry(1)])).not.toThrow()
  })
})
