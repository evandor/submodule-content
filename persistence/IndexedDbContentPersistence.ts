import {IDBPDatabase, openDB, deleteDB} from "idb";
import ContentPersistence from "src/content/persistence/ContentPersistence";
import {SearchDoc} from "src/search/models/SearchDoc";
import {EXPIRE_DATA_PERIOD_IN_MINUTES} from "boot/constants";

class IndexedDbContentPersistence implements ContentPersistence {

  private STORE_IDENT = 'content';

  private db: IDBPDatabase = null as unknown as IDBPDatabase

  getServiceName(): string {
    return "IndexedDbContentPersistence";
  }

  async init() {
    console.debug(" ...initializing content (IndexedDbContentPersistence)")
    this.db = await this.initDatabase()
    return Promise.resolve()
  }

  private async initDatabase(): Promise<IDBPDatabase> {
    console.debug(" about to initialize indexedDB (Content)")
    const ctx = this
    return await openDB("ContentDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(ctx.STORE_IDENT)) {
          console.log("creating db " + ctx.STORE_IDENT)
          let store = db.createObjectStore(ctx.STORE_IDENT);
          store.createIndex("expires", "expires", {unique: false});
        }
      }
    });
  }

  compactDb(): Promise<any> {
    return Promise.resolve(undefined);
  }

  deleteContent(url: string): Promise<void> {
    return this.db.delete(this.STORE_IDENT, btoa(url))
  }

  getContent(url: string): Promise<object> {
    const encodedUrl = btoa(url)
    if (this.db) {
      return this.db.get('content', encodedUrl)
    }
    return Promise.reject("db not ready (yet)")
  }

  getContents(): Promise<any[]> {
    return this.db.getAll(this.STORE_IDENT);
  }

  saveContent(url: string, text: string, metas: object, title: string, tabsetIds: string[]): Promise<any> {
    const encodedTabUrl = btoa(url)
    return this.db.put(this.STORE_IDENT, {
      id: encodedTabUrl,
      expires: new Date().getTime() + 1000 * 60 * EXPIRE_DATA_PERIOD_IN_MINUTES,
      title,
      url: url,
      content: text,
      metas: metas,
      tabsets: tabsetIds,
      //favIconUrl: tab.favIconUrl
    }, encodedTabUrl)
      .then((res) => {
        // console.info(new Tab(uid(), tab), "saved content for url " + tab.url)
        return res
      })
  }

  // async updateContent(url: string): Promise<object> {
  //   const encodedUrl = btoa(url)
  //
  //   const objectStore = this.db.transaction(this.STORE_IDENT, "readwrite").objectStore("content");
  //   let cursor = await objectStore.openCursor()
  //   let data = null
  //   while (cursor) {
  //     if (cursor.value.id === encodedUrl) {
  //       data = cursor.value
  //       data['expires'] = 0
  //       objectStore.put(data, cursor.key)
  //     }
  //     cursor = await cursor.continue();
  //   }
  //   return Promise.resolve(data)
  // }

  async cleanUpContent(fnc: (url: string) => boolean): Promise<SearchDoc[]> {
    const contentObjectStore = this.db.transaction("content", "readwrite").objectStore("content");
    let contentCursor = await contentObjectStore.openCursor()
    let result: SearchDoc[] = []
    while (contentCursor) {
      if (contentCursor.value.expires !== 0) {
        const exists: boolean = fnc(atob(contentCursor.key.toString()))//this.urlExistsInATabset(atob(contentCursor.key.toString()))
        if (exists) {
          const data = contentCursor.value
          data.expires = 0
          contentObjectStore.put(data, contentCursor.key)
          result.push(new SearchDoc(
            data.id, "", data.title, data.url, data.description, "", data.content, [], '', data.favIconUrl
          ))
        } else {
          if (contentCursor.value.expires < new Date().getTime()) {
            contentObjectStore.delete(contentCursor.key)
          }
        }
      }
      contentCursor = await contentCursor.continue();
    }
    return Promise.resolve(result)
  }


}

export default new IndexedDbContentPersistence()
