import { PropType } from 'vue'
import { UpdateHandler } from '@/types'
import { defineHook } from '@/utils'
import { useVModel } from '@/capi'

export default defineHook(
  {
    phrase: {
      default: '',
    },
    'onUpdate:phrase': {} as PropType<UpdateHandler>,
  },
  (props) => useVModel(props, 'phrase', { defaultValue: '' }).proxy
)
