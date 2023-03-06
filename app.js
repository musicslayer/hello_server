const fs = require('fs');
const http = require('http');

eval(fs.readFileSync('extras.js')+'');

const FAVICON_FILE = 'favicon.ico';
const HTML_FILE = 'index.html';

const SERVER_PORT = 8080;
const SERVER_REQUEST_TIMEOUT = 300000; // milliseconds (5 minutes)

const server = http.createServer((req, res) => {
	res.isEnded = false;

	try {
		// Only allow GET method.
		if(req.method !== "GET") {
			serveError(res, `"Invalid method (${req.method})."`);
			return;
		}

		// Special case for favicon.
		if(req.url === "/favicon.ico") {
            serveFavicon(res);
			return;
		}

		// Serve the home page.
        serveHTML(res);
	}
	catch(error) {
		serveError(res, '"Error processing request."');
	}
});

server.timeout = SERVER_REQUEST_TIMEOUT;

server.listen(SERVER_PORT, () => {
	console.log(`Server running on port ${SERVER_PORT}.`);
});

function serveError(res, str) {
	if(!res.isEnded) {
		res.isEnded = true;
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
		res.write(str);
		res.end();
	}
}

function serveFavicon(res) {
	if(!res.isEnded) {
		res.isEnded = true;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/x-icon');
        fs.createReadStream(FAVICON_FILE).pipe(res);
	}
}

function serveHTML(res) {
	if(!res.isEnded) {
		res.isEnded = true;
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        fs.createReadStream(HTML_FILE).pipe(res);
	}
}

const { Server } = require("socket.io");
const io = new Server(server);

const accountMap = new Map();
accountMap.set("mr_a", createToken("mr_a", "fluffy"));
accountMap.set("mr_c", createToken("mr_c", "other"));

const gameDataMap = new Map();
gameDataMap.set("mr_a", createNewGameData("mr_a"));
gameDataMap.set("mr_c", createNewGameData("mr_c"));

// Make mr_c start off as powerful.
setGameDataNoUpdate("mr_c", "is_powerful", true);

io.on('connection', (socket) => {
	const username = socket.handshake.auth.username;

	emitUserLogin(socket, username);
	emitUserGameData(socket, username);

	socket.on('grind skill', (username) => {
		let experience = getGameData(username, "experience");
		experience++;
		setGameData(socket, username, "experience", experience);
	});
});

// Authentication
io.use((socket, next) => {
	const username = socket.handshake.auth.username;
	const password = socket.handshake.auth.password;

	if(!isValidUsername(username)) {
		const err = new Error("Login Error");
  		err.data = "Username: " + username + "\nUser does not exist.";
  		next(err);
	}
	if(!isValidPassword(username, password)) {
		const err = new Error("Login Error");
  		err.data = "Username: " + username + "\nIncorrect password.";
  		next(err);
	}
	else {
		next();
	}
});

function isValidUsername(username) {
	// Check if the username exists.
	return accountMap.has(username);
}

function isValidPassword(username, password) {
	// Check if the password creates the right token.
	const actToken = createToken(username, password);
	const expToken = accountMap.get(username);
	return actToken === expToken;
}

function createToken(username, password) {
	return username + password;
}

function createNewGameData(username) {
	gameData = new Map();
	gameData.set("username", username);
	gameData.set("experience", 0);
	gameData.set("is_powerful", false);
	return gameData;
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