const fs = require("fs");

let server;

eval(fs.readFileSync("js/email.js")+"");
eval(fs.readFileSync("js/error.js")+"");
eval(fs.readFileSync("js/http.js")+"");
eval(fs.readFileSync("js/log.js")+"");
eval(fs.readFileSync("js/rate_limit.js")+"");
eval(fs.readFileSync("js/socketIO.js")+"");
eval(fs.readFileSync("js/url.js")+"");

/////////////////////
// Development code:
/////////////////////

// Create some starter accounts.
initializeAccount("mr_a", "fluffy", "a@gmail.com");
initializeAccount("mr_c", "other", "c@hotmail.com");

// Make mr_c start off as powerful.
setGameData("mr_c", "is_powerful", true);