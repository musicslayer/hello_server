const io = new require("socket.io")(server);

const accountMap = new Map();
const gameDataMap = new Map();

io.on("connection", (socket) => {
	if(socket.handshake.query.info) {
		// Querying server info
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
		socket.on("change_user_password", (username, password, callback) => {
			callback({success:changeUserPassword(username, password)});
		});
	}

	if(socket.handshake.query.email) {
		// Email sending
		socket.on("send_account_creation_email", (email, url, callback) => {
			callback({success:sendAccountCreationEmail(email, url)});
		});
		socket.on("send_password_reset_email", (email, url, callback) => {
			callback({success:sendPasswordResetEmail(email, url)});
		});
	}

	if(socket.handshake.query.login) {
		// Normal login
		const username = socket.handshake.auth.username;
		const password = socket.handshake.auth.password;

		emitUserLogin(socket, username, password);
		emitUserGameData(socket, username);

		socket.on("grind_skill", (username) => {
			let experience = getGameData(username, "experience");
			experience++;
			setGameData(username, "experience", experience);
            emitUserGameData(socket, username);
		});
	}
});

// Rate Limit
io.use((socket, next) => {
    if(isRateLimited(socket.handshake.address)) {
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

	if(!isUser(username)) {
		const err = new Error("Login Error");
		err.data = "Username: " + username + "\nUser does not exist.";
		next(err);
		return;
	}
	else if(!isUserPassword(username, password)) {
		const err = new Error("Login Error");
		err.data = "Username: " + username + "\nIncorrect password.";
		next(err);
		return;
	}
	
	next();
});

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

function verifyAccountCreation(url) {
	if(!isValidQuery(url, ["username", "password", "email"], [])) {
		return false;
	}

	// TODO The url should only send the token, and the password should be already stored...
    const username = getURLParameter(url, "username");
    const password = getURLParameter(url, "password");
    const email = getURLParameter(url, "email");

	// If the account already exists, then this process should fail.
	if(isUser(username)) {
		return false;
	}

	initializeAccount(username, password, email);

	return true;
}