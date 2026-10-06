// Pure helpers for building IndexNow submissions. Nothing here imports EmDash, so they can be tested on their own.

// Collection -> public URL pattern. Matches EmDash's default routes for the `pages` and `events` collections.
export const DEFAULT_ROUTES = {
	events: "/events/:slug",
	pages: "/:slug",
};

// Pages that list a collection's entries, so they change whenever one of its entries does.
export const DEFAULT_RELATED = {
	events: ["/", "/events"],
};

// The home page is the "home" entry in the pages collection but lives at "/".
export const DEFAULT_HOME_SLUG = "home";

/**
 * Work out which URLs to submit for an entry. Returns null when the entry is not one this plugin handles.
 *
 * @param {{ collection?: string, content?: { slug?: string } }} event The EmDash publish or unpublish event.
 * @param {string} siteUrl The public site URL. Only its origin is used.
 * @param {{ routes?: Record<string, string>, related?: Record<string, string[]>, homeSlug?: string }} [options]
 */
export function buildSubmission(event, siteUrl, options = {}) {
	const routes = options.routes ?? DEFAULT_ROUTES;
	const related = options.related ?? DEFAULT_RELATED;
	const homeSlug = options.homeSlug ?? DEFAULT_HOME_SLUG;

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

	const ownPath = collection === "pages" && slug === homeSlug ? "/" : route.replace(":slug", slug);
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
