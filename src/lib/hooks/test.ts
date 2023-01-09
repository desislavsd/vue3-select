import { PropType, SetupContext, ref } from 'vue'
import { defineHook } from '@/utils'
import { SelectService, MaybeRef } from '@/types'

const props = {
  phrase: {
    type: {} as PropType<MaybeRef<string>>,
    default: '',
  },
  modelValue: {},
  tagging: [Boolean, String, Array] as PropType<boolean | string | string[]>,
}

const def = defineHook(props, (props, { attrs }, { item }) => {
  props.tagging
  return { foo: 1 }
})

const res = def.hook(
  { phrase: '', modelValue: ref(0) },
  {} as SetupContext,
  {} as SelectService
)
