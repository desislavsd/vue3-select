import 'uno.css'
import Select from './components/Select.vue'
export const VueSelect = Select
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
