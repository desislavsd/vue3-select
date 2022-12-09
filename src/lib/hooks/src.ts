import { computed, toRefs, watch, unref, reactive } from 'vue'
import { fetch_ } from '../utils'
import { useAsyncData } from '../capi'

type SrcType = string | any[] | ((...args: any[]) => any)

export default function useSrc(props, context, { accessors, phrase }) {
  const async = computed(() => isSrcAsync(props.src))

  const dynamic = computed(() => isSrcDynamic(props.src))

  const src = computed(() => {
    const { src, fetcher } = props

    if (typeof src == 'function') return src

    if (typeof src != 'string') return () => src || []

    return fetcher.bind(null, src)
  })

  // load fn is changed on each src change
  const load = computed(() => {
    const cb = unref(src)
    return (key) => cb(unref(key)[0] || '')
  })

  const key = computed(() => (unref(dynamic) ? [unref(phrase)] : []))

  // TODO: enabled should depend on more stuff ( focused, valid, not disabled/readonly)
  const opts = computed(() => ({ enabled: true || !unref(async) }))

  const state = reactive({
    async,
    dynamic,
    ...toRefs(useAsyncData(key, load, opts)),
  })

  return state
}

export const props = {
  src: {},
  fetcher: {
    default: () => fetcher,
  },
}

// check weather options depend on the query
// i.e. returns true for paginated results
function isSrcDynamic(src: any) {
  if (!isSrcAsync(src)) return false
  if (src.includes?.('%s')) return true
  return typeof src == 'function' && src.length > 0
}

// src is considered async if not provided
// as static array of options
function isSrcAsync(src: any) {
  return !!src && !Array.isArray(src)
}

function fetcher(url: string, phrase = '') {
  url = url.replace('%s', phrase)

  return fetch_(url)
}
