import {
  reactive,
  ref,
  provide,
  inject,
  unref,
  computed,
  watch,
  Ref,
} from 'vue'
import { MaybeRef } from '@/types'
import { reactiveComputed } from '@vueuse/core'

const defaults = { enabled: true }

export function useAsyncData(
  key: MaybeRef<unknown[]>,
  cb: MaybeRef<(...any: any) => any>,
  opts: MaybeRef<typeof defaults>
) {
  const defaults = {
    data: null,
    error: null,
    busy: false,
    fetched: false,
    stale: true,
    id: '',
  }

  const state = ref({ ...defaults })

  function refresh() {
    // if (!unref(opts)?.enabled) return
    state.value = {
      ...defaults,
      id: JSON.stringify(unref(key).map(unref)),
      busy: true,
    }
    const localState = state.value

    Promise.resolve(unref(cb)(unref(key)))
      .then((data) => Object.assign(localState, { data, stale: false }))
      .catch((error) => (localState.error = error))
      .finally(() => Object.assign(localState, { fetched: true, busy: false }))
  }

  watch([cb, key, opts], refresh, {
    immediate: true,
    deep: true,
  })

  const expo = reactiveComputed(() => ({ ...state.value, refresh }))

  return expo
}
