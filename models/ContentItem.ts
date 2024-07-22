export class ContentItem {
  created: number

  constructor(
    public id: string,
    public title: string,
    public url: string,
    public content: string,
    public metas: object,
    public tabsetIds: string[]
  ) {
    this.created = new Date().getTime()
  }


}
