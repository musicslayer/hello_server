const error = require("../util/error.js");
const fs = require("fs");
const http = require("http");
const ip = require("../util/ip.js");
const rate_limit = require("../security/rate_limit.js");
const socketIO = require("../server/socket_io.js");
const url = require("url");

const FAVICON_FILE = "favicon.ico";
const HTML_HOME = "html/index.html";
const HTML_LOGIN = "html/login.html";
const HTML_CREATE_ACCOUNT = "html/create_account.html";
const HTML_CREATE_ACCOUNT_VERIFY_SUCCESS = "html/create_account_success.html";
const HTML_CREATE_ACCOUNT_VERIFY_FAIL = "html/create_account_fail.html";
const HTML_RESET_PASSWORD = "html/reset_password.html";
const HTML_RESET_PASSWORD_FINISH = "html/reset_password_finish.html";
const HTML_GAME = "html/game.html";

const SERVER_PORT = 8080;
const SERVER_REQUEST_TIMEOUT = 30000; // milliseconds

function createHTTPServer() {
	const server = http.createServer((req, res) => {
		res.isEnded = false;

		try {
			// Rate Limit
			if(rate_limit.isRateLimited(ip.getIPAddressFromRequest(req))) {
				serveError(res, 400, "Too many requests from this IP address. Please wait and try again.");
				return;
			}

			// Only allow GET method.
			if(req.method !== "GET") {
				serveError(res, 400, `Invalid method (${req.method}).`);
				return;
			}

			// Special case for favicon. Use exact match.
			if(req.url === "/favicon.ico") {
				serveFavicon(res);
				return;
			}

			// Serve pages.
			const pathname = url.parse(req.url, true).pathname;

			switch(pathname) {
				case "/": {
					serveHTML(res, HTML_HOME);
					break;
				}
				case "/login": {
					serveHTML(res, HTML_LOGIN);
					break;
				}
				case "/create_account": {
					serveHTML(res, HTML_CREATE_ACCOUNT);
					break;
				}
				case "/create_account_verify": {
					if(socketIO.verifyAccountCreation(req.url)) {
						serveHTML(res, HTML_CREATE_ACCOUNT_VERIFY_SUCCESS);
					}
					else {
						serveHTML(res, HTML_CREATE_ACCOUNT_VERIFY_FAIL);
					}
					break;
				}
				case "/reset_password": {
					serveHTML(res, HTML_RESET_PASSWORD);
					break;
				}
				case "/reset_password_finish": {
					serveHTML(res, HTML_RESET_PASSWORD_FINISH);
					break;
				}
				case "/game": {
					serveHTML(res, HTML_GAME);
					break;
				}
				default: {
					serveError(res, 404, "Error 404: Page not found.");
					break;
				}
			}
		}
		catch(_error) {
			serveError(res, 400, "Error processing request.\n\n" + error.createErrorString(_error));
		}
	});

	server.timeout = SERVER_REQUEST_TIMEOUT;

	server.listen(SERVER_PORT, () => {
		console.log(`Server running on port ${SERVER_PORT}.`);
	});

	return server;
}

function serveError(res, statusCode, str) {
	if(!res.isEnded) {
		res.isEnded = true;
		res.statusCode = statusCode;
		res.setHeader("Content-Type", "text/plain");
		res.write(str);
		res.end();
	}
}

function serveFavicon(res) {
	if(!res.isEnded) {
		res.isEnded = true;
		res.statusCode = 200;
		res.setHeader("Content-Type", "image/x-icon");
		fs.createReadStream(FAVICON_FILE).pipe(res);
	}
}

function serveHTML(res, htmlFile) {
	if(!res.isEnded) {
		res.isEnded = true;
		res.statusCode = 200;
		res.setHeader("Content-Type", "text/html");
		fs.createReadStream(htmlFile).pipe(res);
	}
}

module.exports.createHTTPServer = createHTTPServer;