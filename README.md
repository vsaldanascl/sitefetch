# sitefetch

Fetch an entire site and save it as a text file (to be used with AI models).

![image](https://github.com/user-attachments/assets/e6877428-0e1c-444a-b7af-2fb21ded8814)


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

## Plug

If you like this, please check out my LLM chat app: https://chatwise.app

## License

MIT.
