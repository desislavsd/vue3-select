import {
  Item,
  ItemStateful,
  PartialRecursive,
  Pretty,
  Require,
  SelectService,
} from '@/types'
import { ns } from '@/utils'
import {
  defineComponent,
  computed,
  PropType,
  SetupContext,
  ExtractPropTypes,
} from 'vue'
import { useService } from '../service'

export const Input = defineComponent({
  name: ns`SelectInput`,
  setup() {
    const service = useService()

    return () => (
      <input class={ns`input`} {...(service.ui.attrs.input as any)} />
    )
  },
})

export const Option = defineHeadlessComponent({
  name: 'option',
  props: {
    option: {
      type: Object as PropType<ItemStateful>,
      required: true,
    },
  },
  renderData: ({ props }) => ({
    scope: {
      option: props.option,
    },
    defaultContent: props.option?.label,
  }),
})

export const Selected = defineHeadlessComponent({
  name: 'selected',
  props: {
    option: {
      type: Object as PropType<Item>,
      required: true,
    },
    index: { type: Number, required: true },
  },
  renderData: ({ props }) => ({
    scope: {
      option: props.option,
      index: props.index,
    },
    defaultContent: props.option?.label,
  }),
})

export const List = defineHeadlessComponent({
  name: 'list',
  renderData: ({ service }) => ({
    scope: {
      options: service.ui.items,
      opened: service.ui.flags.opened,
    },
  }),
})

export const Toggle = defineHeadlessComponent({
  name: 'toggle',
  renderData: ({ service }) => ({
    scope: {
      opened: service.ui.flags.opened,
    },
  }),
})

export const Clear = defineHeadlessComponent({
  name: 'clear',
  renderData: ({ service }) => ({
    scope: {
      hasValue: service.model.value.length,
    },
  }),
})

export const Root = defineHeadlessComponent({
  name: 'root',
})

type HeadlessProps = {
  tag: {
    type: PropType<string>
    required: boolean
  }
}

function renderHeadless<TProps extends ExtractPropTypes<HeadlessProps>>({
  props,
  ctx,
  scope,
  defaultContent,
}: {
  props: TProps
  ctx: SetupContext
  scope: { attrs: any; [key: string]: unknown }
  defaultContent?: unknown
}) {
  const { slots } = ctx

  let html = slots.default?.(scope) ?? defaultContent

  if (props.tag) html = <props.tag {...scope.attrs}>{html}</props.tag>

  return html
}

function defineHeadlessComponent<
  TProps extends Partial<HeadlessProps> & Record<string, any>,
  TFinalProps = Pretty<TProps & Require<HeadlessProps, 'tag'>>
>({
  props,
  name,
  renderData,
}: {
  name: string
  props?: TProps
  renderData?: (data: {
    props: ExtractPropTypes<TFinalProps>
    ctx: SetupContext
    service: SelectService
  }) => PartialRecursive<Parameters<typeof renderHeadless>[0]>
}) {
  const allProps = {
    ...props,
    tag: {} as PropType<string>,
  } as unknown as Pretty<TProps & Require<HeadlessProps, 'tag'>>

  return defineComponent({
    name: ns(name),
    props: allProps,
    setup(props, ctx) {
      const service = useService()
      const attrs = computed(() => {
        // @ts-ignore
        let uiAttrs = service.ui.attrs[name]
        uiAttrs = uiAttrs?.call?.(null, props) || uiAttrs || {}
        return {
          // @ts-ignore
          ...(uiAttrs?.call?.(null, props) || uiAttrs || {}),
          class: [ns(name), uiAttrs.class].filter(Boolean),
        }
      })

      return () => {
        // @ts-ignore
        const data = renderData?.call(null, { props, ctx, service }) || {}

        return renderHeadless({
          ...data,
          props,
          ctx,
          scope: {
            service,
            attrs: attrs.value,
            ...data.scope,
          },
        })
      }
    },
  })
}
