import path from "node:path"
import fs from "node:fs"
import { cac } from "cac"
import { fetchSite } from "./fetch"
import { logger } from "./logger"
import { formatNumber } from "./utils"
import { version } from "../package.json"

const cli = cac()

cli
  .command("[url]", "Fetch a site")
  .option("-o, --outfile <path>", "Write the fetched site to a text file")
  .option("--concurrency <number>", "Number of concurrent requests", {
    default: 3,
  })
  .option("--silent", "Do not print any logs")
  .action(async (url, flags) => {
    if (!url) {
      cli.outputHelp()
      return
    }

    if (flags.silent) {
      logger.setLevel("silent")
    }

    const pages = await fetchSite(url, { concurrency: flags.concurrency })

    if (pages.size === 0) {
      logger.warn("No pages found")
      return
    }

    const pagesArr = [...pages.values()]

    const totalTokenCount = pagesArr.reduce(
      (acc, page) => acc + page.tokenCount,
      0
    )

    logger.info(`Total token count: ${formatNumber(totalTokenCount)}`)

    const text = pagesArr
      .map((page) =>
        `<page>
<title>${page.title}</title>
<url>${page.url}</url>
<content>${page.content}</content>
</page>`.trim()
      )
      .join("\n\n")

    if (flags.outfile) {
      fs.mkdirSync(path.dirname(flags.outfile), { recursive: true })
      fs.writeFileSync(flags.outfile, text, "utf8")
    } else {
      console.log(text)
    }
  })

cli.version(version)
cli.help()
cli.parse()
