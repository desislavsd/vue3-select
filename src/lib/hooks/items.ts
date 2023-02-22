import {
  Item,
  WithoutFirstParameter,
  MaybeArray,
  Not,
  Fn,
  SelectService,
  MaybeRef,
  ItemState,
} from '@/types'
import { reactive, unref, computed, toRef, PropType, watch, ref } from 'vue'

import { defineHook, toPath, get, craw, isset } from '@/utils'

type FilterProp = boolean | string | string[] | typeof defaultFilter

const props = {
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
  /**
   * Strategy on handling selected options:
   *
   * `'skip'` - they won't appear in dropdown
   *
   * `'append'` - allows selecting same option multiple times
   *
   * `'toggle'` - selecting selected option will deselect it
   *
   * `'disable'` - selected options appear in dropdown but can't be selected anymore;
   */
  mode: {
    type: String as PropType<'skip' | 'append' | 'toggle' | 'disable'>,
    default: 'skip',
  },
  /**
   * Function that returns true for options that should be disabled
   */
  disable: {
    type: Function as PropType<(this: SelectService, item: Item) => boolean>,
  },

  /**
   * Automatically point the first option in the list;
   *
   * _Notice: leads to bad UX when used alongside typeahead_
   */
  autopoint: {
    type: Boolean,
    default: undefined,
  },
}

export default defineHook(
  props,
  (props, ctx, { phrase, src, item, model, service }) => {
    const items = computed(() => src.data)

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

      return normalizeFilterWithGroupSupp(props.filter)
    })

    const moded = computed(() => {
      return flags.mode == 'skip'
        ? unref(items).filter((e) => !checkSelected(e))
        : unref(items)
    })

    // TODO: filter by group too;
    const filtered = computed(() => {
      if (!phrase.value || !unref(filter)) return unref(moded)

      return unref(moded).filter((item) =>
        (unref(filter) as Fn<boolean>)(item, phrase.value)
      )
    })

    const grouped = computed(() => {
      const items = unref(filtered)
      // use src.data to preserve groups order despite filtering
      const groupNames = [...new Set(src.data.map((e) => e.group))].filter(
        isset
      ) as string[]

      return groupNames.length
        ? groupNames
            .map((gr) => {
              const groupItems = items.filter((e) => e.group == gr)
              const group = item.value.mkGroup(gr, groupItems)
              return groupItems.length ? [group, ...groupItems] : []
            })
            .flat()
        : items
    })

    const tags = computed(() => {
      if (
        !props.tagging ||
        !phrase.value ||
        src.busy ||
        (src.dynamic && phrase.typing)
      )
        return []

      const tag = unref(item).ofPhrase(phrase.value)

      if (unref(filtered).some((e) => e.matches(tag))) return []

      return [tag]
    })

    const value = computed(() => unref(tags).concat(unref(grouped)))

    const pointer = usePointer(value, props)

    const stateful = computed(() =>
      unref(value).map((e, position) =>
        e.clone({
          position,
          selected: checkSelected(e),
          disabled: checkDisabled(e),
          pointed: position == unref(pointer.index),
        } as ItemState)
      )
    )

    /**
     * Updates selection with given items
     * with respect to their state and the `mode`
     */
    function select(items: Item[]) {
      items = items
        .map((item) => {
          if (!item.isGroup()) return item
          return checkSelected(item)
            ? item.value
            : item.value.filter((e) => !checkSelected(e))
        })
        .flat()

      items = items.filter((e) => !checkDisabled(e))

      if (!items.length) return

      model.isMultiple
        ? props.mode == 'append'
          ? model.append(items)
          : model.toggle(items)
        : model.append(items)
    }

    function checkSelected(item: Item): boolean {
      if (item.isGroup())
        return !!item.value.length && item.value.every(checkSelected)
      return model.value.some((s) => s.equals(item))
    }

    function checkDisabled(item: Item): boolean {
      if (item.isGroup())
        return !!item.value.length && item.value.every(checkDisabled)

      return Boolean(
        props.disable?.call(service, item) ||
          (props.mode == 'disable' && checkSelected(item))
      )
    }

    return reactive({
      value: stateful,
      flags,
      pointer: reactive({
        ...pointer,
        item: computed(() => unref(stateful)[unref(pointer.index)]),
      }),
      select,
      checkDisabled,
      checkSelected,
    })
  }
)

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

function normalizeFilterWithGroupSupp(filter?: FilterProp) {
  const groupFilter = filterByProps.bind(null, ['group'])
  const normalized = normalizeFilter(filter)

  return (...args: Parameters<typeof defaultFilter>) =>
    groupFilter(...args) || normalized(...args)
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

function usePointer(items: MaybeRef<Item[]>, props: { autopoint?: boolean }) {
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

  /**
   * `true` -> previous item;
   * `false` -> next item;
   * `number` -> exact item;
   */
  function next(to: boolean | number = false): void {
    const last = unref(items).length - 1

    if (typeof to == 'boolean') to = unref(index) + (to ? -1 : 1)

    index.value = to
  }

  watch(
    items,
    (items) => (index.value = unref(items)[0]?.new || props.autopoint ? 0 : -1)
  )

  return {
    index,
    next,
  }
}
