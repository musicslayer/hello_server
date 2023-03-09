// Limit the log file size to 1GB.
const LOG_FILE = 'log.txt';
const LOG_SIZELIMIT = 1 * 1024 * 1024 * 1024; //bytes
const LOG_MARKER = []; // Will contain a value if logging is disabled.

function logError(req, error, info) {
	// Log all errors to the log file.
	var MARKER = "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!";
	var timestamp = new Date().toISOString();
	var ip = req.socket.remoteAddress;
	if(!info) {
		info = "(No Info)";
	}

	errorStr = MARKER + "\n" + 
		"Timestamp: " + timestamp + "\n" +
		"IP: " + ip + "\n" +
		"URL: " + req.url + "\n" + 
		"INFO: " + info + "\n" + 
		"ERROR: " + error + "\n" +
		"ERROR STACK: " + error.stack + "\n\n";

	writeToLogFile(errorStr);
}

function writeToLogFile(str) {
	// Write to log file, but if we error or the size would be too big then just print once to console.
	if(LOG_MARKER.length > 0) { return; }

	try {
		// Create log file if it doesn't exist.
		if(!fs.existsSync(LOG_FILE)) {
			fs.writeFileSync(LOG_FILE, "");
		}
		var stats = fs.statSync(LOG_FILE);

		var currentSize = stats.size;
		var newSize = Buffer.byteLength(str, 'utf8');
		var totalSize = currentSize + newSize;
	
		if(totalSize > LOG_SIZELIMIT) {
			LOG_MARKER.push(true);
			console.log("LOG FILE LIMIT REACHED");
			console.log("Last Log String: " + str);
		}
		else {
			fs.appendFileSync(LOG_FILE, str);
		}
	}
	catch(error) {
		LOG_MARKER.push(true);
		console.log("LOG FILE ERROR");
		console.log(error);
		console.log("Last Log String: " + str);
	}
}