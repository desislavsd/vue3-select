import { reactive, provide, inject, unref, Ref } from 'vue'
import { MaybeRef } from './types'

export function useAsyncData(
  cb: MaybeRef<(...any: any) => any>,
  opts: { enabled: boolean }
) {
  const defaults = {
    data: null,
    error: null,
    busy: false,
    fetched: false,
    stale: true,
    key: null,
  }

  const state = reactive({ ...defaults, refresh })

  function refresh(...args: any) {
    let key = Math.random()
    Object.assign(state, defaults, { busy: true, key })
    Promise.resolve(unref(cb)(...args))
      .then(
        (data) =>
          key == state.key && Object.assign(state, { data, stale: false })
      )
      .catch((error) => key == state.key && (state.error = error))
      .finally(
        () =>
          key == state.key &&
          Object.assign(state, { fetched: true, busy: false })
      )
  }

  watch(cb, () => refresh(), { immediate: opts.enabled })

  return state
}
