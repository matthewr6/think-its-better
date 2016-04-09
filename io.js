const Nedb = require('nedb');
const players = new Nedb({ filename: 'db.json', autoload: true });
const thingsDb = new Nedb({ filename: 'things.json', autoload: true });

thingsDb.ensureIndex({
    fieldName: 'name',
    unique: true
})

var MAX_COUNT = 10000;

var BETWEEN_GAMES = 5000;

var BASIC_CATEGORIES = [
    {
        name: 'Honda',
        type: 'car_make',
        active: false
    },
    {
        name: 'Toyota',
        type: 'car_make',
        active: false
    },
    {
        name: 'Ford',
        type: 'car_make',
        active: false
    }, 
    {
        name: 'Hyundai',
        type: 'car_make',
        active: false
    },
    {
        name: 'Coke',
        type: 'drink',
        active: false
    },
    {
        name: 'Pepsi',
        type: 'drink',
        active: false
    },
    {
        name: 'Sprite',
        type: 'drink',
        active: false
    },
    {
        name: 'Mountain Dew',
        type: 'drink',
        active: false
    },
    {
        name: 'Asus',
        type: 'tech_company',
        active: false
    },
    {
        name: 'Dell',
        type: 'tech_company',
        active: false
    },
    {
        name: 'HP',
        type: 'tech_company',
        active: false
    },
    {
        name: 'Samsung',
        type: 'tech_company',
        active: false
    },
    {
        name: 'Facebook',
        type: 'social_media',
        active: false
    },
    {
        name: 'Twitter',
        type: 'social_media',
        active: false
    },
    {
        name: 'Snapchat',
        type: 'social_media',
        active: false
    },
    {
        name: 'Instagram',
        type: 'social_media',
        active: false
    },
];

function getUniqueValues(arr, key) {
    var unique = [];
    for (var i = 0; i < arr.length; i++) {
        if (unique.indexOf(arr[i][key]) < 0) {
            unique.push(arr[i][key]);
        }
    }
    return unique;
}

function randVal(items) {
    return items[Math.floor(Math.random()*items.length)];
}

function shuffle(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

var CATEGORIES = getUniqueValues(BASIC_CATEGORIES, 'type');

var OPT_ONE = undefined;
var OPT_TWO = undefined;

var OPT_ONE_VOTES = 0;
var OPT_TWO_VOTES = 0;

var WINNING_OPT;

var LEADERBOARD_SIZE = 5;

function resetRound() {
    thingsDb.update({}, { $set: { active: undefined, votes: undefined } }, { multi: true });
    OPT_ONE_VOTES = 0;
    OPT_TWO_VOTES = 0;
    players.update({}, { $set: { betting: 0, betOpt: null } }, { multi: true });
}

function game(io) {
    var countdown = MAX_COUNT;
    var gameLoop = setInterval(function() {
        countdown--;
        if (countdown % 10 == 0) io.sockets.emit('update', countdown);
        if (countdown == 0) {
            countdown = MAX_COUNT;
            var winner;
            if (OPT_ONE_VOTES > OPT_TWO_VOTES) {
                winner = 1;
            } else if (OPT_TWO_VOTES > OPT_ONE_VOTES) {
                winner = 2;
            } else {
                winner = undefined;
            }
            WINNING_OPT = winner;
            io.sockets.emit('roundEnd', winner);
            newGame(io, gameLoop);
        }
    }, 1);
}

function newGame(io, loop) {
    clearInterval(loop);
    //display stuff
    resetRound();
    var roundCategory = randVal(CATEGORIES);
    thingsDb.find({
        type: roundCategory
    }, function(err, data) {
        data = shuffle(data);
        OPT_ONE = data[0]._id;
        OPT_TWO = data[1]._id;
        thingsDb.update({
            $or: [{ _id: data[0]._id }, { _id: data[1]._id }]
        }, {
            $set: { active: true, votes: 0 }
        }, {
            multi: true
        }, function(err) {
            io.sockets.emit('bettingBegin', [data[0], data[1]]);
            var countdown = MAX_COUNT;
            var interval = setInterval(function() {
                countdown--;
                if (countdown % 10 == 0) io.sockets.emit('update', MAX_COUNT - countdown);
                if (countdown == 0) {
                    io.sockets.emit('roundBegin', [data[0], data[1]]);
                    clearInterval(interval);
                    game(io);
                }
            }, 1);
        });
    });
}


module.exports = function(io) {
    thingsDb.insert(BASIC_CATEGORIES)
    game(io);
    io.on('connection', function(socket) {
        var id = '';
        var player = {
            name: 'anon',
            points: 0,
            betting: 0,
            betOpt: null
        }
        var pid = undefined;
        socket.on('initConn', function(u) {
            player.name = u || 'anon';
            players.insert(player, function(err, newDoc) {
                pid = newDoc._id;
                socket.emit('confirmedConn', pid);
            });
        });
        socket.on('bet', function(amount) {
            player.betting = amount;
            player.points -= amount;
            if (player.points < 0) player.points = 0;
            players.update({
                _id: pid
            }, {
                $set: { betting: amount, points: player.points },
            }, { returnUpdatedDocs: true }, function(err, n, data) {
                socket.emit('updateScore', data.points);
            });
        });
        socket.on('vote', function(which) {
            if (which.vote == 1) {
                OPT_ONE_VOTES++;
                thingsDb.update({
                    _id: OPT_ONE
                }, { $inc: {
                    votes: 1
                }}, function(err) {
                    io.sockets.emit('votedOne', OPT_ONE_VOTES);
                    players.update({
                        _id: which.pid
                    }, { $set: {
                        betOpt: 1
                    }}, function(err) {
                        player.betOpt = 1;
                    });
                });
            } else if (which.vote == 2) {
                OPT_TWO_VOTES++;
                thingsDb.update({
                    _id: OPT_TWO
                }, { $inc: {
                    votes: 1
                }}, function(err) {
                    io.sockets.emit('votedTwo', OPT_TWO_VOTES);
                    players.update({
                        _id: which.pid
                    }, { $set: {
                        betOpt: 2
                    }}, function(err) {
                        player.betOpt = 2;
                    });
                });
            }
        });
        socket.on('reqScore', function() {
            if (player.betOpt && player.betOpt == WINNING_OPT) {
                players.update({
                    _id: pid
                }, { $inc: {
                    points: (player.betting * 2) + 1
                }}, { returnUpdatedDocs: true }, function(err, n, data) {
                    player.points = data.points;
                    socket.emit('updateScore', player.points);
                    players.find({}, function(err, data) {
                        data.sort(function(a, b) {
                            return b - a;
                        });
                        io.sockets.emit('updateLeaderboard', data.slice(0, LEADERBOARD_SIZE + 1));
                    });
                });
            } else {
                socket.emit('updateScore', player.points);
            }
        });
        socket.on('disconnect', function() {
            players.remove({
                _id: pid
            });
        });
    });
}