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
// disabled, readonly & srcEnabled
const definition = defineHook(
  uiProps,
  function (
    props,
    ctx,
    { phrase, src, items, pointer, debouncePhrase, model, service }
  ) {
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
