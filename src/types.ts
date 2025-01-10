export type Match = string | string[]

export type FetchSiteOptions = {
  /** How many requests can be made at the same time */
  concurrency?: number
  /** Match pathname by specific patterns, powered by micromatch */
  match?: Match
}

export type Page = {
  title: string
  url: string
  content: string
}

export type FetchSiteResult = Map<string, Page>
