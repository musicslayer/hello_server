const ip = require("../util/ip.js");
const log = require("../util/log.js");
const message = require("../util/message.js");
const rate_limit = require("../security/rate_limit.js");
const url = require("../util/url.js");

const accountDataMap = new Map();
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

			socket.on("is_user_resetting_password", (username, callback) => {
				callback({isUserResettingPassword:isUserResettingPassword(username)});
			});

			socket.on("is_user_logged_in", (username, callback) => {
				callback({isUserLoggedIn:isUserLoggedIn(username)});
			});
		}
	
		if(socket.handshake.query.change) {
			// Changing account settings
			type = type + "Change;";

			socket.on("reset_user_password", (username, callback) => {
				let isSuccess = resetUserPassword(username);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Reset Password", username, isSuccessString);

				callback({success:isSuccess});
			});

			socket.on("change_user_password", (username, password, callback) => {
				let isSuccess = changeUserPassword(username, password);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Change Password", username, isSuccessString);

				callback({success:isSuccess});
			});
		}
	
		if(socket.handshake.query.email) {
			// Email sending
			type = type + "Email;";

			socket.on("send_account_creation_email", async (email, url, callback) => {
				let isSuccess = await message.sendAccountCreationEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";

				log.logEvent("CLIENT", ipAddress, "Socket IO Email Create Account", email, isSuccessString);

				callback({success:isSuccess});
			});
			socket.on("send_password_reset_email", async (email, url, callback) => {
				let isSuccess = await message.sendPasswordResetEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Email Reset Password", email, isSuccessString);

				callback({success:isSuccess});
			});
			socket.on("send_email_change_email", async (email, url, callback) => {
				let isSuccess = await message.sendEmailChangeEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Email Change Email", email, isSuccessString);

				callback({success:isSuccess});
			});
			socket.on("send_log_out_email", async (email, url, callback) => {
				let isSuccess = await message.sendLogOutEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Email Log Out", email, isSuccessString);

				callback({success:isSuccess});
			});
			socket.on("send_reset_account_email", async (email, url, callback) => {
				let isSuccess = await message.sendResetAccountEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Email Reset Account", email, isSuccessString);

				callback({success:isSuccess});
			});
			socket.on("send_delete_account_email", async (email, url, callback) => {
				let isSuccess = await message.sendDeleteAccountEmail(email, url);
				let isSuccessString = isSuccess ? "Success" : "Failure";
				
				log.logEvent("CLIENT", ipAddress, "Socket IO Email Delete Account", email, isSuccessString);

				callback({success:isSuccess});
			});
		}
	
		if(socket.handshake.query.login) {
			// Normal login
			type = type + "Login;";

			const username = socket.handshake.auth.username;
			const password = socket.handshake.auth.password;

			setAccountData(username, "isLoggedIn", true);

			log.logEvent("CLIENT", ipAddress, "Socket IO Login Success", username);
	
			emitUserLogin(socket, username, password);
			emitUserGameData(socket, username);

			socket.on("logout", (username, callback) => {
				log.logEvent("CLIENT", ipAddress, "Socket IO Logout Success", username);

				setAccountData(username, "isLoggedIn", false);
				callback();
			});
	
			socket.on("grind_skill", (username) => {
				try {
					validateUserLoggedIn(username);

					let experience = getGameData(username, "experience");
					experience++;
					setGameData(username, "experience", experience);

					log.logEvent("GAME", ipAddress, "Game Grind Skill Success", username, experience);

					emitUserGameData(socket, username);
				}
				catch(err) {
					log.logError("GAME", ipAddress, "Game Grind Skill Failure", err, username);
				}
			});
		}

		log.logEvent("CLIENT", ipAddress, "Socket IO Connection Success", type);
	});
	
	// Rate Limit
	io.use((socket, next) => {
		const ipAddress = ip.getIPAddressFromSocket(socket);

		if(rate_limit.isRateLimited(ipAddress)) {
			log.logEvent("CLIENT", ipAddress, "Socket IO Connection Rate Limit");

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
			log.logEvent("CLIENT", ipAddress, "Socket IO Login Failure", "User Not Found");

			const err = new Error("Login Error");
			err.data = "Username: " + username + "\nUser does not exist.";
			next(err);
			return;
		}
		else if(!isUserPassword(username, password)) {
			log.logEvent("CLIENT", ipAddress, "Socket IO Login Failure", "Incorrect Password");

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
	return accountDataMap.has(username);
}

function isUserEmail(username, email) {
	if(!isUser(username)) {
		return false;
	}

	return accountDataMap.get(username).get("email") === email;
}

function isUserPassword(username, password) {
	// Check if the password creates the right token.
	const actToken = createToken(username, password);
	const expToken = accountDataMap.get(username).get("token");
	return actToken === expToken;
}

function isUserResettingPassword(username) {
	if(!isUser(username)) {
		return false;
	}

	return accountDataMap.get(username).get("isResettingPassword");
}

function isUserLoggedIn(username) {
	if(!isUser(username)) {
		return false;
	}

	return accountDataMap.get(username).get("isLoggedIn");
}

function initializeAccount(username, password, email) {
	accountDataMap.set(username, createNewAccountData(username, password, email));
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
	accountData.set("isResettingPassword", false);
	accountData.set("isLoggedIn", false);
	return accountData;
}

function resetUserPassword(username) {
	if(!isUser(username)) {
		return false;
	}

	// The old password is still valid, but flag the account as being in the process of resetting the password.
	accountDataMap.get(username).set("isResettingPassword", true);

	return true;
}

function changeUserPassword(username, password) {
	if(!isUser(username) || !isUserResettingPassword(username)) {
		return false;
	}

	// Do not allow same password.
	const oldPassword = accountDataMap.get(username).get("password");
	if(password === oldPassword) {
		return false;
	}

	accountDataMap.get(username).set("password", password);
	accountDataMap.get(username).set("token", createToken(username, password));
	accountDataMap.get(username).set("isResettingPassword", false);

	return true;
}

function resetAccount(username) {
	gameDataMap.set(username, createNewGameData(username));
}

function deleteAccount(username) {
	accountDataMap.delete(username);
	gameDataMap.delete(username);
}

function getAccountData(username, key) {
	accountData = accountDataMap.get(username);
	return accountData.get(key);
}

function setAccountData(username, key, value) {
	accountData = accountDataMap.get(username);
	accountData.set(key, value);
}

function validateUserLoggedIn(username) {
	if(!isUserLoggedIn(username)) {
		throw new Error("User Not Logged In: " + username);
	}
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

function getGameData(username, key) {
	gameData = gameDataMap.get(username);
	return gameData.get(key);
}

function setGameData(username, key, value) {
	gameData = gameDataMap.get(username);
	gameData.set(key, value);
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

function verifyEmailChange(_url) {
	if(!url.isValidQuery(_url, ["username", "email"], [])) {
		return false;
	}

    const username = url.getURLParameter(_url, "username");
    const email = url.getURLParameter(_url, "email");

	// If the username doesn't exist, then this process should fail.
	if(!isUser(username)) {
		return false;
	}

	setAccountData(username, "email", email);

	return true;
}

function verifyLogOut(_url) {
	if(!url.isValidQuery(_url, ["username"], [])) {
		return false;
	}

    const username = url.getURLParameter(_url, "username");

	// If the username doesn't exist, then this process should fail.
	if(!isUser(username)) {
		return false;
	}

	setAccountData(username, "isLoggedIn", false);

	return true;
}

function verifyResetAccount(_url) {
	if(!url.isValidQuery(_url, ["username"], [])) {
		return false;
	}

    const username = url.getURLParameter(_url, "username");

	// If the username doesn't exist, then this process should fail.
	if(!isUser(username)) {
		return false;
	}

	resetAccount(username);

	return true;
}

function verifyDeleteAccount(_url) {
	if(!url.isValidQuery(_url, ["username"], [])) {
		return false;
	}

    const username = url.getURLParameter(_url, "username");

	// If the username doesn't exist, then this process should fail.
	if(!isUser(username)) {
		return false;
	}

	deleteAccount(username);

	return true;
}

module.exports.createSocketIOServer = createSocketIOServer;
module.exports.verifyAccountCreation = verifyAccountCreation;
module.exports.verifyEmailChange = verifyEmailChange;
module.exports.verifyLogOut = verifyLogOut;
module.exports.verifyResetAccount = verifyResetAccount;
module.exports.verifyDeleteAccount = verifyDeleteAccount;

// For development
module.exports.initializeAccount = initializeAccount;
module.exports.setGameData = setGameData;