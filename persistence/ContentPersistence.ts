import {SearchDoc} from "src/search/models/SearchDoc";

interface ContentPersistence {

  getServiceName(): string

  init(): Promise<any>

  getContent(url: string):Promise<object>
  deleteContent(url: string):Promise<void>
  saveContent(url: string, text: string, metas: object, title: string, tabsetIds: string[]):Promise<any>
  cleanUpContent(fnc: (url: string) => boolean): Promise<SearchDoc[]>
  getContents(): Promise<any[]>

  compactDb(): Promise<any>

}

export default ContentPersistence;
