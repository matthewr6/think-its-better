const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

/*
    would you rather/choose the better one game
    w/points for betting which will win
*/

function init() {
    app.use(express.static('public'));
    
    require('./io.js')(io);
    
    http.listen(3000, function() {
        //
    });
}

init();