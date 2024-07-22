import {IDBPDatabase, openDB} from "idb";
import ContentPersistence from "src/content/persistence/ContentPersistence";
import {ContentItem} from "src/content/models/ContentItem";

class IndexedDbContentPersistence implements ContentPersistence {

  private STORE_IDENT = 'content';

  private db: IDBPDatabase = null as unknown as IDBPDatabase

  getServiceName(): string {
    return this.constructor.name
  }

  async init() {
    this.db = await this.initDatabase()
    console.debug(` ...initialized content: ${this.getServiceName()}`,'✅')
    return Promise.resolve()
  }

  private async initDatabase(): Promise<IDBPDatabase> {
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

  deleteContent(tabId: string): Promise<void> {
    return this.db.delete(this.STORE_IDENT, tabId)
  }

  getContent(tabId: string): Promise<ContentItem> {
    if (this.db) {
      return this.db.get('content', tabId)
    }
    return Promise.reject("db not ready (yet)")
  }

  getContents(): Promise<ContentItem[]> {
    return this.db.getAll(this.STORE_IDENT);
  }

  async saveContent(tabId: string, contentItem: ContentItem): Promise<any> {
    return await this.db.put(this.STORE_IDENT, contentItem, tabId)
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

  async cleanUpContent(fnc: (tabId: string) => boolean): Promise<object[]> {
    const contentObjectStore = this.db.transaction("content", "readwrite").objectStore("content");
    let contentCursor = await contentObjectStore.openCursor()
    let result: object[] = []
    while (contentCursor) {
      if (contentCursor.value.expires !== 0) {
        const exists: boolean = fnc(contentCursor.key.toString())//this.urlExistsInATabset(atob(contentCursor.key.toString()))
        if (exists) {
          const data = contentCursor.value
          data.expires = 0
          contentObjectStore.put(data, contentCursor.key)
          result.push({
            id: data.id,
            title: data.title,
            url: data.url,
            description: data.description,
            content: data.content,
            tabsets: [],
            favIconUrl: data.favIconUrl
          })
          // result.push(new SearchDoc(
          //   data.id, "", data.title, data.url, data.description, "", data.content, data.favIconUrl, []
          // ))
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
