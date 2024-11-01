export enum TabReferenceType {
  RSS = "RSS",
  OPEN_GRAPH = "OPEN_GRAPH",
  META_DATA = "META_DATA",
  LINKING_DATA = "LINKING_DATA",
  ORIGINAL_URL = "ORIGINAL_URL"
}

export enum TabReferenceStatus {
  NEW = "NEW",
  IGNORED = "IGNORED",
  APPLIED = "APPLIED"
}

export class TabReference {

  constructor(
    public id: string,
    public type: TabReferenceType,
    public title: string,
    public data: object[] = [],
    public href?: string,
    public status: TabReferenceStatus = TabReferenceStatus.NEW
  ) {
  }
}