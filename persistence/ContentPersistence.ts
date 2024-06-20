import {SearchDoc} from "src/search/models/SearchDoc";
import {ContentItem} from "src/content/models/ContentItem";

interface ContentPersistence {

  getServiceName(): string

  init(): Promise<any>

  getContent(url: string): Promise<ContentItem>

  deleteContent(url: string): Promise<void>

  saveContent(url: string, contentItem: ContentItem): Promise<any>

  cleanUpContent(fnc: (url: string) => boolean): Promise<SearchDoc[]>

  getContents(): Promise<ContentItem[]>

  compactDb(): Promise<any>

}

export default ContentPersistence;
