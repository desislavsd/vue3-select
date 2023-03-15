<script lang="tsx">
import useService from '@/service'
import { PropType, defineComponent } from 'vue'
import * as Select from './Headless'
import { props } from '../service'
import { ns } from '@/utils'

export default defineComponent({
  props: {
    ...props,
    components: {
      type: Object as PropType<typeof Select>,
      default: () => Select,
    },
  },
  setup(props, ctx) {
    const service = useService(props, ctx)

    return () => {
      const Items = service.ui.items.map((option, index) => (
        <Select.Option tag="li" {...{ option, index }} />
      ))

      const Selected = service.model.value.map((option, index) => (
        <Select.Selected tag="button" {...{ option, index }} />
      ))

      const List = service.ui.flags.opened && (
        <Select.List tag="ul">{Items}</Select.List>
      )

      return (
        <Select.Root tag="div" class="v3s-theme-default-auto">
          {Selected}
          <div class={ns`controls`}>
            <Select.Input />
            <Select.Clear tag="button">𐄂</Select.Clear>
            <Select.Toggle tag="button">▼</Select.Toggle>
          </div>
          {List}
        </Select.Root>
      )
    }
  },
})
</script>
<style lang="scss">
$ns: 'v3s-';
$theme: '.#{$ns}root[class*="#{$ns}theme-"]';

.#{$ns} {
  &root {
    &,
    * {
      margin: 0;
      padding: 0;
      background-color: transparent;
      border: transparent;
      box-sizing: border-box;
    }
    ul {
      list-style: none;
    }
    button,
    input {
      font: inherit;
      color: inherit;
      outline: none;
    }
  }
  &root {
    font-size: 16px;
    --gut: 3px;
    --height: 2.6em;
    border-radius: var(--radius);
    display: flex;
    gap: var(--gut);
    padding: var(--gut);
    position: relative;
    background: var(--c-bg);
    color: var(--c-color);
    flex-wrap: wrap;
  }
  @at-root #{$theme} {
    --radius: 0.2em;
    --a-list: #{$ns}pop-in 250ms ease forwards;
    --a-selected: #{$ns}scale-in 250ms ease forwards;
    --c-theme-content: var(--c-color);
    border-radius: var(--radius);
  }
  &theme-default {
    &,
    &-auto {
      --c-bg: #fff;
      --c-theme: #f0f0f0;
      --c-color: #000;
    }
    &-auto {
      @media (prefers-color-scheme: dark) {
        --c-bg: #333;
        --c-theme: #444;
        --c-color: #fff;
      }
    }
  }
  &btn {
    cursor: pointer;
    aspect-ratio: 1/1;
    #{$theme} &:not(:hover) {
      opacity: 0.6;
    }
  }
  &selected,
  &controls > * {
    min-height: calc(var(--height) - 2 * var(--gut));
    padding: 0 0.5em;
  }
  &controls {
    display: flex;
    flex: 1;
  }
  &input {
    flex: 1;
    min-width: 6em;
  }
  &selected {
    cursor: pointer;
    #{$theme} & {
      background: var(--c-theme);
      animation: var(--a-selected);
      color: var(--c-theme-content);
      &:hover {
        filter: brightness(0.95);
      }
    }
  }
  &list {
    position: absolute;
    left: 0;
    top: 100%;
    margin-top: 0.5em;
    width: 100%;
    z-index: 1;
    max-height: 15em;
    overflow: auto;
    #{$theme} & {
      background: var(--c-bg);
      animation: var(--a-list);
      border-radius: var(--radius);
    }
  }
  &option {
    padding: 0.3em 0.5em;
    line-height: 1.5;
    cursor: pointer;
    &.--disabled {
      opacity: 0.6;
    }
    &.--group {
      font-weight: bold;
    }
    #{$theme} &:hover:not(.--disabled),
    #{$theme} &.--pointed {
      background: var(--c-theme);
      color: var(--c-theme-content);
    }
    #{$theme} &:hover {
      filter: brightness(0.95);
    }
  }
}
@keyframes #{$ns}pop-in {
  from {
    translate: 0 -1em;
    opacity: 0;
  }
  to {
    translate: 0 0;
    opacity: 1;
  }
}

@keyframes #{$ns}scale-in {
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
