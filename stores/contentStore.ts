import {defineStore} from 'pinia';
import {computed, ref, watchEffect} from "vue";

import * as cheerio from 'cheerio';
import {CheerioAPI} from 'cheerio';
import {TabReference, TabReferenceType} from "src/content/models/TabReference";
import {uid} from "quasar";
import {Readability} from '@mozilla/readability'
import {useTabsetsStore} from "src/tabsets/stores/tabsetsStore";
import {TabAndTabsetId} from "src/tabsets/models/TabAndTabsetId";

/**
 * this content store is meant to track transient state of the currently opened tab.
 *
 * Once the current content of a tab is set by calling setCurrentTabContent, the content
 * will be analysed.
 */
export const useContentStore = defineStore('content', () => {

  const currentTabContent = ref<string>('')
  const currentTabUrl = ref<string | undefined>(undefined)
  const currentTabArticle = ref<object | undefined>(undefined)
  const currentTabReferences = ref<TabReference[]>([])

  const setCurrentTabContent = (content: string | undefined) => {
    content ? currentTabContent.value = content : ''
  }

  const setCurrentTabUrl = (url: string | undefined) => {
    currentTabUrl.value = url
  }

  watchEffect(async () => {
    currentTabReferences.value = []
    if (currentTabContent.value.trim().length > 0) {
      console.debug("updating content store...")
      const $ = cheerio.load(currentTabContent.value)
      checkLinks($);
      checkMeta($);
      checkScripts($);

      //const sanitized = sanitizeAsHtml(currentTabContent.value)
      const parser = new DOMParser();
      const reader = new Readability(parser.parseFromString(currentTabContent.value, "text/html"))
      const article = reader.parse()
      //console.log("article:", article)
      article?.title ? currentTabArticle.value = article : currentTabArticle.value = undefined
      if (currentTabUrl.value && currentTabUrl.value.indexOf("://") >= 0) { // TODO can this be outdated?
        const anchorSplit = currentTabUrl.value.split("#")
        if (anchorSplit.length === 2) {
          currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.ANCHOR, anchorSplit[1], [], currentTabUrl.value))
        }
        const protocol = currentTabUrl.value.split("://")[0]
        const pathSplit = currentTabUrl.value.split("://")[1].split("/").filter(p => p.trim() !== '')
        const parentChainData = []
        var initialLength = pathSplit.length
        for (var i = 0; i < initialLength; i++) {
          // console.log("checking", i, pathSplit.length, pathSplit.join("/"))
          try {
            const theURL = new URL(protocol + "://" + pathSplit.join("/"))
            // console.log("fetchging", theURL.toString())
            const res = await fetch(theURL.toString(), {method: "HEAD"})
            const headers: any[] = []
            res.headers.forEach((value, key, p) => {
              headers.push({[key]: value});
            })
            const responseAsJson = JSON.parse(JSON.stringify({
              ok: res.ok,
              headers: headers,
              redirected: res.redirected,
              status: res.status,
              type: res.type
            }))
            // console.log("got", responseAsJson)
            if (res.ok) {
              parentChainData.push({
                "originalURL": currentTabUrl.value,
                "parent": theURL.toString(),
                level: initialLength - i,
                response: responseAsJson,
              })
            }
          } catch (err) {
            console.warn("===>", err)
          }
          pathSplit.pop()
        }
        if (parentChainData.length > 0) {
          currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.PARENT_CHAIN, "Parent Chain for " + currentTabUrl.value,
            parentChainData, currentTabUrl.value))
        }

        // update existing tabs with this url
        useTabsetsStore().tabsForUrl(currentTabUrl.value).forEach((tabAndTsId: TabAndTabsetId) => {
          const ts = useTabsetsStore().getTabset(tabAndTsId.tabsetId)
          if (ts) {
            console.log(`setting tabReferences for tab url '${tabAndTsId.tab.url}' to ${JSON.stringify(currentTabReferences.value)}`)
            tabAndTsId.tab.tabReferences = currentTabReferences.value
            useTabsetsStore().saveTabset(ts)
          }
        })
      }
    }
  })

  const checkLinks = ($: CheerioAPI) => {
    for (const elem of $('link')) {
      const rel = $(elem).attr("rel")
      const type = $(elem).attr("type")
      const title = $(elem).attr("title")
      const href = $(elem).attr("href")
      if (rel && rel === "alternate" && type && (type === "application/rss+xml" || type === "application/atom+xml") && href) {
        let useHref = href
        if (href.startsWith("/")) {
          try {
            const theURL = new URL(currentTabUrl.value || '')
            useHref = theURL.protocol + "//" + theURL.hostname + href
          } catch(e) {}
        }
        currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.RSS, title || 'no title', [], useHref))
        //console.log("Found TabReference", currentTabReferences.value)
      }
      if (rel && rel === "search" && type && type === "application/opensearchdescription+xml" && href && currentTabUrl.value) {
        try {
          const theURL = new URL(currentTabUrl.value)
          const useUrl = href.startsWith("http://") || href.startsWith("https://") ? href : theURL.protocol + "//" + theURL.host + href
          console.log("analyse application/opensearchdescription+xml link: ", href, useUrl)
          fetch(useUrl)
            .then(res => res.text())
            .then((text: string) => {
              console.log("found text", text)
              currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.OPEN_SEARCH, "opensearch", [{xml: text}], href))
              console.log("Found TabReference", currentTabReferences.value)
            })
        } catch (err) {
          console.log("not able to create opensearch tabReference for", currentTabUrl.value)
        }

      }
    }
  }

  const checkMeta = ($: CheerioAPI) => {
    const openGraphRefs: object[] = []
    const metadataRefs: object[] = []

    function addFromMeta(identifier: string, name: string | undefined | string, content: string | undefined) {
      if (name && name === identifier && content) {
        metadataRefs.push({name, content})
        //console.log("Found TabReference for meta data", name, content)
      }
    }

    for (const elem of $('meta')) {
      const name = $(elem).attr("name")
      const property = $(elem).attr("property")
      const content = $(elem).attr("content")
      if (property && property.startsWith("og:") && content) {
        openGraphRefs.push({property, content})
        // console.log("Found TabReference for OpenGraph", property, content)
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
          // console.log("got", text)
          const asJSON = JSON.parse(text)
          currentTabReferences.value.push(new TabReference(uid(), TabReferenceType.LINKING_DATA, 'Linking Data', asJSON))
          //console.log("Found TabReference", currentTabReferences.value)
        } catch (err) {
          console.warn("could not parse linking data", err)
        }
      }
    }
  }

  const resetCurrentTabArticle = () => currentTabArticle.value = undefined

  const getCurrentTabUrl = computed((): string | undefined => {
    return currentTabUrl.value
  })

  const getCurrentTabContent = computed((): string | undefined => {
    return currentTabContent.value
  })

  return {
    currentTabArticle,
    resetCurrentTabArticle,
    setCurrentTabContent,
    getCurrentTabContent,
    setCurrentTabUrl,
    getCurrentTabUrl,
    currentTabReferences
  }
})
