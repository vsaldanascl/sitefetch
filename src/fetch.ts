import Queue from "p-queue"
import { Window } from "happy-dom"
import { Readability } from "@mozilla/readability"
import { encode } from "gpt-tokenizer/model/gpt-4o"
import { toMarkdown } from "./to-markdown"
import { logger } from "./logger"

type Page = {
  title: string
  url: string
  content: string
  tokenCount: number
}

export async function fetchSite(url: string, options: { concurrency: number }) {
  const queue = new Queue({ concurrency: options.concurrency })

  const pages: Map<string, Page> = new Map()
  const fetched: Set<string> = new Set()

  await fetchPage(url, { pages, fetched, queue })

  await queue.onIdle()

  return pages
}

export async function fetchPage(
  url: string,
  options: { pages: Map<string, Page>; fetched: Set<string>; queue: Queue }
) {
  const { queue, pages, fetched } = options

  const { host, pathname } = new URL(url)

  if (fetched.has(pathname)) {
    return
  }

  logger.info(`Fetching ${url}`)

  fetched.add(pathname)

  const res = await fetch(url)

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
    logger.warn(`Redirected to other site: ${url}`)
    return
  }

  const html = await res.text()
  const window = new Window({
    url,
  })

  window.document.write(html)

  const extraUrls: string[] = []

  window.document.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href")
    if (!href) {
      return
    }

    const thisUrl = new URL(href, url)
    if (thisUrl.host !== host) {
      return
    }

    extraUrls.push(thisUrl.href)
  })

  const article = new Readability(window.document as any).parse()

  await window.happyDOM.close()

  if (extraUrls.length > 0) {
    for (const url of extraUrls) {
      queue.add(() => fetchPage(url, options))
    }
  }

  if (!article) {
    return
  }

  const content = toMarkdown(article.content)

  const tokenCount = encode(content).length

  pages.set(pathname, {
    title: article.title,
    url,
    content,
    tokenCount,
  })
}
