import {defineStore} from 'pinia';
import {ref, watchEffect} from "vue";

import * as cheerio from 'cheerio';
import {CheerioAPI} from 'cheerio';
import {TabReference, TabReferenceType} from "src/content/models/TabReference";
import {uid} from "quasar";
import {Readability} from '@mozilla/readability'
import {useUtils} from "src/core/services/Utils";

const { sanitizeAsHtml } = useUtils();

export const useContentStore = defineStore('content', () => {

  const currentTabContent = ref<string>('')
  const currentTabArticle = ref<object | undefined>(undefined)
  const currentTabReferences = ref<TabReference[]>([])

  watchEffect(() => {
    currentTabReferences.value = []
    if (currentTabContent.value.trim().length > 0) {
      const $ = cheerio.load(currentTabContent.value)
      checkLinks($);
      checkMeta($);
      checkScripts($);

      const sanitized = sanitizeAsHtml(currentTabContent.value)
      const parser = new DOMParser();
      const reader = new Readability(parser.parseFromString(sanitized, "text/html"))
      const article = reader.parse()
      console.log("article:", article)
      article?.title ? currentTabArticle.value = article : currentTabArticle.value = undefined

    }
  })

  const checkLinks = ($: CheerioAPI) => {
    for (const elem of $('link')) {
      const rel = $(elem).attr("rel")
      const type = $(elem).attr("type")
      const title = $(elem).attr("title")
      const href = $(elem).attr("href")
      if (rel && rel === "alternate" && type && type === "application/rss+xml" && href) {
        currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.RSS, title || 'no title', [], href))
        console.log("Found TabReference", currentTabReferences.value)
      }
    }
  }

  const checkMeta = ($: CheerioAPI) => {
    const openGraphRefs: object[] = []
    const metadataRefs: object[] = []

    function addFromMeta(identifier: string, name: string | undefined | string, content: string | undefined) {
      if (name && name === identifier && content) {
        metadataRefs.push({name, content})
        console.log("Found TabReference for meta data", name, content)
      }
    }

    for (const elem of $('meta')) {
      const name = $(elem).attr("name")
      const property = $(elem).attr("property")
      const content = $(elem).attr("content")
      if (property && property.startsWith("og:") && content) {
        openGraphRefs.push({property, content})
        console.log("Found TabReference for OpenGraph", property, content)
      }
      addFromMeta("copyright", name, content)
      addFromMeta("email", name, content)
      addFromMeta("author", name, content)
      addFromMeta("date", name, content)
      addFromMeta("last-modified", name, content)
      addFromMeta("locale", name, content)
      addFromMeta("description", name, content)
    }
    currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.OPEN_GRAPH, "Open Graph", openGraphRefs))
    currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.META_DATA, "Meta Data", metadataRefs))

  }

  const checkScripts = ($: CheerioAPI) => {
    for (const elem of $('script')) {
      const type = $(elem).attr("type")
      if (type && type === "application/ld+json") {
        try {
          const text = $(elem).contents().first().text()
          console.log("got", text)
          const asJSON = JSON.parse(text)
          currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.LINKING_DATA, 'Linking Data', asJSON))
          console.log("Found TabReference", currentTabReferences.value)
        } catch (err) {
          console.warn("could not parse linking data", err)
        }
      }
    }
  }

  return {
    currentTabArticle,
    currentTabContent,
    currentTabReferences
  }
})
