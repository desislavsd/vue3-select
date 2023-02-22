import { useIntersectionObserver } from '@/capi'
import { Item, ItemStateful } from '@/types'
import { defineHook } from '@/utils'
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUpdate,
  reactive,
  ref,
  toRef,
  unref,
  watch,
} from 'vue'

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
  disabled: Boolean,
  readonly: Boolean,
  accessible: Boolean,
  autoscroll: { type: Boolean, default: true },
  /**
   * Limit the number of options displayed;
   * The rest will be loaded with infinite scroll on demand
   */
  limit: {
    type: Number,
    default: 15,
  },
}

const definition = defineHook(
  uiProps,
  function (props, ctx, { phrase, src, items, model }) {
    const vm = getCurrentInstance()

    const { pointer } = items

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

    const els = reactive({
      root: ref<HTMLElement | undefined>(),
      list: ref<HTMLElement | undefined>(),
      input: ref<HTMLElement | undefined>(),
      options: ref<HTMLElement[]>([]),
    })

    const flags = reactive({
      active: false,
      opened: false,
      disabled: toRef(props, 'disabled'),
      readonly: toRef(props, 'readonly'),
      mode: toRef(items.flags, 'mode'),
    })

    const { items: uiItems, scrollTo } = useInfiniteScroll()

    const inputValue = useTypeAheadPhrase()

    onBeforeUpdate(() => (els.options = []))

    watch([toRef(props, 'autoscroll')], autoscroll)

    function autoscroll() {
      props.autoscroll && scrollTo(pointer.index)
    }

    function onFocusin(ev: FocusEvent) {
      flags.active = true
      // open()
      focus()
      !src.data && !src.busy && src.refresh()
    }

    function onFocusout(ev: FocusEvent & { relatedTarget: HTMLElement }) {
      // do nothing if focus is still within the the root element
      if (els.root?.matches(':focus-within')) return
      phrase.value = ''
      flags.active = false
      close()
    }

    async function select(
      newItems: ItemStateful[] = [pointer.item].filter(Boolean),
      point = false
    ) {
      if (!newItems?.length) return
      const pointerPosition = point
        ? newItems[0]?.position || -1
        : pointer.index

      await (flags.readonly || flags.disabled || items.select(newItems))

      pointer.index = pointerPosition

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
    }

    function focus() {
      els.root?.querySelector('input')?.focus()
    }

    function blur() {
      const focused: HTMLElement | undefined =
        els.root?.querySelector(':focus') || els.root
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
          close()
        },
        Enter() {
          select()
        },
        ArrowDown() {
          ev.preventDefault()
          pointer.next(ev.metaKey ? Infinity : false)
          autoscroll()
        },
        ArrowUp() {
          ev.preventDefault()
          pointer.next(ev.metaKey ? 0 : true)
          autoscroll()
        },
        Backspace() {
          if (phrase.value.length) return
          ev.metaKey ? model.clear() : model.pop()
        },
        default() {
          if (willTag) return
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

      const shouldTypeahead = computed(
        () =>
          props.typeahead &&
          flags.opened &&
          !pointer.item?.new &&
          pointer.item?.label
      )

      // proxy to the local phrase value that
      const proxy = computed({
        get() {
          return (
            (unref(shouldTypeahead) as false | string) ||
            (unref(value) as string)
          )
        },
        set(v: string) {
          value.value = v
        },
      })

      // Selects the part of the phrase in the input field that is suggested but not written but the user
      watch(proxy, async () => {
        let str = unref(shouldTypeahead) as string

        if (!str) return

        let i = str.startsWith(unref(value)) ? unref(value).length : 0

        await nextTick()

        // @ts-ignore
        els.input?.setSelectionRange?.(i, str.length)
      })

      return proxy
    }

    /**
     * Paginates the items client side in order
     * to render less nodes; More nodes are rendered on demand;
     */
    function useInfiniteScroll() {
      const page = ref(1)

      const isLast = computed(
        () => page.value * props.limit >= items.value.length
      )

      watch(
        [toRef(phrase, 'value'), toRef(src, 'data')],
        () => {
          page.value = 1
          scrollTo(0)
        },
        { flush: 'pre' }
      )

      useIntersectionObserver(
        reactive({
          target: computed(() => els.options?.at(-1)) as any,
          root: toRef(els, 'list') as any,
          rootMargin: '50px',
          callback: ([{ isIntersecting }]) => {
            if (!isIntersecting) return

            if (unref(isLast)) return

            const st = els.list?.scrollTop || 0

            page.value += 1

            nextTick(() => {
              if (els.list) els.list.scrollTop = st
            })
          },
        })
      )

      async function scrollTo(position: number) {
        position = Math.max(0, Math.min(position, items.value.length - 1))

        // ensure enough options are loaded
        page.value = Math.max(Math.ceil(position / props.limit), page.value)

        // await for the ui to update & the options to be gemerated
        // this is only needed if the page has changed but it doesnt hurt
        await nextTick()

        const el = els.options[position],
          { list } = els

        if (!list) return

        const to = el
          ? Math.round(el.offsetTop + el.offsetHeight - list?.offsetHeight / 2)
          : 0

        list.scrollTop = to
      }

      return {
        items: computed(() => items.value.slice(0, unref(page) * props.limit)),
        page,
        scrollTo,
      }
    }

    return reactive({
      els,
      flags,
      pointer,
      items: uiItems,
      attrs: {
        // attrs are constructed in IIFEs for optimization
        // so that static attrs maybe reused accross updates;
        root: (() => {
          const attrs = {
            tabindex: -1,
            ref: (e: any) => (els.root = e),
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
            ref: (e: any) => (els.input = e),
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
        list: (() => {
          const attrs = {
            ref: (e: any) => (els.list = e),
          }

          return computed(() => ({
            ...attrs,
            ...(props.accessible && {
              id: unref(ids).list,
              role: 'listbox',
              'aria-hidden': (props.accessible && !flags.opened) || undefined,
            }),
          }))
        })(),
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
            ref: (e: any) => (els.options[option.position] = e),
            // onMouseenter() {
            //   pointer.index = option.position
            // },
            onClick: (ev: Event) => {
              ev.stopPropagation()
              select([option], true)
            },
          }
        },
      },
      select,
      open,
      close,
      blur,
      focus,
      scrollTo,
    })
  }
)

export default definition
