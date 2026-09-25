import { useEffect, useReducer } from 'react'
import { calculate } from '../api/calculatorApi'
import { formatError } from '../calculator/format'
import { keyToAction } from '../calculator/keyboard'
import { activeOperator, calculatorReducer, displayValue, initialState } from '../calculator/reducer'

/**
 * Wires the pure calculator reducer to the outside world: it runs the API
 * call the reducer asks for and listens to the keyboard.
 */
export function useCalculator() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const { request } = state

  useEffect(() => {
    if (!request) return

    const controller = new AbortController()
    calculate(request.operation, request.a, request.b, controller.signal).then(
      (result) => dispatch({ type: 'requestSucceeded', id: request.id, result }),
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
    expression: state.expression,
    display: displayValue(state),
    isError: state.error !== null,
    isBusy: request !== null,
    activeOperator: activeOperator(state),
  }
}
