import Queue from "p-queue"
import { Window } from "happy-dom"
import { Readability } from "@mozilla/readability"
import { toMarkdown } from "./to-markdown.ts"
import { logger } from "./logger.ts"
import { load } from "cheerio"
import { matchPath } from "./utils.ts"
import type { FetchSiteOptions, FetchSiteResult, Match } from "./types.ts"

export async function fetchSite(
  url: string,
  options: FetchSiteOptions
): Promise<FetchSiteResult> {
  const queue = new Queue({ concurrency: options.concurrency })

  const pages: FetchSiteResult = new Map()
  const fetched: Set<string> = new Set()

  await fetchPage(url, { pages, fetched, queue, match: options.match })

  await queue.onIdle()

  return pages
}

async function fetchPage(
  url: string,
  options: {
    pages: FetchSiteResult
    fetched: Set<string>
    queue: Queue
    match?: Match
  }
) {
  const { queue, pages, fetched } = options

  const { host, pathname } = new URL(url)

  if (fetched.has(pathname)) {
    return
  }

  logger.info(`Fetching ${url}`)

  fetched.add(pathname)

  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
  })

  if (!res.ok) {
    logger.warn(`Failed to fetch ${url}: ${res.statusText}`)
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
    logger.warn(`Redirected from ${host} to ${new URL(resUrl).host}`)
    return
  }
  const extraUrls: string[] = []

  const $ = load(await res.text())
  $("script,style,link,img,video").remove()

  const html = $.html()

  $("a").each((_, el) => {
    const href = $(el).attr("href")

    if (!href) {
      return
    }

    const thisUrl = new URL(href, url)
    if (thisUrl.host !== host) {
      return
    }

    extraUrls.push(thisUrl.href)
  })

  if (extraUrls.length > 0) {
    for (const url of extraUrls) {
      queue.add(() => fetchPage(url, options))
    }
  }

  // return if not matched
  // we don't need to extract content for this page
  if (options.match && !matchPath(pathname, options.match)) {
    logger.warn(`Skipped ${pathname} due to not matched`)
    return
  }

  const window = new Window({
    url,
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
    },
  })

  window.document.write(html)

  await window.happyDOM.waitUntilComplete()

  const article = new Readability(window.document as any).parse()

  await window.happyDOM.close()

  if (!article) {
    return
  }

  const content = toMarkdown(article.content)

  pages.set(pathname, {
    title: article.title,
    url,
    content,
  })
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
