const fs = require("fs");

// Limit log file sizes to 1GB.
// Markers will contain a value if logging is disabled.
const LOG_SIZE_LIMIT = 1 * 1024 * 1024 * 1024;
const LOG_MARKER = [];
const ERROR_LOG_SIZE_LIMIT = 1 * 1024 * 1024 * 1024;
const ERROR_LOG_MARKER = [];
const CLIENT_LOG_SIZE_LIMIT = 1 * 1024 * 1024 * 1024;
const CLIENT_LOG_MARKER = [];
const CLIENT_ERROR_LOG_SIZE_LIMIT = 1 * 1024 * 1024 * 1024;
const CLIENT_ERROR_LOG_MARKER = [];
const SERVER_LOG_SIZE_LIMIT = 1 * 1024 * 1024 * 1024;
const SERVER_LOG_MARKER = [];
const SERVER_ERROR_LOG_SIZE_LIMIT = 1 * 1024 * 1024 * 1024;
const SERVER_ERROR_LOG_MARKER = [];

const logFile = "logs/log.txt";
const errorLogFile = "logs/error_log.txt";
const clientLogFile = "logs/client/log.txt";
const clientErrorLogFile = "logs/client/error_log.txt";
const serverLogFile = "logs/server/log.txt";
const serverErrorLogFile = "logs/server/error_log.txt";

let errorCount = 0;
let clientErrorCount = 0;
let serverErrorCount = 0;

function createLogFiles() {
	fs.writeFileSync(logFile, "");
	fs.writeFileSync(errorLogFile, "");
	fs.writeFileSync(clientLogFile, "");
	fs.writeFileSync(clientErrorLogFile, "");
	fs.writeFileSync(serverLogFile, "");
	fs.writeFileSync(serverErrorLogFile, "");
}

// All other log event functions should call this one too.
function logEvent(marker, separator, timestamp, id, eventName, info) {
	const str = timestamp + separator + marker + separator + id + separator + eventName + separator + info + "\n";
	writeToLogFile(str);
}

// All other log error functions should call this one too.
function logError(marker, separator, timestamp, id, errorName, error) {
	// Log basic info in the log file and include a reference to a fuller entry in the error log file.
	errorCount++;

	const str = timestamp + separator + marker + separator + id + separator + errorName + separator + "#E[" + errorCount + "]" + "\n";
	writeToLogFile(str);

	const errorStr = "#E[" + errorCount + "]" + "\n" + 
		"ERROR: " + error + "\n" +
		"ERROR STACK: " + error.stack + "\n\n";

	writeToErrorLogFile(errorStr);
}

function logClientEvent(ip, eventName, info) {
	const marker = "CLIENT_EVENT";
	const separator = " ----- "
	const timestamp = new Date().toISOString();

	const str = timestamp + separator + marker + separator + ip + separator + eventName + separator + info + "\n";
	writeToClientLogFile(str);

	logEvent(marker, separator, timestamp, ip, eventName, info);
}

function logClientError(ip, errorName, error) {
	// Log basic info in the log file and include a reference to a fuller entry in the error log file.
	clientErrorCount++;

	const marker = "CLIENT_ERROR";
	const separator = " ----- "
	const timestamp = new Date().toISOString();

	const str = timestamp + separator + marker + separator + ip + separator + errorName + separator + "#E[" + clientErrorCount + "]" + "\n";
	writeToClientLogFile(str);

	const errorStr = "#E[" + clientErrorCount + "]" + "\n" + 
		"ERROR: " + error + "\n" +
		"ERROR STACK: " + error.stack + "\n\n";

	writeToClientErrorLogFile(errorStr);

	logError(marker, separator, timestamp, ip, errorName, error)
}

function logServerEvent(serverID, eventName, info) {
	const marker = "SERVER_EVENT";
	const separator = " ----- "
	const timestamp = new Date().toISOString();

	const str = timestamp + separator + marker + separator + serverID + separator + eventName + separator + info + "\n";
	writeToServerLogFile(str);

	logEvent(marker, separator, timestamp, serverID, eventName, info);
}

function logServerError(serverID, errorName, error) {
	// Log basic info in the log file and include a reference to a fuller entry in the error log file.
	serverErrorCount++;

	const marker = "SERVER_ERROR";
	const separator = " ----- "
	const timestamp = new Date().toISOString();

	const str = timestamp + separator + marker + separator + serverID + separator + errorName + separator + "#E[" + serverErrorCount + "]" + "\n";
	writeToServerLogFile(str);

	const errorStr = "#E[" + serverErrorCount + "]" + "\n" + 
		"ERROR: " + error + "\n" +
		"ERROR STACK: " + error.stack + "\n\n";

	writeToServerErrorLogFile(errorStr);

	logError(marker, separator, timestamp, serverID, errorName, error)
}

function writeToLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(LOG_MARKER.length > 0) { return; }

	try {
		let currentSize = fs.statSync(logFile).size;
		let newSize = Buffer.byteLength(str, "utf8");
		let totalSize = currentSize + newSize;
	
		if(totalSize > LOG_SIZE_LIMIT) {
			LOG_MARKER.push(true);
			console.log("LOG FILE LIMIT REACHED");
			console.log("Last Log String: " + str);
		}
		else {
			fs.appendFileSync(logFile, str);
		}
	}
	catch(error) {
		LOG_MARKER.push(true);
		console.log("LOG FILE ERROR");
		console.log(error);
		console.log("Last Log String: " + str);
	}
}

function writeToErrorLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(ERROR_LOG_MARKER.length > 0) { return; }

	try {
		let currentSize = fs.statSync(errorLogFile).size;
		let newSize = Buffer.byteLength(str, "utf8");
		let totalSize = currentSize + newSize;
	
		if(totalSize > ERROR_LOG_SIZE_LIMIT) {
			ERROR_LOG_MARKER.push(true);
			console.log("ERROR LOG FILE LIMIT REACHED");
			console.log("Last Error Log String: " + str);
		}
		else {
			fs.appendFileSync(errorLogFile, str);
		}
	}
	catch(error) {
		ERROR_LOG_MARKER.push(true);
		console.log("ERROR LOG FILE ERROR");
		console.log(error);
		console.log("Last Error Log String: " + str);
	}
}

function writeToClientLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(CLIENT_LOG_MARKER.length > 0) { return; }

	try {
		let currentSize = fs.statSync(clientLogFile).size;
		let newSize = Buffer.byteLength(str, "utf8");
		let totalSize = currentSize + newSize;
	
		if(totalSize > CLIENT_LOG_SIZE_LIMIT) {
			CLIENT_LOG_MARKER.push(true);
			console.log("CLIENT LOG FILE LIMIT REACHED");
			console.log("Last Client Log String: " + str);
		}
		else {
			fs.appendFileSync(clientLogFile, str);
		}
	}
	catch(error) {
		CLIENT_LOG_MARKER.push(true);
		console.log("CLIENT LOG FILE ERROR");
		console.log(error);
		console.log("Last Client Log String: " + str);
	}
}

function writeToClientErrorLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(CLIENT_ERROR_LOG_MARKER.length > 0) { return; }

	try {
		let currentSize = fs.statSync(clientErrorLogFile).size;
		let newSize = Buffer.byteLength(str, "utf8");
		let totalSize = currentSize + newSize;
	
		if(totalSize > CLIENT_ERROR_LOG_SIZE_LIMIT) {
			CLIENT_ERROR_LOG_MARKER.push(true);
			console.log("CLIENT ERROR LOG FILE LIMIT REACHED");
			console.log("Last Client Error Log String: " + str);
		}
		else {
			fs.appendFileSync(clientErrorLogFile, str);
		}
	}
	catch(error) {
		CLIENT_ERROR_LOG_MARKER.push(true);
		console.log("CLIENT ERROR LOG FILE ERROR");
		console.log(error);
		console.log("Last Client Error Log String: " + str);
	}
}

function writeToServerLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(SERVER_LOG_MARKER.length > 0) { return; }

	try {
		let currentSize = fs.statSync(serverLogFile).size;
		let newSize = Buffer.byteLength(str, "utf8");
		let totalSize = currentSize + newSize;
	
		if(totalSize > SERVER_LOG_SIZE_LIMIT) {
			SERVER_LOG_MARKER.push(true);
			console.log("SERVER LOG FILE LIMIT REACHED");
			console.log("Last Server Log String: " + str);
		}
		else {
			fs.appendFileSync(serverLogFile, str);
		}
	}
	catch(error) {
		SERVER_LOG_MARKER.push(true);
		console.log("SERVER LOG FILE ERROR");
		console.log(error);
		console.log("Last Server Log String: " + str);
	}
}

function writeToServerErrorLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(SERVER_ERROR_LOG_MARKER.length > 0) { return; }

	try {
		let currentSize = fs.statSync(serverErrorLogFile).size;
		let newSize = Buffer.byteLength(str, "utf8");
		let totalSize = currentSize + newSize;
	
		if(totalSize > SERVER_ERROR_LOG_SIZE_LIMIT) {
			SERVER_ERROR_LOG_MARKER.push(true);
			console.log("SERVER ERROR LOG FILE LIMIT REACHED");
			console.log("Last Server Error Log String: " + str);
		}
		else {
			fs.appendFileSync(serverErrorLogFile, str);
		}
	}
	catch(error) {
		SERVER_ERROR_LOG_MARKER.push(true);
		console.log("SERVER ERROR LOG FILE ERROR");
		console.log(error);
		console.log("Last Server Error Log String: " + str);
	}
}

module.exports.createLogFiles = createLogFiles;
module.exports.logClientEvent = logClientEvent;
module.exports.logClientError = logClientError;
module.exports.logServerEvent = logServerEvent;
module.exports.logServerError = logServerError;