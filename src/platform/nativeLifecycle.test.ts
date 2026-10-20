import { expect, it } from 'vitest'
import { cancelActiveInference, handleAndroidBack, registerActiveInference } from './nativeLifecycle'

it('cancels every active request on background and records terminal cancellation', async () => {
  const first = new AbortController()
  const second = new AbortController()
  const terminal: string[] = []
  const unregister = registerActiveInference(first, async () => { terminal.push('first:cancelled') })
  registerActiveInference(second, async () => { terminal.push('second:cancelled') })
  await cancelActiveInference()
  expect(first.signal.aborted).toBe(true)
  expect(second.signal.aborted).toBe(true)
  expect(terminal).toEqual(['first:cancelled', 'second:cancelled'])
  unregister()
  await cancelActiveInference()
  expect(terminal).toHaveLength(2)
})

it('unregistered finished requests are untouched by a background event', async () => {
  const controller = new AbortController()
  registerActiveInference(controller, async () => { throw new Error('finished request must not cancel') })()
  await cancelActiveInference()
  expect(controller.signal.aborted).toBe(false)
})

it('handles Back in palette, sidebar, overlay, history, then native root order', async () => {
  const visible = ['palette', 'sidebar', 'overlay']
  const actions: string[] = []
  const close = (name: string) => () => {
    if (visible[0] !== name) return false
    visible.shift(); actions.push(name); return true
  }
  const handlers = {
    closePalette: close('palette'), closeSidebar: close('sidebar'), dismissOverlay: close('overlay'),
    goBack: () => { actions.push('history') }, exitRoot: async () => { actions.push('root') },
  }
  for (let index = 0; index < 4; index += 1) await handleAndroidBack(true, handlers)
  await handleAndroidBack(false, handlers)
  expect(actions).toEqual(['palette', 'sidebar', 'overlay', 'history', 'root'])
})
