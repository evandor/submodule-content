import {defineStore} from 'pinia';
import {ref} from "vue";

export const useContentStore = defineStore('content', () => {

  const currentTabContent = ref<string>('')

  return {
    currentTabContent
  }
})
