// Use 0 to save bandwidth, but use a larger number to make responses easier to read.
const FORMAT_JSONINDENT = 0;

// Limit the log file size to 1GB.
const LOG_FILE = 'log.txt';
const LOG_SIZELIMIT = 1 * 1024 * 1024 * 1024; //bytes
const LOG_MARKER = [];

// Rate limit is 100 requests every minute per IP Address.
const RATELIMIT_RECORDS = new Map();
const RATELIMIT_COUNT_LOW = 3;
const RATELIMIT_COUNT_HIGH = 10;
const RATELIMIT_COUNT_MAX = 1000000;
const RATELIMIT_RESETTIME = 60000; //milliseconds

setInterval(() => {
	// Reset the rate limit data every interval.
	RATELIMIT_RECORDS.clear();
}, RATELIMIT_RESETTIME);

function isRateLimited(req, apikey) {
	var RATELIMIT_COUNT;
	if(apikey === "qwerty") {
		RATELIMIT_COUNT = RATELIMIT_COUNT_HIGH;
	}
	else {
		RATELIMIT_COUNT = RATELIMIT_COUNT_LOW;
	}

	var ip = req.socket.remoteAddress;
	var record = RATELIMIT_RECORDS.get(ip);
	if(record) {
		// Record exists (within time window).
		// Limit this value to prevent overflow.
		record.count = Math.min(record.count + 1, RATELIMIT_COUNT_MAX + 1);
	}
	else {
		// First time (within time window).
		record = new Object;
		record.count = 1;
		RATELIMIT_RECORDS.set(ip, record);
	}

	return record.count > RATELIMIT_COUNT;
}

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

// These are useful for debugging, but not always good for production.
function logProgress(str) {
	//console.log("PROGRESS: " + str);
}

function logDebugError(req, error, info) {
	//logError(req, error, info);
}