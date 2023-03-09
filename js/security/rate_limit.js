// Rate limit is 100 requests every minute per IP Address.
const RATELIMIT_RECORDS = new Map();
const RATELIMIT_COUNT = 100;
const RATELIMIT_COUNT_MAX = 1000000;
const RATELIMIT_RESET_TIME = 5000; //milliseconds

setInterval(() => {
	// Reset the rate limit data every interval.
	RATELIMIT_RECORDS.clear();
}, RATELIMIT_RESET_TIME);

function isRateLimited(ip) {
	let record = RATELIMIT_RECORDS.get(ip);
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

module.exports.isRateLimited = isRateLimited;