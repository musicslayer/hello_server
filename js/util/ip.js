function getIPAddressFromRequest(req) {
    return req.socket.remoteAddress;
}

function getIPAddressFromSocket(socket) {
    return socket.handshake.address;
}

module.exports.getIPAddressFromRequest = getIPAddressFromRequest;
module.exports.getIPAddressFromSocket = getIPAddressFromSocket;