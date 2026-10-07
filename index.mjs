// emdash-plugin-indexnow: a native EmDash plugin.
//
// Pings IndexNow (Bing, Yandex, Naver, Seznam.cz, Yep and the other participating engines) whenever an entry in a
// routable collection is published or unpublished in the CMS. Build-time integrations such as astro-indexnow only
// see pages at build time, so CMS publishes made between builds would otherwise never be submitted.
//
// Needs the INDEXNOW_KEY environment variable and the key file served from the site root (public/<key>.txt).
// Set INDEXNOW_DRY_RUN=1 to log what would be sent without sending it.
//
// Packaging follows EmDash's native plugin format: a descriptor factory (called from astro.config.mjs) plus a
// named createPlugin() export (imported by EmDash at runtime through the descriptor's `entrypoint`).

import { definePlugin } from "emdash";

import { buildSubmission, isLiveHost } from "./submission.mjs";

export { buildSubmission, isLiveHost } from "./submission.mjs";

const PLUGIN_ID = "indexnow";
const PLUGIN_VERSION = "0.1.1";
// EmDash imports createPlugin() from this specifier at runtime, so it must match the package name.
const PACKAGE_NAME = "emdash-plugin-indexnow";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

/**
 * Descriptor factory, called from astro.config.mjs. Everything returned here must be serializable.
 *
 * @param {{ siteUrl?: string, routes: Record<string, string>, related?: Record<string, string[]>, home?: { collection: string, slug: string } }} options
 */
export function indexnow(options = {}) {
	return {
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		format: "native",
		entrypoint: PACKAGE_NAME,
		options,
	};
}

async function notify(event, ctx, options) {
	const log = ctx?.log;

	const key = process.env.INDEXNOW_KEY;
	if (!key) {
		log?.warn?.("IndexNow: INDEXNOW_KEY is not set, skipping ping");
		return;
	}

	if (!options.routes || Object.keys(options.routes).length === 0) {
		log?.warn?.("IndexNow: no routes configured, skipping ping. Pass `routes` to indexnow() in astro.config.mjs");
		return;
	}

	const submission = buildSubmission(event, options.siteUrl || process.env.INDEXNOW_SITE_URL || ctx?.site?.url, options);
	if (!submission) return;

	if (process.env.INDEXNOW_DRY_RUN) {
		log?.info?.("IndexNow dry run, nothing sent", { urlList: submission.urlList });
		return;
	}

	if (process.env.NETLIFY_DEV || process.env.NODE_ENV === "development" || !isLiveHost(submission.hostname)) {
		log?.info?.("IndexNow: local development or non-live address, skipping ping", { host: submission.host });
		return;
	}

	try {
		const response = await fetch(INDEXNOW_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json; charset=utf-8" },
			body: JSON.stringify({
				host: submission.host,
				key,
				keyLocation: `${submission.origin}/${key}.txt`,
				urlList: submission.urlList,
			}),
			signal: AbortSignal.timeout(4000),
		});
		if (response.status === 200 || response.status === 202) {
			log?.info?.("IndexNow: submitted", { urlList: submission.urlList, status: response.status });
		} else {
			log?.warn?.(`IndexNow: unexpected response ${response.status}`, { urlList: submission.urlList });
		}
	} catch (error) {
		// A failed ping must never get in the way of publishing.
		log?.warn?.("IndexNow: ping failed", error);
	}
}

/** Runtime half of the plugin. EmDash imports this by name from the package entrypoint. */
export function createPlugin(options = {}) {
	const hook = {
		errorPolicy: "continue",
		handler: (event, ctx) => notify(event, ctx, options),
	};

	return definePlugin({
		id: PLUGIN_ID,
		version: PLUGIN_VERSION,
		capabilities: ["content:read"],
		hooks: {
			"content:afterPublish": hook,
			"content:afterUnpublish": hook,
		},
	});
}
