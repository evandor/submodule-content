import {useUtils} from "src/core/services/Utils";
import ContentPersistence from "src/content/persistence/ContentPersistence";

let db: ContentPersistence = null as unknown as ContentPersistence

export function useContentService() {

  const {inBexMode} = useUtils()

  const onMessageListener = (request: any, sender: chrome.runtime.MessageSender, sendResponse: any) => {
  }

  const onUpdatedListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, browserTab: chrome.tabs.Tab) => {
    const selfUrl = chrome.runtime.getURL("")

  }

  const init = async (storage: ContentPersistence) => {
    console.log(" ...initializing contentService as", storage.getServiceName())
    db = storage
    await db.init()
    initListeners()
  }

  const saveContent = (url: string, text: string, metas: object, title: string, tabsetIds: string[]): Promise<any> => {
    return db.saveContent(url,text,metas,title, tabsetIds)
  }

  const deleteContent = (url: string) => {
    return db.deleteContent(url)
  }

  const getContent = (url: string) => {
    return db ? db.getContent(url) : ''
  }

  const getContents = (): Promise<any[]> => {
    return db ? db.getContents() : Promise.resolve([])
  }
  const cleanUpContent = (fnc: (url: string) => boolean) => {
    return db.cleanUpContent(fnc)
  }



  const initListeners = () => {
    // console.log("*** init Listeners ***")
    // if (inBexMode()) {
    //   console.debug(" ...initializing thumbnails Listeners")
    //   chrome.runtime.onMessage.addListener(onMessageListener)
    //   chrome.tabs.onUpdated.addListener(onUpdatedListener)
    // }
  }

  async function resetListeners() {
    // chrome.runtime.onMessage.removeListener(onMessageListener)
    // chrome.tabs.onUpdated.removeListener(onUpdatedListener)
  }



  return {
    init,
    saveContent,
    getContents,
    deleteContent,
    cleanUpContent,
    getContent
  }

}


