/*
	Spacebar: A FOSS re-implementation and extension of the Discord.com backend.
	Copyright (C) 2023 Spacebar and Spacebar Contributors
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { NextFunction, Request, Response } from "express";

// By default this reflects any Origin with credentials allowed, which is
// intentional upstream behavior — it keeps the server usable by arbitrary
// third-party Discord-API-compatible clients (like the real Discord API does).
// If you want to lock this down to just your own frontend(s) once you have a
// real domain, set CORS_ALLOWED_ORIGINS as a comma-separated list, e.g.:
//   CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://yourdomain.com
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

export function CORS(req: Request, res: Response, next: NextFunction) {
    const requestOrigin = req.header("Origin");
    let allowOrigin = requestOrigin ?? "*";
    if (allowedOrigins?.length) {
        allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];
    }

    res.set("Access-Control-Allow-Credentials", "true");
    res.set("Access-Control-Allow-Headers", req.header("Access-Control-Request-Headers") || "*");
    res.set("Access-Control-Allow-Methods", req.header("Access-Control-Request-Method") || "*");
    res.set("Access-Control-Allow-Origin", allowOrigin);
    res.set("Access-Control-Max-Age", "60"); // dont make it too long so we can change it dynamically
    // TODO: use better CSP
    res.set(
        "Content-security-policy",
        "default-src *  data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'; script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src * data: blob: 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src * data: blob: ; style-src * data: blob: 'unsafe-inline'; font-src * data: blob: 'unsafe-inline';",
    );

    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    next();
}
