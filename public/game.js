var displayName = undefined;
var key = 0;
var socket = io();

var progressBar = document.getElementById('progress');
var MAX_COUNT = 10000;

var optOne = document.getElementById('opt1');
var optTwo = document.getElementById('opt2');

var pointDisp = document.getElementById('points');
var winnerDisp = document.getElementById('winner');

var bettingWindow = document.getElementById('betting-window');
var bet = document.getElementById('bet');
var betButton = document.getElementById('bet-button');

var OPT_ONE_NAME, OPT_TWO_NAME;
var OPT_ONE_VOTES = 0;
var OPT_TWO_VOTES = 0;

function updateLeaderboard(data) {
    console.log(data);
}

var VOTED = false;
var BET = false;

var P_ID;

var POINTS = 0;

socket.on('connect', function() {
    document.getElementById('entrance').addEventListener('click', function() {
        displayName = document.getElementById('nickname').value;
        if (displayName) {
            socket.emit('initConn', displayName);
            socket.on('confirmedConn', function(data) {
                document.getElementById('gray-background').classList.add('hidden');
                P_ID = data;
            });
        }
    });
    document.getElementById('nickname').addEventListener('keyup', function(e) {
        if (e.keyCode == 13) {
            displayName = document.getElementById('nickname').value;
            if (displayName) {
                socket.emit('initConn', displayName);
                socket.on('confirmedConn', function(data) {
                    document.getElementById('gray-background').classList.add('hidden');
                    P_ID = data;
                });
            }
        }
    });
    betButton.addEventListener('click', function() {
        socket.emit('bet', bet.value);
        bet.value = 0;
    });
    optOne.addEventListener('click', function() {
        if (!optOne.classList.contains('disabled') && !VOTED) {
            socket.emit('vote', { vote: 1, pid: P_ID });
            VOTED = true;
        }
    });
    optTwo.addEventListener('click', function() {
        if (!optTwo.classList.contains('disabled') && !VOTED) {
            socket.emit('vote', { vote: 2, pid: P_ID });
            VOTED = true;
        }
    });
    socket.on('update', function(count) {
        progressBar.style.width = Math.round(100 * ((MAX_COUNT - count) / MAX_COUNT)) + '%';
    });
    socket.on('roundEnd', function(winner) {
        progressBar.style.width = '0%';
        optOne.classList.add('disabled');
        optTwo.classList.add('disabled');

        winnerDisp.classList.remove('hidden');
        if (winner == 1) {
            winnerDisp.textContent = OPT_ONE_NAME + " won!";
        } else if (winner == 2) {
            winnerDisp.textContent = OPT_TWO_NAME + " won!";
        } else {
            winnerDisp.textContent = "Neither option won!";
        }

        optOne.textContent = '...';
        optTwo.textContent = '...';

        socket.emit('reqScore');
    });
    socket.on('updateLeaderboard', function(leaders) {
        updateLeaderboard(leaders);
    });
    socket.on('updateScore', function(score) {
        POINTS = score;
        pointDisp.textContent = POINTS + (POINTS == 1 ? ' point' : ' points');
        bet.max = score;
    });
    socket.on('votedOne', function(data) {
        OPT_ONE_VOTES = data;
        OPT_ONE_NAME = OPT_ONE_NAME || optOne.textContent.split(' - ')[0];
        optOne.textContent = OPT_ONE_NAME + ' - ' + OPT_ONE_VOTES;
    });
    socket.on('votedTwo', function(data) {
        OPT_TWO_VOTES = data;
        OPT_TWO_NAME = OPT_TWO_NAME || optTwo.textContent.split(' - ')[0];
        optTwo.textContent = OPT_TWO_NAME + ' - ' + OPT_TWO_VOTES;
    });
    socket.on('bettingBegin', function(data) {
        BET = false;
        bettingWindow.classList.remove('hidden');

        OPT_ONE_NAME = data[0].name;
        OPT_TWO_NAME = data[1].name;
        optOne.textContent = data[0].name;
        optTwo.textContent = data[1].name;

        bettingWindow.classList.remove('hidden');
    });
    socket.on('roundBegin', function(data) {
        VOTED = false;
        winnerDisp.classList.add('hidden');
        bettingWindow.classList.add('hidden');
        if (displayName) {
            optOne.classList.remove('disabled');
            optTwo.classList.remove('disabled');
            optOne.textContent = data[0].name + ' - 0';
            optTwo.textContent = data[1].name + ' - 0';
        }
    });
});