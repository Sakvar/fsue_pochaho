/**
 * Microsoft Clarity — записи сессий и тепловые карты.
 * Включается только при заданном `VITE_CLARITY_PROJECT_ID` (см. кабинет clarity.microsoft.com).
 */
export function initClarity(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim()
  if (!projectId) return
  if (document.querySelector(`script[src*="clarity.ms/tag/${projectId}"]`)) return

  type WindowWithClarity = Window & { clarity?: ClarityFn }
  const w = window as unknown as WindowWithClarity
  w.clarity =
    w.clarity ||
    function clarityStub(...args: unknown[]): void {
      const stub = w.clarity!
      stub.q = stub.q || []
      stub.q.push(args)
    }

  const t = document.createElement('script')
  t.async = true
  t.src = `https://www.clarity.ms/tag/${projectId}`

  const first = document.getElementsByTagName('script')[0]
  if (first?.parentNode) {
    first.parentNode.insertBefore(t, first)
  } else {
    document.head.appendChild(t)
  }
}

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] }
