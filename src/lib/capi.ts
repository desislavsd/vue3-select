import { ref, unref, computed, watch, Ref, toRefs, onScopeDispose } from 'vue'
import { Fn, MaybeRef, Pretty } from '@/types'
import { isset, mapObj } from '@/utils'

const defaults = { enabled: true }

// TODO: do not use reactiveComputed
export function useAsyncData(
  key: MaybeRef<unknown[]>,
  fetcher: MaybeRef<(...any: any) => any>,
  opts: typeof defaults
) {
  const defaults = {
    data: null as unknown,
    error: null as unknown,
    busy: false,
    id: '',
  }

  const state = ref({ ...defaults })

  const id = computed(() => JSON.stringify(unref(key).map(unref)))

  function refresh() {
    let localState = state.value

    // check if same request is already pending
    if (localState.id == unref(id) && (localState.data || localState.busy))
      return

    // proceend only if enabled or cleanup is needed
    if (!localState.data && !localState.busy && !opts.enabled) return

    // direct assignment won't work as it doesnt return the reactive object
    /* localState = */ state.value = {
      ...defaults,
      id: unref(id),
      busy: opts.enabled,
    }

    localState = state.value

    Promise.resolve(opts.enabled ? unref(fetcher)(unref(key)) : null)
      .then((data) => Object.assign(localState, { data }))
      .catch((error) => (localState.error = error))
      .finally(() => Object.assign(localState, { busy: false }))
  }

  watch([id, opts], refresh, { immediate: true })

  return {
    data: computed(() => unref(state).data),
    error: computed(() => unref(state).error),
    busy: computed(() => unref(state).busy),
    refresh,
  }
}

export function useVModel<T extends object, K extends keyof T & string>(
  props: T,
  prop: K
) {
  const busy = useBusy()

  const updateKey = computed(() => `onUpdate:${prop?.toString()}` as keyof T)

  const propValue = computed(() => props[prop])

  const mustProxy = computed(() => !isset(props[unref(updateKey)]))

  const proxy = ref(unref(propValue)) as Ref<T[K]>

  const setters = computed(() =>
    [props[unref(updateKey)], (value: T[K]) => (proxy.value = value)]
      .flat()
      .filter(Boolean)
  )

  watch(propValue, (value) => (proxy.value = value))

  const model = computed({
    get() {
      return unref(mustProxy) ? unref(proxy) : unref(propValue)
    },
    set,
  })

  async function set(value: T[K], ...args: unknown[]) {
    if (unref(busy)) return

    return (busy.value = Promise.all(
      // @ts-ignore
      unref(setters).map((set) => set?.apply(this, arguments))
    ))
  }

  return {
    proxy: model,
    busy,
    set,
  }
}

export function useBusy() {
  const state = ref<undefined | Promise<unknown>>()

  return computed({
    get() {
      return Boolean(state.value)
    },
    async set(val: any) {
      await (state.value = val = Promise.allSettled([val]))

      if (state.value == val) state.value = undefined
    },
  })
}

export function useIntersectionObserver(
  options: Pretty<
    IntersectionObserverInit & {
      target?: HTMLElement | undefined
      callback: IntersectionObserverCallback
    }
  >
) {
  let observer: IntersectionObserver | undefined

  watch(Object.values(toRefs(options)), () => {
    observer?.disconnect()

    if (![options.target, options.root].every(Boolean)) return

    observer = new IntersectionObserver(options.callback, options)

    observer.observe(options.target as Element)
  })

  onScopeDispose(() => observer?.disconnect())
}
