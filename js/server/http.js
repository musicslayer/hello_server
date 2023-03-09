const error = require("../util/error.js");
const fs = require("fs");
const http = require("http");
const ip = require("../util/ip.js");
const log = require("../util/log.js");
const rate_limit = require("../security/rate_limit.js");
const socketIO = require("../server/socket_io.js");
const url = require("url");

const FAVICON_FILE = "favicon.ico";
const HTML_HOME = "html/index.html";
const HTML_LOGIN = "html/login.html";
const HTML_CREATE_ACCOUNT = "html/create_account.html";
const HTML_CREATE_ACCOUNT_VERIFY_SUCCESS = "html/create_account_success.html";
const HTML_CREATE_ACCOUNT_VERIFY_FAILURE = "html/create_account_failure.html";
const HTML_RESET_PASSWORD = "html/reset_password.html";
const HTML_RESET_PASSWORD_FINISH = "html/reset_password_finish.html";
const HTML_GAME = "html/game.html";

const SERVER_PORT = 8080;
const SERVER_REQUEST_TIMEOUT = 30000; // milliseconds

function createHTTPServer() {
	const server = http.createServer((req, res) => {
		const ipAddress = ip.getIPAddressFromRequest(req);

		res.isEnded = false;

		try {
			// Rate Limit
			if(rate_limit.isRateLimited(ipAddress)) {
				log.logClientEvent(ipAddress, "HTTP Rate Limit");

				serveError(res, 400, "Too many requests from this IP address. Please wait and try again.");
				return;
			}

			// Only allow GET method.
			if(req.method !== "GET") {
				log.logClientEvent(ipAddress, "HTTP Invalid Method", req.method);

				serveError(res, 400, `Invalid method (${req.method}).`);
				return;
			}

			// Special case for favicon. Use exact match.
			if(req.url === "/favicon.ico") {
				log.logClientEvent(ipAddress, "HTTP Favicon");

				serveFavicon(res);
				return;
			}

			// Serve pages.
			const pathname = url.parse(req.url, true).pathname;
			let pageName = "";

			switch(pathname) {
				case "/": {
					pageName = "Home";
					serveHTML(res, HTML_HOME);
					break;
				}
				case "/login": {
					pageName = "Login";
					serveHTML(res, HTML_LOGIN);
					break;
				}
				case "/create_account": {
					pageName = "Create Account";
					serveHTML(res, HTML_CREATE_ACCOUNT);
					break;
				}
				case "/create_account_verify": {
					if(socketIO.verifyAccountCreation(req.url)) {
						pageName = "Create Account Success";
						serveHTML(res, HTML_CREATE_ACCOUNT_VERIFY_SUCCESS);
					}
					else {
						pageName = "Create Account Failure";
						serveHTML(res, HTML_CREATE_ACCOUNT_VERIFY_FAILURE);
					}
					break;
				}
				case "/reset_password": {
					pageName = "Reset Password";
					serveHTML(res, HTML_RESET_PASSWORD);
					break;
				}
				case "/reset_password_finish": {
					pageName = "Reset Password Finish";
					serveHTML(res, HTML_RESET_PASSWORD_FINISH);
					break;
				}
				case "/game": {
					pageName = "Game";
					serveHTML(res, HTML_GAME);
					break;
				}
				default: {
					pageName = "Default";
					serveError(res, 404, "Error 404: Page not found.");
					break;
				}
			}

			log.logClientEvent(ipAddress, "HTTP Serve Page Success", pageName);
		}
		catch(err) {
			log.logClientError(ipAddress, "HTTP Serve Page Failure", err);

			serveError(res, 400, "Error processing request.\n\n" + error.createErrorString(err));
		}
	});

	server.timeout = SERVER_REQUEST_TIMEOUT;

	server.listen(SERVER_PORT, () => {
		log.logServerEvent("main", "Server Listen On Port", SERVER_PORT);
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