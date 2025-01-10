import path from "node:path"
import fs from "node:fs"
import { cac } from "cac"
import { fetchSite, serializePages } from "./fetch.ts"
import { logger } from "./logger.ts"
import { formatNumber } from "./utils.ts"
import { version } from "../package.json"

const cli = cac()

cli
  .command("[url]", "Fetch a site")
  .option("-o, --outfile <path>", "Write the fetched site to a text file")
  .option("--concurrency <number>", "Number of concurrent requests", {
    default: 3,
  })
  .option("-m, --match <pattern>", "Only fetch matched pathname")
  .option("--silent", "Do not print any logs")
  .action(async (url, flags) => {
    if (!url) {
      cli.outputHelp()
      return
    }

    if (flags.silent) {
      logger.setLevel("silent")
    }

    const pages = await fetchSite(url, {
      concurrency: flags.concurrency,
      match: flags.match,
    })

    if (pages.size === 0) {
      logger.warn("No pages found")
      return
    }

    const pagesArr = [...pages.values()]

    const totalTokenCount = pagesArr.reduce(
      (acc, page) => acc + page.tokenCount,
      0
    )

    logger.info(
      `Total token count for ${pages.size} pages: ${formatNumber(
        totalTokenCount
      )}`
    )

    if (flags.outfile) {
      const output = serializePages(
        pages,
        flags.outfile.endsWith(".json") ? "json" : "text"
      )
      fs.mkdirSync(path.dirname(flags.outfile), { recursive: true })
      fs.writeFileSync(flags.outfile, output, "utf8")
    } else {
      console.log(serializePages(pages, "text"))
    }
  })

cli.version(version)
cli.help()
cli.parse()
