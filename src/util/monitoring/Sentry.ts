/*
	SilentComms error tracking (Sentry).

	No-ops entirely if SENTRY_DSN isn't set, so the server runs fine without it.
	Create a project at https://sugar-cube.sentry.io (or your own org), grab
	its DSN, and set SENTRY_DSN in .env to activate.
*/

import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentry() {
	const dsn = process.env.SENTRY_DSN;
	if (!dsn) {
		console.warn("[Sentry] SENTRY_DSN not set — error tracking disabled.");
		return;
	}

	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || "development",
		tracesSampleRate: 0.1,
		// Don't leak DB connection strings, tokens, etc. via captured request data.
		beforeSend(event) {
			if (event.request?.headers) {
				delete event.request.headers["authorization"];
				delete event.request.headers["cookie"];
			}
			return event;
		},
	});

	initialized = true;
	console.log("[Sentry] Error tracking initialized.");
}

export function captureException(error: unknown) {
	if (initialized) Sentry.captureException(error);
	else console.error(error);
}

export { Sentry };
