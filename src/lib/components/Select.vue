<script lang="tsx">
import { defineComponent, PropType, InjectionKey, provide } from 'vue'
import { useService, props } from '@/service'
import { SelectService } from '@/types'

const serviceKey = Symbol() as InjectionKey<SelectService>
export default defineComponent({
  name: 'Select',
  props: {
    ...props,
    service: {} as PropType<SelectService>,
    class: {},
  },
  inheritAttrs: false,
  setup(props, ctx) {
    const service = props.service || useService(props, ctx)

    provide(serviceKey, service)

    const { attrs, slots } = ctx

    ctx.expose({ service })

    return () => {
      const { items, ui } = service
      const { pointer } = ui

      return (
        <div
          class={[
            'vue3-select max-w-md mb-30 relative text-black text-sm',
            props.class,
          ]}
          {...ui.attrs.root}
        >
          <div class="flex flex-wrap gap-1 bg-white p-1 rounded-sm">
            {service.model.value.map((e, i) => (
              <span
                class="vue3-select__selected flex items-center text-sm px-2 py-1 bg-gray-300 hover:bg-gray-200 rounded-sm cursor-pointer"
                onClick={() => service.model.remove(i)}
              >
                {slots.both?.({ item: e, index: i }) || e.label}
              </span>
            ))}
            <div class="relative flex-1">
              <input
                class="px-2 h-8 border-none rounded-sm flex-1 w-full"
                {...attrs}
                {...ui.attrs.input}
              />
            </div>
            {(service.model.busy || service.src.busy) && (
              <i class="flex-shrink-0 block animate-spin h-6 w-6 grid items-center text-center">
                🛞
              </i>
            )}
          </div>
          <ul
            class="bg-white list-none p-0 m-0 absolute top-full w-full mt-2 overflow-auto rounded-sm shadow-md overflow-auto max-h-md"
            style={ui.flags.opened ? '' : { display: 'none' }}
          >
            {items.value.map((e, i) => (
              <li
                class={`h-7 flex items-center m-0 px-2 hover:bg-gray-300 cursor-pointer ${
                  pointer.index == i ? 'bg-gray-200' : ''
                }`}
                {...ui.attrs.option(e)}
              >
                {slots.item?.({ item: e, index: i }) ||
                  slots.both?.({ item: e, index: i }) ||
                  e.label}
                {e.new && (
                  <span class="text-xs opacity-30 ml-auto italic">create</span>
                )}
              </li>
            ))}
          </ul>
        </div>
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
</style>
