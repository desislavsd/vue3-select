import {
  MaybeRef,
  Item,
  WithoutFirstParameter,
  MaybeArray,
  Not,
  SelectService,
  Fn,
} from '@/types'
import {
  reactive,
  unref,
  ref,
  watch,
  computed,
  onMounted,
  toRef,
  getCurrentInstance,
  watchEffect,
  PropType,
  Ref,
  ExtractPropTypes,
} from 'vue'
import { debounce, defineHook, toPath, get, craw } from '@/utils'

type FilterProp = boolean | string | string[] | typeof defaultFilter

const uiProps = {
  id: {
    type: String,
  },
  placeholder: {
    default: 'Search...',
  },
  debounce: {
    type: [Boolean, Number],
    default: undefined,
  },
  defaultDebounce: {
    default: 500,
  },
  /**
   * Makes phrase reflect highlighted item
   */
  typeahead: {
    type: [Boolean],
    default: undefined,
  },
  filter: {
    type: [Boolean, String, Function, Array] as PropType<FilterProp>,
    default: undefined,
  },
  filterBy: {} as PropType<Not<FilterProp, boolean>>,
  tagging: [Boolean, String, Array] as PropType<boolean | MaybeArray<string>>,
  tagOn: {
    type: [String, Array] as PropType<MaybeArray<string>>,
    default: 'Enter,Tab, ,',
  },
  mode: {
    type: String as PropType<'skip' | 'append' | 'toggle'>,
    default: 'skip',
  },
  /**
   * Function that returns true for options that should be disabled
   */
  // disable: {
  //   type: Function as PropType<(this: SelectService, item: Item) => boolean>,
  // },
}

// TODO:
// or clearOn: select/blur/escape
// or closeOn: select/blur/escape
// resolve
// useQuery
// virtual scroll
// pagination
const definition = defineHook(
  uiProps,
  function (props, ctx, { phrase, src, model, service }) {
    const vm = getCurrentInstance()
    const id = computed(
      () => props.id || `v3s-${vm?.uid || Math.random().toString(32).slice(2)}`
    )
    const el = ref<HTMLElement | null>(null)

    const flags = reactive({
      active: false,
      opened: false,
      valid: false,
    })

    const debouncePhrase = useDebouncePhrase()

    const items = useUIItems(props, service, debouncePhrase)

    const { pointer } = items

    const inputValue = useTypeAheadPhrase()

    onMounted(detectValid)

    function onFocusin(ev: FocusEvent) {
      flags.active = true
      // open()
      focus()
      !src.data && !src.busy && src.refresh()
    }

    function onFocusout(ev: FocusEvent & { relatedTarget: HTMLElement }) {
      // do nothing if focus is still within the the root element
      if (el.value?.matches(':focus-within')) return
      phrase.value = ''
      flags.active = false
      close()
    }

    function select(...args: Item[][]) {
      items.select(...args)
      model.isMultiple || close()
      phrase.value = ''
    }

    function open() {
      if (flags.opened) return
      flags.opened = true
    }

    function close() {
      if (!flags.opened) return
      flags.opened = false
      pointer.index = -1
    }

    function focus() {
      el.value?.querySelector('input')?.focus()
    }

    function blur() {
      const focused: HTMLElement | null =
        el.value?.querySelector(':focus') || el.value
      focused?.blur()
    }

    function onKeydown(ev: KeyboardEvent) {
      const willTag =
        ev.key != 'Enter' &&
        items.flags.tagging &&
        unref(phrase).length &&
        items.flags.tagOn.includes(ev.key)

      const handlers = {
        Escape() {
          if (!flags.opened) return blur()
          // if (~pointer.index) return (pointer.index = -1)
          close()
        },
        Enter() {
          select()
        },
        ArrowDown() {
          ev.preventDefault()
          pointer.next(ev.metaKey ? Infinity : false)
        },
        ArrowUp() {
          ev.preventDefault()
          pointer.next(ev.metaKey ? 0 : true)
        },
        Backspace() {
          // typeahead
          // if (pointer.item && !pointer.item.new) {
          //   return (phrase.value = (pointer.item.label as string)
          //     .toString()
          //     .slice(0, ev.metaKey ? 0 : -1))
          // }
          if (unref(phrase).length) return
          ev.metaKey ? model.clear() : model.pop()
        },
        default() {
          if (willTag) return

          // typeahead
          // if (pointer.item) phrase.value = pointer.item.label as string
        },
      }

      if (ev.key != 'Escape') open()
      ;(handlers[ev.key as keyof typeof handlers] || handlers.default)?.()

      if (willTag) {
        ev.preventDefault()
        select()
      }
    }

    function detectValid() {
      return (flags.valid = !!el.value
        ?.querySelector('input')
        ?.matches(':valid'))
    }

    /**
     * Creates proxy to phrase with typeahead support,
     * i.e. its value is the label of the pointed item
     * and fallbacks to the value of the original phrase
     */
    function useTypeAheadPhrase() {
      const value = debouncePhrase

      // proxy to the local phrase value that
      const proxy = computed({
        get() {
          if (!props.typeahead) return unref(value)

          return ((flags.opened && !pointer.item?.new && pointer.item?.label) ||
            unref(value)) as string
        },
        set(v: string) {
          value.value = v
        },
      })

      return proxy
    }

    /**
     * Creates local proxy for the phrase with realtime sync down
     * but debounced sync up to the original phrase, since
     * binding phrase directly to input in combination with
     * debounced updates results in wrong phrase update
     * when component RErenders because of something else (i.e async search results)
     */
    function useDebouncePhrase() {
      // local phrase value
      const value = ref('')

      const debouncedSyncUp = computed(() => {
        if (!src.async && !props.debounce) return syncUp

        const t =
          typeof props.debounce == 'number'
            ? props.debounce
            : props.defaultDebounce

        return debounce(t, syncUp)
      })

      // update local value whenever global phrase changes
      watchEffect(syncDown)

      // add potentially debounced watcher to update
      // global phrase with the local one
      watch(value, unref(debouncedSyncUp))

      function syncDown() {
        value.value = phrase.value
      }

      function syncUp() {
        phrase.value = value.value.trim()
      }

      return value
    }

    return reactive({
      flags,
      pointer,
      items: toRef(items, 'value'),
      attrs: {
        root: {
          id,
          onFocusin,
          onFocusout,
          onKeydown,
          tabindex: -1,
          ref(e: any) {
            el.value = e
          },
          onClick: () => open(),
        },
        input: {
          placeholder: toRef(props, 'placeholder'),
          value: inputValue,
          onInput: (ev: { target: HTMLInputElement }) =>
            (inputValue.value = ev.target.value),
        },
        option(option: Item) {
          return {
            onClick: (ev: Event) => {
              ev.stopPropagation()
              select([option])
            },
          }
        },
      },
      select,
      open,
      close,
      blur,
      focus,
      detectValid,
    })
  }
)

export default definition

/**
 * Returns items for the UI by taking in consideration:
 * tagging, clientside filtering, src actuality etc..
 */
function useUIItems(
  props: ExtractPropTypes<typeof uiProps>,
  { phrase, items: parsedItems, src, model, item }: SelectService,
  inputValue: Ref<string>
) {
  // Because of the phrase debounce, the value of the input may
  // be different from the phrase corresponding to the current src response;
  // in which case the response shold be discarded and the items should be an empty array
  const items = computed(() =>
    unref(phrase) == unref(inputValue) ? unref(parsedItems) : []
  )

  const tagging = computed(() => !!unref(props.tagging))

  const flags = reactive({
    tagging,
    tagOn: computed(
      () =>
        (
          [props.tagging, props.tagOn]
            .map(unref)
            .map((e) =>
              typeof e == 'string' ? e.split(/,/).map((e) => e || ',') : e
            )
            .find((e) => Array.isArray(e)) as undefined | string[]
        )?.filter(Boolean) || []
    ),
    mode: toRef(props, 'mode'),
  })

  const filter = computed(() => {
    if (!props.filter)
      if (src.dynamic)
        // auto decide if filter should be applied
        // dynamic items are filtered serverside
        return false

    return normalizeFilter(props.filter)
  })

  const moded = computed(() => {
    return flags.mode == 'skip'
      ? unref(items).filter((e) => !model.value.some((s) => s.equals(e)))
      : unref(items)
  })

  const filtered = computed(() => {
    if (!unref(phrase) || !unref(filter)) return unref(moded)

    return unref(moded).filter((item) =>
      (unref(filter) as Fn<boolean>)(item, unref(phrase))
    )
  })

  const tags = computed(() => {
    // TODO: add check if tagging is enabled
    if (!props.tagging || !src.data || !unref(phrase)) return []

    const tag = unref(item).ofPhrase(unref(phrase))

    if (unref(filtered).some((e) => e.matches(tag))) return []

    return [tag]
  })

  const value = computed(() => unref(tags).concat(unref(filtered)))

  const pointer = usePointer(value)

  function select(items = [pointer.item].filter(Boolean)) {
    if (!items.length) return

    model.isMultiple
      ? props.mode == 'append'
        ? model.append(items)
        : model.toggle(items)
      : model.append(items)
  }

  return reactive({
    value,
    flags,
    pointer,
    select,
  })
}

function usePointer(items: MaybeRef<Item[]>) {
  const _index = ref(-1)

  const index = computed({
    get() {
      return unref(_index)
    },
    set(value: number) {
      const { min, max } = Math
      const last = unref(items).length - 1
      _index.value = max(min(last, value), -1)
    },
  })

  const item = computed(() => unref(items)[unref(index)])

  function next(prev?: boolean | number) {
    const { min, max } = Math

    const last = unref(items).length - 1

    if (typeof prev == 'undefined') prev = false

    if (typeof prev == 'boolean') prev = unref(index) + (prev ? -1 : 1)

    index.value = prev
  }

  watch(items, (items) => (index.value = unref(items)[0]?.new ? 0 : -1))

  return reactive({
    index,
    item,
    next,
  })
}

function normalizeFilter(filter?: FilterProp) {
  if (typeof filter == 'function') return filter

  if (typeof filter == 'string') filter = filter.split(/[^\w.*]+/g)

  if (Array.isArray(filter))
    return filterByProps.bind(
      null,
      filter.filter(Boolean).map((path) => `raw.${path}`)
    )

  return filterByProps.bind(null, ['label'])
}

function filterByProps(props: string[], item: Item, phrase: string) {
  phrase = phrase.toLowerCase()

  return props
    .map(toPath)
    .map((path: string[]) => {
      const prefix = path.slice(0, -1)
      const sufix = path.at(-1) || ''

      if (['*', '**'].includes(sufix))
        return craw(get(prefix, item), sufix == '**').map((e) =>
          prefix.concat(e)
        )

      const target = get(path, item)

      if (typeof target == 'object')
        return craw(target).map((e) => path.concat(e))

      return [path]
    })
    .flat()
    .some((path) => get(path, item)?.toString().toLowerCase().includes(phrase))
}

function defaultFilter(...args: WithoutFirstParameter<typeof filterByProps>) {
  return filterByProps(['label'], ...args)
}
