// Pure helpers for building IndexNow submissions. Nothing here imports EmDash, so they can be tested on their own.

// The plugin has no built-in knowledge of any site's collections or URLs: EmDash sites define their own public
// routes, so everything here is driven by the options the site passes in.

/**
 * Work out which URLs to submit for an entry. Returns null when the entry is not one this plugin handles.
 *
 * Options:
 * - routes: collection slug -> public URL pattern, where `:slug` is replaced by the entry's slug. A collection
 *   without a route is ignored.
 * - related: collection slug -> other paths to resubmit when an entry in it changes (listing pages, say).
 * - home: the one entry that lives at "/" instead of its collection's pattern, as { collection, slug }.
 *
 * @param {{ collection?: string, content?: { slug?: string } }} event The EmDash publish or unpublish event.
 * @param {string} siteUrl The public site URL. Only its origin is used.
 * @param {{ routes?: Record<string, string>, related?: Record<string, string[]>, home?: { collection: string, slug: string } }} [options]
 */
export function buildSubmission(event, siteUrl, options = {}) {
	const routes = options.routes ?? {};
	const related = options.related ?? {};
	const home = options.home;

	const collection = event?.collection;
	const slug = event?.content?.slug;
	const route = routes[collection];
	if (!route || !slug || !siteUrl) return null;

	let origin;
	try {
		origin = new URL(siteUrl).origin;
	} catch {
		return null;
	}

	const isHome = home?.collection === collection && home?.slug === slug;
	const ownPath = isHome ? "/" : route.replace(":slug", slug);
	const paths = [ownPath, ...(related[collection] ?? [])];
	const urlList = [...new Set(paths.map((path) => new URL(path, origin).toString()))];

	const { host, hostname } = new URL(origin);
	return { origin, host, hostname, urlList };
}

/** Local development and Netlify preview addresses should never ping IndexNow. */
export function isLiveHost(hostname) {
	return !(
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]" ||
		hostname.endsWith(".local") ||
		hostname.endsWith(".netlify.app")
	);
}
