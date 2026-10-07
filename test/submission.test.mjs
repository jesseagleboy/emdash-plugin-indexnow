import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSubmission, isLiveHost } from "../submission.mjs";

const SITE = "https://www.example.com";

const OPTIONS = {
	routes: { posts: "/posts/:slug", pages: "/:slug" },
	related: { posts: ["/", "/posts"] },
	home: { collection: "pages", slug: "home" },
};

test("an entry submits its own page plus the pages listed under related", () => {
	const result = buildSubmission({ collection: "posts", content: { slug: "hello" } }, SITE, OPTIONS);

	assert.deepEqual(result.urlList, [
		"https://www.example.com/posts/hello",
		"https://www.example.com/",
		"https://www.example.com/posts",
	]);
	assert.equal(result.origin, SITE);
	assert.equal(result.host, "www.example.com");
	assert.equal(result.hostname, "www.example.com");
});

test("a collection with no related pages submits only its own URL", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "about" } }, SITE, OPTIONS);

	assert.deepEqual(result.urlList, ["https://www.example.com/about"]);
});

test("the configured home entry maps to the site root", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "home" } }, SITE, OPTIONS);

	assert.deepEqual(result.urlList, ["https://www.example.com/"]);
});

test("a slug that matches the home slug in another collection is not the home page", () => {
	const result = buildSubmission({ collection: "posts", content: { slug: "home" } }, SITE, OPTIONS);

	assert.equal(result.urlList[0], "https://www.example.com/posts/home");
});

test("without a home option, no entry is treated as the home page", () => {
	const options = { routes: OPTIONS.routes };
	const result = buildSubmission({ collection: "pages", content: { slug: "home" } }, SITE, options);

	assert.deepEqual(result.urlList, ["https://www.example.com/home"]);
});

test("nothing is submitted when no routes are configured", () => {
	assert.equal(buildSubmission({ collection: "pages", content: { slug: "about" } }, SITE), null);
	assert.equal(buildSubmission({ collection: "pages", content: { slug: "about" } }, SITE, {}), null);
});

test("a collection without a route is ignored", () => {
	assert.equal(buildSubmission({ collection: "events", content: { slug: "happy-hour" } }, SITE, OPTIONS), null);
});

test("an entry without a slug, or a missing site URL, is ignored", () => {
	assert.equal(buildSubmission({ collection: "pages", content: {} }, SITE, OPTIONS), null);
	assert.equal(buildSubmission({ collection: "pages", content: { slug: "about" } }, undefined, OPTIONS), null);
	assert.equal(buildSubmission(undefined, SITE, OPTIONS), null);
});

test("an invalid site URL is ignored instead of throwing", () => {
	assert.equal(buildSubmission({ collection: "pages", content: { slug: "about" } }, "not a url", OPTIONS), null);
});

test("only the origin of the site URL is used", () => {
	const result = buildSubmission(
		{ collection: "pages", content: { slug: "about" } },
		"https://www.example.com/some/path?x=1",
		OPTIONS,
	);

	assert.deepEqual(result.urlList, ["https://www.example.com/about"]);
});

test("any collection name and URL pattern can be configured", () => {
	const options = {
		routes: { events: "/whats-on/:slug" },
		related: { events: ["/whats-on"] },
	};
	const result = buildSubmission({ collection: "events", content: { slug: "happy-hour" } }, SITE, options);

	assert.deepEqual(result.urlList, ["https://www.example.com/whats-on/happy-hour", "https://www.example.com/whats-on"]);
});

test("duplicate URLs are removed", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "about" } }, SITE, {
		routes: OPTIONS.routes,
		related: { pages: ["/about", "/"] },
	});

	assert.deepEqual(result.urlList, ["https://www.example.com/about", "https://www.example.com/"]);
});

test("local and preview hosts are not live", () => {
	for (const hostname of ["localhost", "127.0.0.1", "[::1]", "printer.local", "my-site.netlify.app"]) {
		assert.equal(isLiveHost(hostname), false, hostname);
	}
});

test("real domains are live, including lookalikes of the preview suffix", () => {
	for (const hostname of ["www.example.com", "example.com", "notnetlify.app", "netlify.app.example.com"]) {
		assert.equal(isLiveHost(hostname), true, hostname);
	}
});
