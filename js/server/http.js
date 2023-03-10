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
const HTML_CHANGE_EMAIL = "html/change_email.html";
const HTML_CHANGE_EMAIL_SUCCESS = "html/change_email_success.html";
const HTML_CHANGE_EMAIL_FAILURE = "html/change_email_failure.html";
const HTML_TROUBLESHOOT_ACCOUNT = "html/troubleshoot_account.html";
const HTML_LOG_OUT_SUCCESS = "html/log_out_success.html";
const HTML_LOG_OUT_FAILURE = "html/log_out_failure.html";
const HTML_RESET_ACCOUNT_SUCCESS = "html/reset_account_success.html";
const HTML_RESET_ACCOUNT_FAILURE = "html/reset_account_failure.html";
const HTML_DELETE_ACCOUNT_SUCCESS = "html/delete_account_success.html";
const HTML_DELETE_ACCOUNT_FAILURE = "html/delete_account_failure.html";
const HTML_GAME = "html/game.html";

const SERVER_PORT = 8080;
const SERVER_REQUEST_TIMEOUT = 30000; // milliseconds

function createHTTPServer() {
	const server = http.createServer((req, res) => {
		const ipAddress = ip.getIPAddressFromRequest(req);
		let pageName = "";

		res.isEnded = false;

		try {
			// Rate Limit
			if(rate_limit.isRateLimited(ipAddress)) {
				log.logEvent("CLIENT", ipAddress, "HTTP Rate Limit");

				serveError(res, 400, "Too many requests from this IP address. Please wait and try again.");
				return;
			}

			// Only allow GET method.
			if(req.method !== "GET") {
				log.logEvent("CLIENT", ipAddress, "HTTP Invalid Method", req.method);

				serveError(res, 400, `Invalid method (${req.method}).`);
				return;
			}

			// Special case for favicon. Use exact match.
			if(req.url === "/favicon.ico") {
				log.logEvent("CLIENT", ipAddress, "HTTP Favicon");

				serveFavicon(res);
				return;
			}

			// Serve pages.
			const pathname = url.parse(req.url, true).pathname;

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
				case "/change_email": {
					pageName = "Change Email";
					serveHTML(res, HTML_CHANGE_EMAIL);
					break;
				}
				case "/change_email_verify": {
					if(socketIO.verifyEmailChange(req.url)) {
						pageName = "Change Email Success";
						serveHTML(res, HTML_CHANGE_EMAIL_SUCCESS);
					}
					else {
						pageName = "Change Email Failure";
						serveHTML(res, HTML_CHANGE_EMAIL_FAILURE);
					}
					break;
				}
				case "/troubleshoot_account": {
					pageName = "Troubleshoot Account";
					serveHTML(res, HTML_TROUBLESHOOT_ACCOUNT);
					break;
				}
				case "/log_out_verify": {
					if(socketIO.verifyLogOut(req.url)) {
						pageName = "Log Out Success";
						serveHTML(res, HTML_LOG_OUT_SUCCESS);
					}
					else {
						pageName = "Log Out Failure";
						serveHTML(res, HTML_LOG_OUT_FAILURE);
					}
					break;
				}
				case "/reset_account_verify": {
					if(socketIO.verifyResetAccount(req.url)) {
						pageName = "Reset Account Success";
						serveHTML(res, HTML_RESET_ACCOUNT_SUCCESS);
					}
					else {
						pageName = "Reset Account Failure";
						serveHTML(res, HTML_RESET_ACCOUNT_FAILURE);
					}
					break;
				}
				case "/delete_account_verify": {
					if(socketIO.verifyDeleteAccount(req.url)) {
						pageName = "Delete Account Success";
						serveHTML(res, HTML_DELETE_ACCOUNT_SUCCESS);
					}
					else {
						pageName = "Delete Account Failure";
						serveHTML(res, HTML_DELETE_ACCOUNT_FAILURE);
					}
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

			log.logEvent("CLIENT", ipAddress, "HTTP Serve Page Success", pageName);
		}
		catch(err) {
			log.logError("CLIENT", ipAddress, "HTTP Serve Page Failure", err, pageName);

			serveError(res, 400, "Error processing request.\n\n" + error.createErrorString(err));
		}
	});

	server.timeout = SERVER_REQUEST_TIMEOUT;

	server.listen(SERVER_PORT, () => {
		log.logEvent("SERVER", "main", "HTTP Server Listening On Port", SERVER_PORT);
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