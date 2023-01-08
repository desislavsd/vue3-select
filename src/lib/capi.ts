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
import { isset } from '@/utils'

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

export function useVModel<
  T extends { [key: string]: unknown },
  K extends keyof T & string,
  V extends T[K]
>(
  props: T,
  prop: K,
  { defaultValue } = {
    defaultValue: undefined as V,
  }
) {
  const updateKey = computed(() => `onUpdate:${prop?.toString()}`)

  const propValue = computed(() => unref(props[prop]))

  const mustProxy = computed(() => !isset(props[unref(updateKey)]))

  const proxy = ref(unref(propValue) ?? defaultValue)

  watch(propValue, (value) => (proxy.value = value))

  const model = computed({
    get() {
      return unref(mustProxy) ? unref(proxy) : unref(propValue)
    },
    set(value) {
      unref(mustProxy)
        ? (proxy.value = value)
        : props[unref(updateKey)]?.(value)
    },
  })

  return model
}
