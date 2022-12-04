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

  // const load = computed(() => () => unref(src)(unref(phrase)))

  const state = reactive({
    async,
    dynamic,
    ...toRefs(useAsyncData(src, { enabled: !unref(async) })),
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
