const fs = require("fs");

const secretsJSON = fs.readFileSync("secrets.json");
const secretMap = new Map(Object.entries(JSON.parse(secretsJSON)));

function getSecret(key) {
    return secretMap.get(key);
}

module.exports.getSecret = getSecret;