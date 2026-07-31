import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '~/store/notification'

describe('notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('wraps plain strings as untranslated info messages', () => {
    const store = useNotificationStore()
    store.notifySuccess('hello')

    expect(store.messages[0]).toMatchObject({
      type: 'success',
      text: 'hello',
      vars: {},
      translate: false,
    })
  })

  it('defaults translate to true for option objects', () => {
    const store = useNotificationStore()
    store.notifyWarning({ text: 'oereb_service_204', vars: { EGRID: 'CH1' } })

    expect(store.messages[0]).toMatchObject({
      type: 'warning',
      text: 'oereb_service_204',
      vars: { EGRID: 'CH1' },
      translate: true,
    })
  })

  it('takes messages in fifo order', () => {
    const store = useNotificationStore()
    store.notifySuccess('first')
    store.notifyError('second')

    expect(store.takeFirstMessage()?.text).toBe('first')
    expect(store.takeFirstMessage()?.text).toBe('second')
    expect(store.takeFirstMessage()).toBeNull()
  })
})
