import app from "../server/index.js";

const normalizePath = (value) => String(value ?? "").replace(/^\/+/, "").trim();

const handler = (req, res) => {
	const pathParam = req.query?.path;
	const rawPath = Array.isArray(pathParam) ? pathParam.join("/") : pathParam;

	if (rawPath) {
		const queryString = req.url.includes("?") ? `?${req.url.split("?")[1]}` : "";
		req.url = `/api/${normalizePath(rawPath)}${queryString}`;
	} else if (req.url === "/api/index" || req.url.startsWith("/api/index?")) {
		const queryString = req.url.includes("?") ? `?${req.url.split("?")[1]}` : "";
		req.url = `/api${queryString}`;
	}

	return app(req, res);
};

export default handler;
