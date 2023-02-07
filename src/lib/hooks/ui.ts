import {
  MaybeRef,
  Item,
  WithoutFirstParameter,
  MaybeArray,
  Not,
  SelectService,
  Fn,
  ItemStateful,
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
  disabled: {
    type: Boolean,
  },
  readonly: {
    type: Boolean,
  },
  accessible: {
    type: Boolean,
  },
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
  function (props, ctx, { phrase, src, item, items, pointer, model }) {
    const vm = getCurrentInstance()

    const ids = computed(() => {
      const id =
        props.id || `v3s-${vm?.uid || Math.random().toString(32).slice(2)}`

      const mk = (...args: string[]) => [unref(id), ...args].join('-')

      return {
        root: unref(id),
        list: mk('list'),
        input: mk('input'),
        option: (item: Item) => mk(`option`, item.index as string),
      }
    })

    const el = ref<HTMLElement | null>(null)

    const flags = reactive({
      active: false,
      opened: false,
      disabled: toRef(props, 'disabled'),
      readonly: toRef(props, 'readonly'),
      mode: toRef(items.flags, 'mode'),
    })

    const inputValue = useTypeAheadPhrase()

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

    function select(...args: ItemStateful[][]) {
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
        phrase.value.length &&
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
          if (phrase.value.length) return
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

    /**
     * Creates proxy to phrase with typeahead support,
     * i.e. its value is the label of the pointed item
     * and fallbacks to the value of the original phrase
     */
    function useTypeAheadPhrase() {
      const value = computed({
        get() {
          return phrase.value
        },
        set(v) {
          phrase.type(v)
        },
      })

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
      items: computed(() =>
        items.value.map(
          (e: Item, position) =>
            new item.value({
              ...e,
              position,
              selected: items.checkSelected(e),
              disabled: items.checkDisabled(e),
              pointed: pointer.item?.equals(e),
            }) as ItemStateful
        )
      ),
      attrs: {
        // attrs are constructed in IIFEs for optimization
        // so that static attrs maybe reused accross updates;
        root: (() => {
          const attrs = {
            tabindex: -1,
            ref(e: any) {
              el.value = e
            },
            onFocusin,
            onFocusout,
            onKeydown,
            onClick: () => open(),
          }

          return computed(() => {
            return {
              id: props.id,
              ...attrs,
              ...(props.accessible && {
                id: unref(ids).root,
                'aria-haspopup': 'listbox',
                'aria-expanded': flags.opened,
                'aria-owns': unref(ids).list,
                'aria-disabled': flags.disabled || undefined,
                'aria-readonly': flags.disabled || flags.readonly || undefined,
              }),
            }
          })
        })(),
        input: (() => {
          const attrs = {
            autocomplete: 'off',
            type: 'search',
            readonly: flags.readonly,
            disabled: flags.disabled,
            onInput: (ev: { target: HTMLInputElement }) =>
              (inputValue.value = ev.target.value),
          }

          return computed(() => {
            return {
              ...attrs,
              readonly: flags.readonly,
              disabled: flags.disabled,
              placeholder: props.placeholder,
              value: inputValue.value,
              ...(props.accessible && {
                id: unref(ids).input,
                role: 'textbox',
                'aria-autocomplete': 'list',
                'aria-labelledby': '',
                'aria-controls': unref(ids).list,
                'aria-activedescendant': pointer.item
                  ? unref(ids).option(pointer.item)
                  : undefined, // selected option id,
              }),
            }
          })
        })(),
        list: computed(() => ({
          ...(props.accessible && {
            id: unref(ids).list,
            role: 'listbox',
            'aria-hidden': (props.accessible && !flags.opened) || undefined,
          }),
        })),
        option(option: ItemStateful) {
          return {
            ...(props.accessible && {
              id: unref(ids).option(option),
              role: 'option',
              'aria-selected': option.selected || undefined,
              'aria-disabled':
                props.disabled ||
                props.readonly ||
                option.disabled ||
                undefined,
            }),
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
    })
  }
)

export default definition
