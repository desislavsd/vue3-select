import Select from '@/components/Select.vue'

declare module 'vue' {
  export interface GlobalComponents {
    VueSelect: typeof Select
  }
}

export default {
  install(app) {
    app.component('VueSelect', Select)
  },
}
