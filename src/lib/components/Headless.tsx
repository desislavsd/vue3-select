import { Item, ItemStateful } from '@/types'
import { defineComponent, computed, PropType, SetupContext, VNode } from 'vue'
import { useService } from '../service'

export const Input = defineComponent({
  name: 'Vue3SelectInput',
  setup() {
    const service = useService()

    return () => <input {...(service.ui.attrs.input as any)} />
  },
})

export const Option = defineComponent({
  name: 'Vue3SelectOption',
  props: {
    tag: {} as PropType<string>,
    option: {
      type: Object as PropType<ItemStateful>,
      required: true,
    },
  },
  setup(props, ctx) {
    const service = useService()
    const attrs = computed(() =>
      props.option ? service.ui.attrs.option(props.option) : {}
    )
    return () =>
      renderHeadless({
        props,
        ctx,
        defaultContent: props.option?.label,
        scope: {
          option: props.option,
          attrs: attrs.value,
          service,
        },
      })
  },
})

export const Selected = defineComponent({
  name: 'Vue3SelectSelected',
  props: {
    tag: {} as PropType<string>,
    option: {
      type: Object as PropType<Item>,
      required: true,
    },
    index: { type: Number, required: true },
  },
  setup(props, ctx) {
    const service = useService()
    const attrs = computed(() =>
      props.option ? service.ui.attrs.selected(props.option, props.index) : {}
    )
    return () =>
      renderHeadless({
        props,
        ctx,
        scope: {
          option: props.option,
          index: props.index,
          attrs: attrs.value,
          service,
        },
      })
  },
})

export const List = defineComponent({
  name: 'Vue3SelectList',
  props: {
    tag: {} as PropType<string>,
  },
  setup(props, ctx) {
    const service = useService()
    const attrs = computed(() => service.ui.attrs.list || {})

    return () =>
      renderHeadless({
        props,
        ctx,
        scope: {
          attrs: attrs.value,
          service,
          options: service.ui.items,
        },
      })
  },
})

export const Toggle = defineComponent({
  name: 'Vue3SelectToggle',
  props: {
    tag: {} as PropType<string>,
  },
  setup(props, ctx) {
    const service = useService()
    const attrs = computed(() => service.ui.attrs.toggle || {})

    return () =>
      renderHeadless({
        props,
        ctx,
        scope: {
          attrs: attrs.value,
          service,
          opened: service.ui.flags.opened,
        },
      })
  },
})

export const Clear = defineComponent({
  name: 'Vue3SelectClear',
  props: {
    tag: {} as PropType<string>,
  },
  setup(props, ctx) {
    const service = useService()
    const attrs = computed(() => service.ui.attrs.clear || {})

    return () =>
      renderHeadless({
        props,
        ctx,
        scope: {
          attrs: attrs.value,
          service,
          hasValue: service.model.value.length,
        },
      })
  },
})

export const Root = defineComponent({
  name: 'Vue3SelectRoot',
  props: {
    tag: {} as PropType<string>,
  },
  setup(props, ctx) {
    const service = useService()
    const attrs = computed(() => service.ui.attrs.root || {})

    return () =>
      renderHeadless({
        props,
        ctx,
        scope: {
          attrs: attrs.value,
          service,
        },
      })
  },
})

function renderHeadless({
  props,
  ctx,
  scope,
  defaultContent,
}: {
  props: { tag: undefined | string; [key: string]: unknown }
  ctx: SetupContext
  scope: { attrs: any; [key: string]: unknown }
  defaultContent?: unknown
}) {
  const { slots } = ctx

  let html = slots.default?.(scope) ?? defaultContent

  if (props.tag) html = <props.tag {...scope.attrs}>{html}</props.tag>

  return html
}
