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
import { isset, mapObj } from '@/utils'

const defaults = { enabled: true }

// TODO: do not use reactiveComputed
export function useAsyncData(
  key: MaybeRef<unknown[]>,
  fetcher: MaybeRef<(...any: any) => any>,
  opts: MaybeRef<typeof defaults>
) {
  const defaults = {
    data: null as unknown,
    error: null as unknown,
    busy: false,
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

    Promise.resolve(unref(fetcher)(unref(key)))
      .then((data) => Object.assign(localState, { data }))
      .catch((error) => (localState.error = error))
      .finally(() => Object.assign(localState, { busy: false }))
  }

  watch([fetcher, key, opts], refresh, {
    immediate: true,
    deep: true,
  })

  return reactive({
    ...(mapObj(defaults, (name) =>
      computed(() => unref(state)[name])
    ) as unknown as typeof defaults),
    refresh,
  })
}

type oo = {} extends object ? true : false

export function useVModel<T extends object, K extends keyof T & string>(
  props: T,
  prop: K,
  { defaultValue } = {
    defaultValue: undefined as T[K],
  }
) {
  const busy = useBusy()

  const updateKey = computed(() => `onUpdate:${prop?.toString()}` as keyof T)

  const propValue = computed(() => props[prop])

  const mustProxy = computed(() => !isset(props[unref(updateKey)]))

  const proxy = ref(unref(propValue) ?? defaultValue) as Ref<T[K]>

  watch(propValue, (value) => (proxy.value = value))

  const model = computed({
    get() {
      return unref(mustProxy) ? unref(proxy) : unref(propValue)
    },
    set,
  })

  async function set(value: T[K], ...args: unknown[]) {
    if (unref(busy)) return

    const promise = unref(mustProxy)
      ? (proxy.value = value)
      : // @ts-ignore
        props[unref(updateKey)]?.call?.(this, value, ...args)

    busy.value = promise

    return await promise
  }

  return {
    proxy: model,
    busy,
    set,
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
