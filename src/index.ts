import Queue from "p-queue"
import { Window } from "happy-dom"
import { Readability } from "@mozilla/readability"
import c from "picocolors"
import { toMarkdown } from "./to-markdown.ts"
import { logger } from "./logger.ts"
import { load } from "cheerio"
import { matchPath } from "./utils.ts"
import type { Options, FetchSiteResult } from "./types.ts"

export async function fetchSite(
  url: string,
  options: Options & {
    onPage?: (page: { title: string; url: string; content: string }) => void;
    maxMemoryMB?: number;
  }
): Promise<FetchSiteResult> {
  const fetcher = new Fetcher(options)
  
  // Monitor memory usage
  let memoryMonitor: NodeJS.Timer | undefined
  if (options.maxMemoryMB) {
    memoryMonitor = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const usedMemoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      if (usedMemoryMB > options.maxMemoryMB!) {
        logger.warn(`Memory limit reached (${usedMemoryMB}MB/${options.maxMemoryMB}MB). Consider:
1. Reducing concurrency (--concurrency)
2. Using streaming mode (-s, --stream)
3. Increasing memory limit (--max-memory)`)
      }
    }, 1000);
  }

  try {
    return await fetcher.fetchSite(url)
  } finally {
    if (memoryMonitor) {
      clearInterval(memoryMonitor)
    }
  }
}

class Fetcher {
  #pages: FetchSiteResult = new Map()
  #fetched: Set<string> = new Set()
  #queue: Queue
  #streamMode: boolean

  constructor(public options: Options & { onPage?: (page: { title: string; url: string; content: string }) => void }) {
    const concurrency = options.concurrency || 3
    this.#queue = new Queue({ concurrency })
    this.#streamMode = Boolean(options.onPage)
    
    // Clear memory periodically in stream mode
    if (this.#streamMode) {
      setInterval(() => {
        if (global.gc) {
          global.gc()
        }
      }, 5000)
    }
  }

  #limitReached() {
    return this.options.limit && this.#pages.size >= this.options.limit
  }

  #getContentSelector(pathname: string) {
    if (typeof this.options.contentSelector === "function")
      return this.options.contentSelector({ pathname })

    return this.options.contentSelector
  }

  async fetchSite(url: string) {
    logger.info(
      `Started fetching ${c.green(url)} with a concurrency of ${
        this.#queue.concurrency
      }`
    )

    await this.#fetchPage(url, {
      skipMatch: true,
    })

    await this.#queue.onIdle()

    return this.#pages
  }

  async #fetchPage(
    url: string,
    options: {
      skipMatch?: boolean
    }
  ) {
    const { host, pathname } = new URL(url)

    if (this.#fetched.has(pathname) || this.#limitReached()) {
      return
    }

    this.#fetched.add(pathname)

    // return if not matched
    // we don't need to extract content for this page
    if (
      !options.skipMatch &&
      this.options.match &&
      !matchPath(pathname, this.options.match)
    ) {
      return
    }

    logger.info(`Fetching ${c.green(url)}`)

    const res = await (this.options.fetch || fetch)(url, {
      headers: {
        "user-agent": "Sitefetch (https://github.com/egoist/sitefetch)",
      },
    })

    if (!res.ok) {
      logger.warn(`Failed to fetch ${url}: ${res.statusText}`)
      return
    }

    if (this.#limitReached()) {
      return
    }

    const contentType = res.headers.get("content-type")

    if (!contentType?.includes("text/html")) {
      logger.warn(`Not a HTML page: ${url}`)
      return
    }

    const resUrl = new URL(res.url)

    // redirected to other site, ignore
    if (resUrl.host !== host) {
      logger.warn(`Redirected from ${host} to ${resUrl.host}`)
      return
    }
    const extraUrls: string[] = []

    const $ = load(await res.text())
    $("script,style,link,img,video").remove()

    $("a").each((_, el) => {
      const href = $(el).attr("href")

      if (!href) {
        return
      }

      try {
        const thisUrl = new URL(href, url)
        if (thisUrl.host !== host) {
          return
        }

        extraUrls.push(thisUrl.href)
      } catch {
        logger.warn(`Failed to parse URL: ${href}`)
      }
    })

    if (extraUrls.length > 0) {
      for (const url of extraUrls) {
        this.#queue.add(() =>
          this.#fetchPage(url, { ...options, skipMatch: false })
        )
      }
    }

    const window = new Window({
      url,
      settings: {
        disableJavaScriptFileLoading: true,
        disableJavaScriptEvaluation: true,
        disableCSSFileLoading: true,
      },
    })

    const pageTitle = $("title").text()
    const contentSelector = this.#getContentSelector(pathname)
    const html = contentSelector
      ? $(contentSelector).prop("outerHTML")
      : $.html()

    if (!html) {
      logger.warn(`No readable content on ${pathname}`)
      return
    }

    window.document.write(html)

    await window.happyDOM.waitUntilComplete()

    const article = new Readability(window.document as any).parse()

    await window.happyDOM.close()

    if (!article) {
      return
    }

    const content = toMarkdown(article.content)

    const page = {
      title: article.title || pageTitle,
      url,
      content,
    }

    if (this.#streamMode) {
      this.options.onPage?.(page)
    } else {
      this.#pages.set(pathname, page)
    }

    // Clear some objects to help GC
    window.document.body.innerHTML = ''
    $('*').removeAttr('class').removeAttr('id')
  }
}

export function serializePages(
  pages: FetchSiteResult,
  format: "json" | "text"
): string {
  if (format === "json") {
    return JSON.stringify([...pages.values()])
  }

  return [...pages.values()]
    .map((page) =>
      `<page>
  <title>${page.title}</title>
  <url>${page.url}</url>
  <content>${page.content}</content>
</page>`.trim()
    )
    .join("\n\n")
}
