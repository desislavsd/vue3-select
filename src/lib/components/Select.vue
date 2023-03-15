<script lang="tsx">
import { defineComponent, PropType, InjectionKey, provide } from 'vue'
import { useService, props } from '@/service'
import { SelectService } from '@/types'
import * as Select from './Headless'

export default defineComponent({
  name: 'Select',
  props: {
    ...props,
    service: {} as PropType<SelectService>,
    class: {},
  },
  inheritAttrs: false,
  setup(props, ctx) {
    const service = useService(props, ctx)

    const { attrs, slots } = ctx

    ctx.expose({ service })

    return () => {
      const { ui } = service
      const { items } = ui

      const list = !ui.flags.readonly && !ui.flags.disabled && (
        <Select.List
          tag="ul"
          class={[
            'bg-white list-none p-0 m-0 absolute top-full w-full mt-2 overflow-auto rounded-sm shadow-md overflow-auto max-h-60 z-10',
            ui.flags.opened || 'hidden',
          ]}
        >
          {items.map((option, i) => (
            <Select.Option
              option={option}
              tag="li"
              class={[
                `min-h-7 flex items-center m-0 px-2 cursor-pointer`,
                option.pointed ? 'bg-gray-200' : 'bg-white',
                option.disabled ? 'text-base-content/80' : 'hover:bg-gray-300',
                option.isGroup() && 'font-bold sticky top-0',
              ]}
            >
              {{
                default({ option }) {
                  return (
                    <>
                      {slots.item?.({ item: option, index: i }) ||
                        slots.both?.({ item: option, index: i }) ||
                        option.label}
                      {option.selected && (
                        <span class="text-xs opacity-30 ml-auto italic text-green-500">
                          {ui.flags.mode == 'toggle' ? '❌' : '✔️'}
                        </span>
                      )}
                      {!option.isGroup() && option.new && !option.added && (
                        <span class="text-xs opacity-30 ml-auto italic">
                          create
                        </span>
                      )}
                    </>
                  )
                },
              }}
            </Select.Option>
          ))}
        </Select.List>
      )

      return (
        <Select.Root
          tag="div"
          class={[
            'vue3-select max-w-md mb-30 relative text-black text-sm',
            props.class,
          ]}
        >
          <div class="flex flex-wrap gap-1 bg-white p-1 rounded-sm w-full">
            {service.model.value.map((option, index) => (
              <Select.Selected
                tag="span"
                class="vue3-select__selected flex items-center text-sm px-2 py-1 bg-gray-300 hover:bg-gray-200 rounded-sm cursor-pointer"
                {...{ option, index }}
              >
                {slots.both?.({ item: option, index: index }) || option.label}
              </Select.Selected>
            ))}
            <div class="relative flex-1 min-w-30">
              <Select.Input
                class="px-2 h-8 border-none rounded-sm flex-1 w-full"
                {...attrs}
              />
            </div>
            {service.phrase.typing ? (
              <i class="flex-shrink-0 block animate-pulse h-6 w-6 grid items-center text-center">
                💬
              </i>
            ) : (
              ''
            )}
            {(service.model.busy ||
              service.model.resolving ||
              service.src.busy) && (
              <i class=" flex-shrink-0 block animate-spin h-6 w-6 grid items-center text-center">
                🛞
              </i>
            )}
            <Select.Clear>
              {{
                default: ({ attrs, hasValue }) =>
                  hasValue ? <button {...attrs}>&times;</button> : null,
              }}
            </Select.Clear>
            <Select.Toggle tag="button">
              {{
                default({ opened }: { opened: boolean }) {
                  return <i>{opened ? '▲' : '▼'}</i>
                },
              }}
            </Select.Toggle>
            <span
              class={`h-2 w-2 ${service.src.enabled ? 'bg-green' : 'bg-red'}`}
            ></span>
          </div>
          {list}
        </Select.Root>
      )
    }
  },
})
</script>
<style scoped>
.vue3-select,
.vue3-select * {
  box-sizing: border-box;
  outline: none !important;
}
.vue3-select ul {
  animation: pop-in 150ms ease forwards;
}

.vue3-select__selected {
  animation: scale-in 250ms ease forwards;
  /* transform-origin: left center; */
}

@keyframes pop-in {
  from {
    translate: 0 -1em;
    opacity: 0;
  }
  to {
    translate: 0 0;
    opacity: 1;
  }
}

@keyframes scale-in {
  0% {
    scale: 0;
  }
  70% {
    scale: 1.2;
  }
  100% {
    scale: 1;
  }
}

@keyframes clip-in {
  0% {
    clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
  }
  100% {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}
</style>
