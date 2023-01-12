import { MaybeRef, SelectService, Item } from '@/types'
import {
  reactive,
  unref,
  ref,
  watch,
  computed,
  InputHTMLAttributes,
  onMounted,
  toRef,
} from 'vue'
import { debounce, defineHook, isset } from '../utils'

// TODO
// or clearOn: select/blur/escape
// or closeOn: select/blur/escape
// tagOn: ,/ /Tab/Enter
// selection mode: append/toggle/skip(hide selected)
// resolve
// useQuery
// virtual scroll
// pagination
const definition = defineHook(
  {
    placeholder: {
      default: 'Search...',
    },
    debounce: {
      type: [Boolean, Number],
      default: undefined,
    },
    defaultDebounce: {
      default: 250,
    },
  },
  function (props, ctx, { phrase, src, items, model }) {
    const el = ref<HTMLElement | null>(null)

    const flags = reactive({
      active: false,
      opened: false,
      valid: false,
    })

    const pointer = usePointer(computed(() => items.value))

    function onFocusin(ev: FocusEvent) {
      flags.active = true
      open()
      focus()
      src.stale && !src.busy && src.refresh()
    }

    function onFocusout(ev: FocusEvent & { relatedTarget: HTMLElement }) {
      // do nothing if focus is still within the the root element
      if (el.value?.matches(':focus-within')) return
      phrase.value = ''
      flags.active = false
      close()
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

    function select(items = [pointer.item].filter(Boolean)) {
      model.isMultiple ? model.append(items) : model.append(items)

      model.isMultiple || close()
      phrase.value = ''
    }

    function onKeydown(ev: KeyboardEvent) {
      const handlers = {
        Escape() {
          if (!flags.opened) return blur()
          if (~pointer.index) return (pointer.index = -1)
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
          if (unref(phrase).length) return
          ev.metaKey ? model.clear() : model.pop()
        },
        default() {},
      }

      if (ev.key != 'Escape') open()
      ;(handlers[ev.key as keyof typeof handlers] || handlers.default)?.()

      if (
        ev.key != 'Enter' &&
        items.flags.tagging &&
        unref(phrase).length &&
        items.flags.tagOn.includes(ev.key)
      ) {
        ev.preventDefault()
        select()
      }
    }

    function detectValid() {
      return (flags.valid = !!el.value
        ?.querySelector('input')
        ?.matches(':valid'))
    }

    onMounted(detectValid)

    function onInput(ev: InputEvent) {
      // if (!detectValid()) return
      phrase.value = (ev.target as InputHTMLAttributes)?.value?.trim()
    }

    return reactive({
      flags,
      pointer,
      attrs: {
        root: {
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
          value: phrase,
          // TODO: Google like typeahead
          /* computed(
            () => (flags.opened && pointer.item?.label) || unref(phrase)
          ) as any, */
          onInput: computed(() =>
            src.async || props.debounce
              ? debounce(
                  typeof props.debounce == 'number'
                    ? props.debounce
                    : props.defaultDebounce,
                  onInput
                )
              : onInput
          ),
        },
        option(option: Item) {
          return {
            onClick: (ev: Event) => {
              ev.stopPropagation()
              select(option)
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

  watch(items, () => (index.value = -1))

  return reactive({
    index,
    item,
    next,
  })
}
