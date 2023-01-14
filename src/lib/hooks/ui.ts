import { MaybeRef, Item } from '@/types'
import {
  reactive,
  unref,
  ref,
  watch,
  computed,
  InputHTMLAttributes,
  onMounted,
  toRef,
  getCurrentInstance,
  watchEffect,
} from 'vue'
import { debounce, defineHook } from '@/utils'

// TODO
// or clearOn: select/blur/escape
// or closeOn: select/blur/escape
// tagOn: ,/ /Tab/Enter
// selection mode: append/toggle/skip(hide selected)
// resolve
// useQuery
// virtual scroll
// pagination
// typeahead styles: google / arc / placeholder like
const definition = defineHook(
  {
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
  },
  function (props, ctx, { phrase, src, items, model }) {
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

    const pointer = usePointer(computed(() => items.value))

    /**
     * Local version of `phrase` with debounce support;
     */
    const inputValue = useInputValue()

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
      if (!items.length) return

      model.isMultiple ? model.append(items) : model.append(items)

      model.isMultiple || close()
      phrase.value = ''
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
     * Creates local version of `phrase` with debounce supp since
     * binding phrase directly to input in combination with
     * debounced updates results in wrong phrase update
     * when component rerenders becuse of something else (i.e async search results)
     */
    function useInputValue() {
      const phrase_ = ref('')

      watchEffect(() => (phrase_.value = phrase.value))

      watch(
        phrase_,
        unref(
          computed(() => {
            const f = () => (phrase.value = phrase_.value.trim())
            if (!src.async && !props.debounce) return f
            const t =
              typeof props.debounce == 'number'
                ? props.debounce
                : props.defaultDebounce
            return debounce(t, f)
          })
        )
      )

      return computed({
        get() {
          if (!props.typeahead) return unref(phrase_)

          return ((flags.opened && !pointer.item?.new && pointer.item?.label) ||
            unref(phrase_)) as string
        },
        set(v: string) {
          phrase_.value = v
        },
      })
    }

    return reactive({
      flags,
      pointer,
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
