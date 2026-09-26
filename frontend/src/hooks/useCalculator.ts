import { useEffect, useEffectEvent, useReducer } from 'react'
import { calculate } from '../api/calculatorApi'
import { formatError } from '../calculator/format'
import { keyToAction } from '../calculator/keyboard'
import {
  activeOperator,
  calculatorReducer,
  displayValue,
  expressionLine,
  finalExpression,
  initialState,
} from '../calculator/reducer'
import type { HistoryEntry } from '../history/history'

interface UseCalculatorOptions {
  /** Called with every final result (from "=" or an auto-resolved %). */
  onCalculated?: (entry: HistoryEntry) => void
}

/**
 * Wires the pure calculator reducer to the outside world: it runs the API
 * call the reducer asks for and listens to the keyboard.
 */
export function useCalculator({ onCalculated }: UseCalculatorOptions = {}) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const { request } = state

  // Always sees the latest callback without re-running (and aborting) the request effect.
  const notifyCalculated = useEffectEvent((entry: HistoryEntry) => onCalculated?.(entry))

  useEffect(() => {
    if (!request) return

    const controller = new AbortController()
    calculate(request.operation, request.a, request.b, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        dispatch({ type: 'requestSucceeded', id: request.id, result })
        const expression = finalExpression(request)
        if (expression) notifyCalculated({ expression, result })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        dispatch({ type: 'requestFailed', id: request.id, message: formatError(error) })
      },
    )
    // Cancels the call if the request is cleared (AC) or the component unmounts.
    return () => controller.abort()
  }, [request])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const action = keyToAction(event.key)
      if (!action) return
      // Also stops Enter from clicking a focused key a second time.
      event.preventDefault()
      dispatch(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return {
    dispatch,
    expression: expressionLine(state),
    display: displayValue(state),
    isTyping: state.entryState === 'typing' && state.error === null,
    isError: state.error !== null,
    isBusy: request !== null,
    activeOperator: activeOperator(state),
  }
}
