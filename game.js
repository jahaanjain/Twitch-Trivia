// TODO
// - Format the answers recieved from the database
// - Add a bunch of Twitch Questions
// - Make UI look better

// global variables
var triviaActive = false;
var triviaQuestion;
var triviaAnswer;
var triviaCategory = "Science";
var categories = [{ "Random": null, "Science": null, "Music": null, "Movies": null, "Games": null }];
var channel = "abc123"; // default channel for now
var message;
var timeToAnswer = 30, // 30 seconds
        display = document.querySelector('#timeLeft');
var leaderboardJSON = [];
var a;

$.getScript("fuzzyset.js", function() { console.log('FuzzySet Loaded.') });

document.getElementById('buttone').onclick = function() {
    var channel = document.getElementById('channelForm').value;
    if (channel.length > 1) {
        init(channel); console.log('Channel logged, everything is ready!');
        var tl = gsap.timeline();
        tl.add( gsap.to("#intro", { opacity: 0, x: -1000, y: -1000, duration: 0.5, onComplete: tl1Done}) );
        tl.add( gsap.from("#main", { opacity: 0, ease: "Power2.easeOut", duration: 1}) );
        function tl1Done() {
            document.getElementById("intro").style.display = "none";
            document.getElementById("main").style.display = "block";
        }
    }
    else { alert('Please enter a channel name!'); console.log('no channel'); }
};

// debug var
var messageFull1;

function init(channelName) { // Happens on website load
    channel = channelName;
    document.getElementById("displayTriviaQuestion").innerHTML = "Press the start button below, and the game will run by itself!";
    document.getElementById("category").innerHTML = "Category: " + triviaCategory;
    leaderboard(true);
    connect();
    const PROXYURL = 'https://cors-anywhere.herokuapp.com/';
    fetch(PROXYURL + "https://puu.sh/FAGg9/d997fbc12e.json") // Random
    .then(response => response.json())
    .then(json => categories.Random = json);
    fetch(PROXYURL + "https://puu.sh/FAG27/a3ef4536ea.json") // Science
    .then(response => response.json())
    .then(json => categories.Science = json);
    fetch(PROXYURL + "https://puu.sh/FAG2w/56383f66b5.json") // Pop Music
    .then(response => response.json())
    .then(json => categories.Music = json);
    fetch(PROXYURL + "https://puu.sh/FAGl1/c8d3541ac6.json") // Movies
    .then(response => response.json())
    .then(json => categories.Movies = json);
    fetch(PROXYURL + "https://puu.sh/FAGcJ/16bcdff269.json") // Games
    .then(response => response.json())
    .then(json => categories.Games = json);
    document.getElementById("skipQuestion").disabled = true;
}

function newQuestion() {
    var triviaPos = Math.floor(Math.random() * categories[triviaCategory].length);
    document.getElementById("displayTriviaQuestion").innerHTML = categories[triviaCategory][triviaPos].question;
    document.getElementById("answer").innerHTML = "Answer: ?????";
    document.getElementById("newTriviaQuestion").innerHTML = "Started!";
    document.getElementById("newTriviaQuestion").disabled = true;
    document.getElementById("skipQuestion").disabled = false;
    triviaQuestion = categories[triviaCategory][triviaPos].question;
    triviaAnswer = categories[triviaCategory][triviaPos].answer.replace(/<[^>]*>/g, '').replace("^\"|\"$", "");
    triviaActive = true;
    a = FuzzySet([`${triviaAnswer}`], false);
    console.log('Trivia Answer: ' + triviaAnswer);
    startTimer(timeToAnswer, display);
}

function changeCategory() {
    if (document.getElementById("categoryForm").value !== "default") {
        triviaCategory = document.getElementById("categoryForm").value;
        document.getElementById("category").innerHTML = "Category: " + triviaCategory;
        console.log('detected change --> ' + triviaCategory);
    }
}

function connect() {

    const chat = new WebSocket("wss://irc-ws.chat.twitch.tv");
    var timeout = setTimeout(function() {
        chat.close();
        chat.connect();
    }, 10 * 1000);

    chat.onopen = function() {
        clearInterval(timeout);
        chat.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership");
        chat.send("PASS oauth:xd123");
        chat.send("NICK justinfan123");
        chat.send("JOIN #" + channel);
    };

    chat.onerror = function() {
        console.log("disconnected from twitch irc");
        chat.close();
        self.connect();
    };

    chat.onmessage = function(event) {
        messageFull1 = event.data.split(/\r\n/)[0].split(`;`);
        // console.log(messageFull1);
        if (messageFull1.length >= 13 && triviaActive) {
            var username = messageFull1[3].split('=').pop();
            var color = messageFull1[2].split('=').pop();
            username = colorStyle(color, username);
            message = messageFull1[messageFull1.length - 1].split(`:`).pop();
            var checkMessage = messageFull1[messageFull1.length - 1].split(`:`).pop();
            message = colorStyle('#f5f5f5', message);
            if (message.length > 100) { message = message.substring(0, 100) + "..."; }
            document.getElementById("chat").innerHTML = `${username}: ${message}`;
            checkForAnswer(username, checkMessage, false);
        }
    };
}

function colorStyle(color, text) { return '<span style="color:' + color + '">' + text + '</span>'; }

function checkForAnswer(username, message, forced) {
    try {
        var usernameNoFormat = username.split(`">`).pop().split(`</`)[0];
        var b = a.get(message);
        if (forced || (triviaActive && typeof b !== 'null' && b[0][0] > 0.8)) {
            triviaActive = false;
            document.getElementById("answer").innerHTML = 'Answer: ' + triviaAnswer;
            document.getElementById("newTriviaQuestion").innerHTML = username + " got the answer right!";
            document.getElementById("skipQuestion").disabled = true;
            stopTimer();
            triviaQuestion = '';
            triviaAnswer = undefined;
            var timeleft = 5;
            if (leaderboardJSON.some(obj => obj.username === username)) {
                for (var i = 0; i < leaderboardJSON.length; i++) {
                    if (leaderboardJSON[i].username == username) { leaderboardJSON[i].points += 1; }
                }
            } 
            else { if (usernameNoFormat !== 'Nobody') { leaderboardJSON.push({ "username": username, "points": 1 }); } }
            if (usernameNoFormat !== 'Nobody') { leaderboard(false); }
            var nextQuestionTimer = setInterval(function() {
                if (timeleft <= 0) {
                    clearInterval(nextQuestionTimer);
                    document.getElementById("newTriviaQuestion").innerHTML = "Started!";
                    newQuestion();
                } else {
                    document.getElementById("newTriviaQuestion").innerHTML = "Next question starting in " + timeleft + " seconds!";
                }
                timeleft -= 1;
            }, 1000);
        }
    } catch (error) { console.log(`A guess was incorrect.`); }
}

function startTimer(duration, display) {
    var timer = duration, minutes, seconds;
    mainTimer = setInterval(function () {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            timer = 0;
            checkForAnswer('Nobody', 'Nobody', true);
        }
    }, 1000);
}
function stopTimer() { clearInterval(mainTimer); }

function leaderboard(reset) {
    let topPlayers = 5;
    if (!reset) {
        function compare(a,b) { return a.points - b.points; }
        var sortedArray = leaderboardJSON.sort(compare);
        var table = document.getElementById("leaderboard");
        while (table.rows.length > 0) { table.deleteRow(0); }
        var row = table.insertRow(0);
        var usernameCell = row.insertCell(0);
        var pointsCell = row.insertCell(1);
        usernameCell.innerHTML = "&nbsp;&nbsp;&nbsp;Username&nbsp;&nbsp;&nbsp;";
        pointsCell.innerHTML = "&nbsp;&nbsp;&nbsp;Points&nbsp;&nbsp;&nbsp;";
        for (var i = 0; i < sortedArray.length; i++) {
            if (i > topPlayers) { break; }
            else {
                var row = table.insertRow(1);
                var usernameCell = row.insertCell(0);
                var pointsCell = row.insertCell(1);
                usernameCell.innerHTML = "&nbsp;&nbsp;" + sortedArray[i].username + "&nbsp;&nbsp;";
                pointsCell.innerHTML = "&nbsp;&nbsp;" + sortedArray[i].points + "&nbsp;&nbsp;";
            }
        }
    }
    else {
        var table = document.getElementById("leaderboard");
        while (table.rows.length > 0) { table.deleteRow(0); }
        var row = table.insertRow(0);
        var usernameCell = row.insertCell(0);
        var pointsCell = row.insertCell(1);
        usernameCell.innerHTML = "&nbsp;&nbsp;&nbsp;Username&nbsp;&nbsp;&nbsp;";
        pointsCell.innerHTML = "&nbsp;&nbsp;&nbsp;Points&nbsp;&nbsp;&nbsp;";
        for (var i = 0; i <= topPlayers; i++) {
            var row = table.insertRow(1);
            var usernameCell = row.insertCell(0);
            var pointsCell = row.insertCell(1);
            usernameCell.innerHTML = "&nbsp;";
            pointsCell.innerHTML = "&nbsp;";
        }
    }
}