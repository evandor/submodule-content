import {useUtils} from "src/core/services/Utils";
import ContentPersistence from "src/content/persistence/ContentPersistence";
import {ContentItem} from "src/content/models/ContentItem";
import AppEventDispatcher from "src/services/AppEventDispatcher";

let db: ContentPersistence = null as unknown as ContentPersistence

export function useContentService() {

  const {inBexMode} = useUtils()

  const onMessageListener = (request: any, sender: chrome.runtime.MessageSender, sendResponse: any) => {
  }

  const onUpdatedListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, browserTab: chrome.tabs.Tab) => {
    const selfUrl = chrome.runtime.getURL("")

  }

  const init = async (storage: ContentPersistence) => {
    console.debug(" ...initializing contentService as", storage.getServiceName())
    db = storage
    await db.init()
    initListeners()
  }

  const populateSearch = async () => {
    AppEventDispatcher.dispatchEvent('populate-from-content', await getContents())
  }

  const saveContent = (url: string, text: string, metas: object, title: string, tabsetIds: string[]): Promise<any> => {
    return db.saveContent(url,new ContentItem("id", title, url, text, metas,  tabsetIds))
  }

  const deleteContent = (url: string) => {
    return db.deleteContent(url)
  }

  const getContent = (url: string) => {
    return db ? db.getContent(url) : Promise.reject('no db')
  }

  const getContents = (): Promise<ContentItem[]> => {
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
    getContent,
    populateSearch
  }

}


