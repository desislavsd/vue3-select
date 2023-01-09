import { PropType } from 'vue'
import { MaybeRef, UpdateHandler } from '@/types'
import { defineHook } from '@/utils'
import { useVModel } from '@/capi'

export default defineHook(
  {
    phrase: {
      type: [String, Object] as PropType<MaybeRef<string>>,
      default: '',
    },
    'onUpdate:phrase': {} as PropType<UpdateHandler>,
  },
  (props) => useVModel(props, 'phrase', { defaultValue: '' }).proxy
)
