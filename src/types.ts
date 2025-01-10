export type FetchSiteOptions = {
  /** How many requests can be made at the same time */
  concurrency?: number

  /**
   * Match pathname by specific patterns, powered by micromatch
   * Only pages matched by this will be fetched
   */
  match?: string[]
}

export type Page = {
  title: string
  url: string
  content: string
}

export type FetchSiteResult = Map<string, Page>
