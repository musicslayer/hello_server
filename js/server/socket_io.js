const ip = require("../util/ip.js");
const log = require("../util/log.js");
const message = require("../util/message.js");
const rate_limit = require("../security/rate_limit.js");
const url = require("../util/url.js");

const accountMap = new Map();
const gameDataMap = new Map();

function createSocketIOServer(server) {
	const io = new require("socket.io")(server);

	io.on("connection", (socket) => {
		const ipAddress = ip.getIPAddressFromSocket(socket);
		let type = "";

		if(socket.handshake.query.info) {
			// Querying server info
			type = type + "Info;";

			socket.on("is_user", (username, callback) => {
				callback({isUser:isUser(username)});
			});
	
			socket.on("is_user_email", (username, email, callback) => {
				callback({isUserEmail:isUserEmail(username, email)});
			});
	
			socket.on("is_user_password", (username, password, callback) => {
				callback({isUserPassword:isUserPassword(username, password)});
			});
		}
	
		if(socket.handshake.query.change) {
			// Changing account settings
			type = type + "Change;";

			socket.on("change_user_password", (username, password, callback) => {
				let isSuccess = changeUserPassword(username, password);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logClientEvent(ipAddress, "Socket IO Change Password", username, isSuccessString);

				callback({success:isSuccess});
			});
		}
	
		if(socket.handshake.query.email) {
			// Email sending
			type = type + "Email;";

			socket.on("send_account_creation_email", (email, url, callback) => {
				let isSuccess = message.sendAccountCreationEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";

				log.logClientEvent(ipAddress, "Socket IO Email Create Account", email, isSuccessString);

				callback({success:isSuccess});
			});
			socket.on("send_password_reset_email", (email, url, callback) => {
				let isSuccess = message.sendPasswordResetEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logClientEvent(ipAddress, "Socket IO Email Reset Password", email, isSuccessString);

				callback({success:isSuccess});
			});
		}
	
		if(socket.handshake.query.login) {
			// Normal login
			type = type + "Login;";

			const username = socket.handshake.auth.username;
			const password = socket.handshake.auth.password;

			log.logClientEvent(ipAddress, "Socket IO Login Success", username);
	
			emitUserLogin(socket, username, password);
			emitUserGameData(socket, username);
	
			socket.on("grind_skill", (username) => {
				let experience = getGameData(username, "experience");
				experience++;
				setGameData(username, "experience", experience);

				log.logGameEvent(ipAddress, "Game Experience Change", username, experience);

				emitUserGameData(socket, username);
			});
		}

		log.logClientEvent(ipAddress, "Socket IO Connection Success", type);
	});
	
	// Rate Limit
	io.use((socket, next) => {
		const ipAddress = ip.getIPAddressFromSocket(socket);

		if(rate_limit.isRateLimited(ipAddress)) {
			log.logClientEvent(ipAddress, "Socket IO Connection Rate Limit");

			const err = new Error("Rate Limit Error");
			err.data = "Too many requests from this IP address. Please wait and try again.";
			next(err);
			return;
		}
	
		next();
	});
	
	// Authentication
	io.use((socket, next) => {
		// Only do the authentication for a login attempt.
		if(socket.handshake.query.login === undefined) {
			next();
			return;
		}
	
		const username = socket.handshake.auth.username;
		const password = socket.handshake.auth.password;
		const ipAddress = ip.getIPAddressFromSocket(socket);
	
		if(!isUser(username)) {
			log.logClientEvent(ipAddress, "Socket IO Login Failure", "User Not Found");

			const err = new Error("Login Error");
			err.data = "Username: " + username + "\nUser does not exist.";
			next(err);
			return;
		}
		else if(!isUserPassword(username, password)) {
			log.logClientEvent(ipAddress, "Socket IO Login Failure", "Incorrect Password");

			const err = new Error("Login Error");
			err.data = "Username: " + username + "\nIncorrect password.";
			next(err);
			return;
		}
		
		next();
	});

	return io;
}

/*
    Account Functions
*/

function isUser(username) {
	return accountMap.has(username);
}

function isUserEmail(username, email) {
	if(!isUser(username)) {
		return false;
	}

	return accountMap.get(username).get("email") === email;
}

function isUserPassword(username, password) {
	// Check if the password creates the right token.
	const actToken = createToken(username, password);
	const expToken = accountMap.get(username).get("token");
	return actToken === expToken;
}

function initializeAccount(username, password, email) {
	accountMap.set(username, createNewAccountData(username, password, email));
	gameDataMap.set(username, createNewGameData(username));
}

function createToken(username, password) {
	return username + password;
}

function createNewAccountData(username, password, email) {
	// For security, do not store passwords.
	accountData = new Map();
	accountData.set("username", username);
	accountData.set("email", email);
	accountData.set("token", createToken(username, password));
	return accountData;
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

/*
    Game Functions
*/

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

function setGameData(username, id, key) {
	gameData = gameDataMap.get(username);
	gameData.set(id, key);
}

function emitUserLogin(socket, username, password) {
	socket.emit('user login', username, password);
}

function emitUserGameData(socket, username) {
	socket.emit('update user data', JSON.stringify(Array.from(gameDataMap.get(username))));
}

function verifyAccountCreation(_url) {
	if(!url.isValidQuery(_url, ["username", "password", "email"], [])) {
		return false;
	}

	// TODO The url should only send the token, and the password should be already stored...
    const username = url.getURLParameter(_url, "username");
    const password = url.getURLParameter(_url, "password");
    const email = url.getURLParameter(_url, "email");

	// If the account already exists, then this process should fail.
	if(isUser(username)) {
		return false;
	}

	initializeAccount(username, password, email);

	return true;
}

module.exports.createSocketIOServer = createSocketIOServer;
module.exports.verifyAccountCreation = verifyAccountCreation;

// For development
module.exports.initializeAccount = initializeAccount;
module.exports.setGameData = setGameData;