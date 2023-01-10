import {
  reactive,
  ref,
  provide,
  inject,
  unref,
  computed,
  watch,
  Ref,
  UnwrapRef,
} from 'vue'
import { MaybeRef } from '@/types'
import { reactiveComputed } from '@vueuse/core'
import { isset } from '@/utils'

const defaults = { enabled: true }

// TODO: do not use reactiveComputed
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
  T extends Record<string, unknown>,
  K extends keyof T & string
>(
  props: T,
  prop: K,
  { defaultValue } = {
    defaultValue: undefined as T[K],
  }
) {
  const busy = useBusy()

  const updateKey = computed(() => `onUpdate:${prop?.toString()}`)

  const propValue = computed(() => props[prop])

  const mustProxy = computed(() => !isset(props[unref(updateKey)]))

  const proxy = ref(unref(propValue) ?? defaultValue) as Ref<T[K]>

  watch(propValue, (value) => (proxy.value = value))

  const model = computed({
    get() {
      return unref(mustProxy) ? unref(proxy) : unref(propValue)
    },
    async set(value) {
      if (unref(busy)) return

      await (busy.value = unref(mustProxy)
        ? (proxy.value = value)
        : // @ts-ignore
          props[unref(updateKey)]?.call?.(null, value))
    },
  })

  return {
    proxy: model,
    busy,
  }
}

export function useBusy() {
  const state = ref<undefined | Promise<unknown>>()

  return computed<boolean>({
    get() {
      return Boolean(state.value)
    },
    async set(val: any) {
      await (state.value = val = Promise.allSettled([val]))

      if (state.value == val) state.value = undefined
    },
  })
}
