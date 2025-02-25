import path from "node:path"
import fs from "node:fs/promises"
import { createWriteStream, WriteStream } from "node:fs"
import { cac } from "cac"
import { encode } from "gpt-tokenizer/model/gpt-4o"
import { fetchSite, serializePages } from "./index.ts"
import { logger } from "./logger.ts"
import { ensureArray, formatNumber } from "./utils.ts"
import { version } from "../package.json"

const cli = cac("sitefetch")

cli
  .command("[url]", "Fetch a site")
  .option("-o, --outfile <path>", "Write the fetched site to a text file")
  .option("--concurrency <number>", "Number of concurrent requests", {
    default: 3,
  })
  .option("-m, --match <pattern>", "Only fetch matched pages")
  .option("--content-selector <selector>", "The CSS selector to find content")
  .option("--limit <limit>", "Limit the result to this amount of pages")
  .option("--silent", "Do not print any logs")
  .option("--stream", "Stream pages to file instead of keeping in memory")
  .option("--max-memory <mb>", "Maximum memory usage in MB before warning", {
    default: 1024,
  })
  .action(async (url, flags) => {
    if (!url) {
      cli.outputHelp()
      return
    }

    if (flags.silent) {
      logger.setLevel("silent")
    }

    // Enable garbage collection if available
    if (flags.stream && (global as any).gc) {
      (global as any).gc()
    }

    let tokenCount = 0
    let pageCount = 0
    let writeStream: WriteStream | undefined

    if (flags.stream && flags.outfile) {
      await fs.mkdir(path.dirname(flags.outfile), { recursive: true })
      writeStream = createWriteStream(flags.outfile, { encoding: 'utf8' })
      
      // Write header for JSON format
      if (flags.outfile.endsWith('.json')) {
        writeStream.write('[\n')
      }
    }

    const pages = await fetchSite(url, {
      concurrency: flags.concurrency,
      match: flags.match && ensureArray(flags.match),
      contentSelector: flags.contentSelector,
      limit: flags.limit,
      maxMemoryMB: flags.maxMemory,
      onPage: flags.stream ? (page) => {
        pageCount++
        const tokens = encode(page.content).length
        tokenCount += tokens

        if (writeStream) {
          const isJson = flags.outfile?.endsWith('.json')
          const output = isJson
            ? JSON.stringify(page) + (pageCount > 1 ? ',' : '') + '\n'
            : `<page>
  <title>${page.title}</title>
  <url>${page.url}</url>
  <content>${page.content}</content>
</page>\n\n`
          
          writeStream.write(output)
        } else {
          // Print to stdout in streaming mode
          console.log(`<page>
  <title>${page.title}</title>
  <url>${page.url}</url>
  <content>${page.content}</content>
</page>\n`)
        }
      } : undefined
    })

    if (writeStream) {
      // Write footer for JSON format
      if (flags.outfile?.endsWith('.json')) {
        writeStream.write(']')
      }
      writeStream.end()
      await new Promise<void>((resolve) => writeStream?.on('finish', () => resolve()))
    }

    if (!flags.stream) {
      if (pages.size === 0) {
        logger.warn("No pages found")
        return
      }

      const pagesArr = [...pages.values()]
      tokenCount = pagesArr.reduce(
        (acc, page) => acc + encode(page.content).length,
        0
      )
      pageCount = pages.size

      if (flags.outfile) {
        const output = serializePages(
          pages,
          flags.outfile.endsWith(".json") ? "json" : "text"
        )
        await fs.writeFile(flags.outfile, output, "utf8")
      } else {
        console.log(serializePages(pages, "text"))
      }
    }

    logger.info(
      `Total token count for ${pageCount} pages: ${formatNumber(tokenCount)}`
    )
  })

cli.version(version)
cli.help()
cli.parse()
