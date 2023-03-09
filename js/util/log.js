const fs = require("fs");

class Logger {
	static isInit = false;
	static loggerMap = new Map();

	static baseFileName;
	static baseFileNameError;
	static baseMarker;
	static baseMarkerError;
	static baseSizeLimit;
	static baseSizeLimitError;

	category;
	reference;
	separator;
	errorCount;

	fileName;
	fileNameError;
	marker;
	markerError;
	sizeLimit;
	sizeLimitError;

	static getLogger(category) {
		return Logger.loggerMap.get(category);
	}

	static setLogger(category, logger) {
		Logger.loggerMap.set(category, logger);
	}

	static createLogger(category, reference, fileName, fileNameError) {
		Logger.setLogger(category, new Logger(category, reference, fileName, fileNameError));
	}

	static initialize() {
		if(Logger.isInit) { return; }

		Logger.baseFileName = "logs/_log.txt";
		Logger.baseFileNameError = "logs/_error_log.txt";

		// Markers will contain a value if logging is disabled.
		Logger.baseMarker = [];
		Logger.baseMarkerError = [];

		// Limit base log file sizes to 5GB.
		Logger.baseSizeLimit = 5 * 1024 * 1024 * 1024;
		Logger.baseSizeLimitError = 5 * 1024 * 1024 * 1024;

		// Create the log files.
		fs.writeFileSync(Logger.baseFileName, "");
		fs.writeFileSync(Logger.baseFileNameError, "");
	}

	constructor(category, reference, fileName, fileNameError) {
		Logger.loggerMap.set(category, this);

		this.category = category;
		this.reference = reference;
		this.separator = " ----- ";
		this.errorCount = 0;

		this.fileName = fileName;
		this.fileNameError = fileNameError;
		
		// Markers will contain a value if logging is disabled.
		this.marker = [];
		this.markerError = [];

		// Limit log file sizes to 1GB.
		this.sizeLimit = 1 * 1024 * 1024 * 1024;
		this.sizeLimitError = 1 * 1024 * 1024 * 1024;

		// Create the log files.
		fs.writeFileSync(fileName, "");
		fs.writeFileSync(fileNameError, "");
	}

	logEvent(id, eventName, infoArgs) {
		const timestamp = new Date().toISOString();
		const categoryString = this.category + "_EVENT";
		const infoString = this.createInfoString(infoArgs);

		const str = timestamp + this.separator + categoryString + this.separator + id + this.separator + eventName + this.separator + infoString + "\n";
		this.writeToLogFile(str);

		this.logBaseEvent(timestamp, categoryString, this.separator, id, eventName, infoString);
	}

	logBaseEvent(timestamp, categoryString, separator, id, eventName, infoString) {
		const str = timestamp + separator + categoryString + separator + id + separator + eventName + separator + infoString + "\n";
		this.writeToBaseLogFile(str);
	}

	logError(id, errorName, error, infoArgs) {
		// Log basic info in the log file and include a reference to a fuller entry in the error log file.
		this.errorCount++;

		const timestamp = new Date().toISOString();
		const categoryString = this.category + "_ERROR";
		const errorRefString = "#" + this.reference + "[" + this.errorCount + "]";
		const infoString = this.createInfoString(infoArgs);
	
		const str = timestamp + this.separator + categoryString + this.separator + id + this.separator + errorName + this.separator + errorRefString + this.separator + infoString + "\n";
		this.writeToLogFile(str);
	
		const errorString = errorRefString + "\n" + 
			"ERROR: " + error + "\n" +
			"ERROR STACK: " + error.stack + "\n\n";
	
		this.writeToErrorLogFile(errorString);

		this.logBaseError(timestamp, categoryString, this.separator, id, errorName, errorRefString, errorString, infoString);
	}

	// All other log error functions should call this one too.
	logBaseError(timestamp, categoryString, separator, id, errorName, errorRefString, errorString, infoString) {
		// Log basic info in the log file and include a reference to a fuller entry in the error log file.
		const str = timestamp + separator + categoryString + separator + id + separator + errorName + separator + errorRefString + separator + infoString + "\n";

		this.writeToBaseLogFile(str);
		this.writeToBaseErrorLogFile(errorString);
	}

	writeToLogFile(str) {
		this.doWrite(str, this.fileName, this.marker, this.sizeLimit)
	}

	writeToErrorLogFile(str) {
		this.doWrite(str, this.fileNameError, this.markerError, this.sizeLimitError)
	}

	writeToBaseLogFile(str) {
		this.doWrite(str, Logger.baseFileName, Logger.baseMarker, Logger.baseSizeLimit)
	}

	writeToBaseErrorLogFile(str) {
		this.doWrite(str, Logger.baseFileNameError, Logger.baseMarkerError, Logger.baseSizeLimitError)
	}

	doWrite(str, logFile, marker, sizeLimit) {
		// Write to log file, but if we error or the size would be too big then just print once to console.
		if(marker.length > 0) { return; }
	
		try {
			let currentSize = fs.statSync(logFile).size;
			let newSize = Buffer.byteLength(str, "utf8");
			let totalSize = currentSize + newSize;
		
			if(totalSize > sizeLimit) {
				marker.push(true);
				console.log("LOG FILE LIMIT REACHED: " + logFile);
				console.log("Last Log String: " + str);
			}
			else {
				fs.appendFileSync(logFile, str);
			}
		}
		catch(err) {
			marker.push(true);
			console.log("LOG FILE ERROR: " + logFile);
			console.log(err);
			console.log("Last Log String: " + str);
		}
	}

	createInfoString(infoArgs) {
		let s = "";
		for(let i = 0; i < infoArgs.length; i++) {
			s = s + infoArgs[i] + "|";
		}
		return s;
	}
}

function createLogFiles() {
	Logger.initialize();
	Logger.createLogger("GAME", "G", "logs/game_log.txt", "logs/game_error_log.txt");
	Logger.createLogger("CLIENT", "C", "logs/client_log.txt", "logs/client_error_log.txt");
	Logger.createLogger("SERVER", "S", "logs/server_log.txt", "logs/server_error_log.txt");
}

function logEvent(category, id, eventName, ...infoArgs) {
	const logger = Logger.getLogger(category);
	logger.logEvent(id, eventName, infoArgs);
}

function logError(category, id, errorName, error, ...infoArgs) {
	const logger = Logger.getLogger(category);
	logger.logError(id, errorName, error, infoArgs);
}

module.exports.createLogFiles = createLogFiles;
module.exports.logEvent = logEvent;
module.exports.logError = logError;