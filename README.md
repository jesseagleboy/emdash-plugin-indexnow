# emdash-plugin-indexnow

An [EmDash](https://github.com/emdash-cms/emdash) plugin that tells [IndexNow](https://www.indexnow.org/) when a page or event is published or unpublished in the CMS. Submissions go to `api.indexnow.org`, which shares them with every participating search engine (Bing, Yandex, Naver, Seznam.cz, Yep and others). Google does not take part in IndexNow, so it still needs a sitemap in Search Console.

Build-time integrations such as `astro-indexnow` only see pages when the site is built, so a publish made in the CMS between builds would never be submitted. This plugin closes that gap by hooking `content:afterPublish` and `content:afterUnpublish`.

**Status:** version 0.1.0, not yet published to npm.

## How it works

On every publish or unpublish, the plugin builds the list of public URLs that changed and sends one request to IndexNow:

- an entry in `pages` submits `/<slug>`, and the `home` entry submits `/`
- an entry in `events` submits `/events/<slug>` plus `/` and `/events`, because those pages list events

Publish and unpublish are handled identically. IndexNow has no status field, so it only learns that a URL changed and fetches it again. An unpublished page then returns a 404, which is what lets the engines drop it, so make sure the page really stops being served.

Collections other than `pages` and `events` are ignored unless you add routes (see [Options](#options)). A failed ping never blocks publishing.

## Requirements

- EmDash 1.0.1 or later
- An IndexNow key, served as a file from the root of your site
- A site that is reachable on a real domain (see [When pings are skipped](#when-pings-are-skipped))

This is a **native** EmDash plugin, so it is registered under `plugins` and runs with the site's authority. EmDash's plugin registry only distributes sandboxed plugins, which is why this package is distributed through npm instead.

## Install

```sh
npm install emdash-plugin-indexnow
```

Register it in `astro.config.mjs`:

```js
import emdash from "emdash/astro";
import { indexnowOnPublish } from "emdash-plugin-indexnow";

export default defineConfig({
	integrations: [
		emdash({
			plugins: [indexnowOnPublish()],
		}),
	],
});
```

## Set up the key

1. Generate a key of 8 to 128 characters, using letters, digits and dashes. For example: `openssl rand -hex 16`.
2. Serve a text file at `https://your-domain/<key>.txt` whose entire contents are the key. In an Astro site, that is `public/<key>.txt`.
3. Set the same key in the `INDEXNOW_KEY` environment variable for your production environment. On Netlify, the variable's scope must include **Functions**.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `INDEXNOW_KEY` | Yes | The key. Without it the plugin logs a warning and skips the ping. |
| `INDEXNOW_SITE_URL` | No | Overrides the site URL used to build submissions. |
| `INDEXNOW_DRY_RUN` | No | When set to any value, logs the URLs that would be sent and sends nothing. |

The key is deliberately read from the environment only, so it is never written into your config or your build output.

## Options

Pass options to `indexnowOnPublish()`. They must be serializable.

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `siteUrl` | `string` | EmDash's site URL | The public origin to submit, for example `https://www.example.com`. Only the origin is used. |
| `routes` | `Record<string, string>` | `{ events: "/events/:slug", pages: "/:slug" }` | Maps a collection to its public URL pattern. Replaces the defaults. |
| `related` | `Record<string, string[]>` | `{ events: ["/", "/events"] }` | Extra pages to resubmit when an entry in a collection changes. Replaces the defaults. |
| `homeSlug` | `string` | `"home"` | The `pages` entry that lives at `/`. |

For example, to cover a blog:

```js
indexnowOnPublish({
	routes: { pages: "/:slug", posts: "/blog/:slug" },
	related: { posts: ["/", "/blog"] },
});
```

### Which site URL is used

The plugin uses the first of these that is set: the `siteUrl` option, then `INDEXNOW_SITE_URL`, then the site URL EmDash passes to plugins. Per the EmDash 1.2.0 release notes, the `siteUrl` you set on `emdash({ siteUrl })` is what plugins receive from that version on. On earlier versions the value can be a stale one stored at first setup, so passing the `siteUrl` option here is the reliable fix:

```js
const siteUrl =
	process.env.CONTEXT === "production" ? "https://www.example.com" : "http://localhost:4321";

emdash({
	siteUrl,
	plugins: [indexnowOnPublish({ siteUrl })],
});
```

## When pings are skipped

The plugin logs an info line and sends nothing when any of these is true, so local work and previews never ping IndexNow:

- `NETLIFY_DEV` is set, or `NODE_ENV` is `development`
- the site host is `localhost`, `127.0.0.1`, `[::1]`, or ends in `.local` or `.netlify.app`

Be aware that a local production build (for example `netlify build`) can run with the production URL and send real pings.

## Verify it works

Publish or unpublish a page, then look in your function logs for `IndexNow: submitted` followed by the URLs and a status of 200 or 202. Bing Webmaster Tools also lists accepted URLs under IndexNow, labeled as submitted by you.

## Development

```sh
npm test
```

The URL building and host checks live in `submission.mjs` and have no EmDash dependency, so the tests run on their own with `node --test`.

## License

[MIT](./LICENSE)
