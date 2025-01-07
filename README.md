# sitefetch

Fetch an entire site and save it as a text file (to be used with AI models).

## Install

One-off usage (choose one of the followings):

```bash
bunx sitefetch
npx sitefetch
pnpm sitefetch
```

Install globally (choose one of the followings):

```bash
bun i -g sitefetch
npm i -g sitefetch
pnpm i -g sitefetch
```

## Usage

```bash
sitefetch https://egoist.dev -o site.txt

# or better concurrency
sitefetch https://egoist.dev -o site.txt --concurrency 10
```

## License

MIT.
