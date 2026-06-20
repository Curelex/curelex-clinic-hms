import { useState, useCallback, useEffect } from 'react'

let toastFn = null

export function useToast() {
  const show = useCallback((message, type = 'info') => {
    if (toastFn) toastFn(message, type)
  }, [])
  return show
}

export function Toast() {
  const [state, setState] = useState({ visible: false, message: '', type: 'info' })

  useEffect(() => {
    toastFn = (message, type) => {
      setState({ visible: true, message, type })
      setTimeout(() => setState(s => ({ ...s, visible: false })), 3000)
    }
    return () => { toastFn = null }
  }, [])

  return (
    <div className={`toast ${state.visible ? 'active' : ''} ${state.type}`}>
      <div className="toast-content">
        <i className="fas fa-bell"></i>
        <span>{state.message}</span>
      </div>
    </div>
  )
}