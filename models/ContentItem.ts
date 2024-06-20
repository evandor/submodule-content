import {EXPIRE_DATA_PERIOD_IN_MINUTES} from "boot/constants";

export class ContentItem {
  created: number
  expires: number;

  constructor(
    public id: string,
    public title: string,
    public url: string,
    public content: string,
    public metas: object,
    public tabsetIds: string[]
    // content: string,
    // metas: metas,
    // tabsets:
  ) {
    this.created = new Date().getTime()
    this.expires =  new Date().getTime() + 1000 * 60 * EXPIRE_DATA_PERIOD_IN_MINUTES
  }


}
