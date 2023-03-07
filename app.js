const fs = require("fs");
const http = require("http");
const url = require("url");

eval(fs.readFileSync("extras.js")+"");

const FAVICON_FILE = "favicon.ico";
const HTML_HOME = "index.html";
const HTML_LOGIN = "login.html";
const HTML_CREATE_ACCOUNT = "create_account.html";
const HTML_CREATE_ACCOUNT_VERIFY_SUCCESS = "create_account_success.html";
const HTML_CREATE_ACCOUNT_VERIFY_FAIL = "create_account_fail.html";
const HTML_RESET_PASSWORD = "reset_password.html";
const HTML_RESET_PASSWORD_FINISH = "reset_password_finish.html";
const HTML_GAME = "game.html";

const SERVER_PORT = 8080;
const SERVER_REQUEST_TIMEOUT = 300000; // milliseconds (5 minutes)

const server = http.createServer((req, res) => {
	res.isEnded = false;

	try {
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
				if(verifyAccountCreation(req)) {
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
	catch(error) {
		serveError(res, 400, "Error processing request.\n\n" + createErrorString(error));
	}
});

function createErrorString(error) {
	if(error === undefined) {
		return "";
	}

	let errorString = "" + error;

	if(error.stack) {
		errorString = errorString + "\n" + error.stack;
	}

	if(error.cause) {
		errorString = errorString + "\n\n" + "Caused By:\n" + createErrorString(error);
	}

	return errorString;
}

server.timeout = SERVER_REQUEST_TIMEOUT;

server.listen(SERVER_PORT, () => {
	console.log(`Server running on port ${SERVER_PORT}.`);
});

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

const { Server } = require("socket.io");
const io = new Server(server);

const accountMap = new Map();
const gameDataMap = new Map();
createAccount("mr_a", "fluffy", "a@gmail.com");
createAccount("mr_c", "other", "c@hotmail.com");

// Make mr_c start off as powerful.
setGameDataNoUpdate("mr_c", "is_powerful", true);

io.on("connection", (socket) => {
	if(socket.handshake.query.info) {
		socket.on("is_user", (username, callback) => {
			callback({isUser:isUser(username)});
		});

		socket.on("is_user_email", (username, email, callback) => {
			callback({isUserEmail:isUserEmail(username, email)});
		});
	}
	else if(socket.handshake.query.change) {
		socket.on("change_user_password", (username, password, callback) => {
			callback({success:changeUserPassword(username, password)});
		});
	}
	else {
		// Normal Login
		const username = socket.handshake.auth.username;

		emitUserLogin(socket, username);
		emitUserGameData(socket, username);

		socket.on("grind_skill", (username) => {
			let experience = getGameData(username, "experience");
			experience++;
			setGameData(socket, username, "experience", experience);
		});
	}
});

// Authentication
io.use((socket, next) => {
	// If we only need the server to give us info, skip the authentication.
	if(socket.handshake.query.info || socket.handshake.query.change) {
		next();
		return;
	}

	const username = socket.handshake.auth.username;
	const password = socket.handshake.auth.password;

	if(!isValidUsername(username)) {
		const err = new Error("Login Error");
		err.data = "Username: " + username + "\nUser does not exist.";
		next(err);
		return;
	}
	else if(!isValidPassword(username, password)) {
		const err = new Error("Login Error");
		err.data = "Username: " + username + "\nIncorrect password.";
		next(err);
		return;
	}
	
	next();
});

function isValidUsername(username) {
	// Check if the username exists.
	return isUser(username);
}

function isValidPassword(username, password) {
	// Check if the password creates the right token.
	const actToken = createToken(username, password);
	const expToken = accountMap.get(username).get("token");
	return actToken === expToken;
}

function createToken(username, password) {
	return username + password;
}

function createAccount(username, password, email) {
	accountMap.set(username, createNewAccountData(username, password, email));
	gameDataMap.set(username, createNewGameData(username));
}

function isUser(username) {
	return accountMap.has(username);
}

function isUserEmail(username, email) {
	if(!isUser(username)) {
		return false;
	}

	return accountMap.get(username).get("email") === email;
}

function changeUserPassword(username, password) {
	if(!isUser(username)) {
		return false;
	}

	// Do not allow same password.
	const oldPassword = accountMap.get(username).get("password");
	if(password === oldPassword) {
		return false;
	}

	accountMap.get(username).set("password", password);
	accountMap.get(username).set("token", createToken(username, password));

	return true;
}

function createNewGameData(username) {
	gameData = new Map();
	gameData.set("username", username);
	gameData.set("experience", 0);
	gameData.set("is_powerful", false);
	return gameData;
}

function createNewAccountData(username, password, email) {
	// For security, do not store passwords.
	accountData = new Map();
	accountData.set("username", username);
	accountData.set("email", email);
	accountData.set("token", createToken(username, password));
	return accountData;
}

function getGameData(username, id) {
	gameData = gameDataMap.get(username);
	return gameData.get(id);
}

function setGameData(socket, username, id, key) {
	gameData = gameDataMap.get(username);
	gameData.set(id, key);
	emitUserGameData(socket, username);
}

function setGameDataNoUpdate(username, id, key) {
	gameData = gameDataMap.get(username);
	gameData.set(id, key);
}

function emitUserLogin(socket, username) {
	socket.emit('user login', username);
}

function emitUserGameData(socket, username) {
	socket.emit('update user data', JSON.stringify(Array.from(gameDataMap.get(username))));
}

function verifyAccountCreation(req) {
	const queryObject = url.parse(req.url, true).query;
	if(!isValidQuery(queryObject, ["username", "password", "email"], [])) {
		return false;
	}

	// TODO The url should only send the token, and the password should be already stored...
	const username = queryObject.username;
	const password = queryObject.password;
	const email = queryObject.email;

	// If the account already exists, then this process should fail.
	if(isUser(username)) {
		return false;
	}

	createAccount(username, password, email);

	return true;
}

function isValidQuery(queryObject, requiredKeys, optionalKeys) {
	// Check for expected and optional query keys (order does not matter, but case and count do).
	const queryObjectCopy = Object.assign({}, queryObject);

	for(var rk = 0; rk < requiredKeys.length; rk++) {
		requiredKey = requiredKeys[rk];

		// Each required option must appear exactly one time.
		if(typeof(queryObjectCopy[requiredKey]) !== "string") {
			return false;
		}

		delete(queryObjectCopy[requiredKey]);
	}

	for(var ok = 0; ok < optionalKeys.length; ok++) {
		optionalKey = optionalKeys[ok];

		// Each optional option must be absent or appear one time.
		if(typeof(queryObjectCopy[optionalKey]) !== "undefined" && typeof(queryObjectCopy[optionalKey]) !== "string") {
			return false;
		}

		delete(queryObjectCopy[optionalKey]);
	}

	// If any extra options are there, the query is invalid.
	if(Object.keys(queryObjectCopy).length > 0) {
		return false;
	}

	return true;
}