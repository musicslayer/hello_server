const http = require("./server/http.js");
const log = require("./util/log.js");
const socket_io = require("./server/socket_io.js");

// Create server to serve the web pages.
const server = http.createHTTPServer();

// Create server to communicate between front and back ends.
const io = socket_io.createSocketIOServer(server);

// Create the log files.
log.createLogFiles();

log.logServerEvent("main", "Server Initialized");

/////////////////////
// Development code:
/////////////////////

// Create some starter accounts.
socket_io.initializeAccount("mr_a", "fluffy", "a@gmail.com");
socket_io.initializeAccount("mr_c", "other", "c@hotmail.com");

// Make mr_c start off as powerful.
socket_io.setGameData("mr_c", "is_powerful", true);