import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSubmission, isLiveHost } from "../submission.mjs";

const SITE = "https://www.example.com";

test("an event submits its own page plus the pages that list events", () => {
	const result = buildSubmission({ collection: "events", content: { slug: "happy-hour" } }, SITE);

	assert.deepEqual(result.urlList, [
		"https://www.example.com/events/happy-hour",
		"https://www.example.com/",
		"https://www.example.com/events",
	]);
	assert.equal(result.origin, SITE);
	assert.equal(result.host, "www.example.com");
	assert.equal(result.hostname, "www.example.com");
});

test("a page submits only its own URL", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "about" } }, SITE);

	assert.deepEqual(result.urlList, ["https://www.example.com/about"]);
});

test("the home entry in pages maps to the site root", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "home" } }, SITE);

	assert.deepEqual(result.urlList, ["https://www.example.com/"]);
});

test("a collection without a route is ignored", () => {
	assert.equal(buildSubmission({ collection: "posts", content: { slug: "hello" } }, SITE), null);
});

test("an entry without a slug, or a missing site URL, is ignored", () => {
	assert.equal(buildSubmission({ collection: "pages", content: {} }, SITE), null);
	assert.equal(buildSubmission({ collection: "pages", content: { slug: "about" } }, undefined), null);
	assert.equal(buildSubmission(undefined, SITE), null);
});

test("an invalid site URL is ignored instead of throwing", () => {
	assert.equal(buildSubmission({ collection: "pages", content: { slug: "about" } }, "not a url"), null);
});

test("only the origin of the site URL is used", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "about" } }, "https://www.example.com/some/path?x=1");

	assert.deepEqual(result.urlList, ["https://www.example.com/about"]);
});

test("custom routes, related pages and home slug override the defaults", () => {
	const options = {
		routes: { posts: "/blog/:slug", pages: "/:slug" },
		related: { posts: ["/blog"] },
		homeSlug: "index",
	};

	assert.deepEqual(buildSubmission({ collection: "posts", content: { slug: "hello" } }, SITE, options).urlList, [
		"https://www.example.com/blog/hello",
		"https://www.example.com/blog",
	]);
	assert.deepEqual(buildSubmission({ collection: "pages", content: { slug: "index" } }, SITE, options).urlList, [
		"https://www.example.com/",
	]);
	assert.equal(buildSubmission({ collection: "events", content: { slug: "x" } }, SITE, options), null);
});

test("duplicate URLs are removed", () => {
	const result = buildSubmission({ collection: "pages", content: { slug: "about" } }, SITE, {
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
