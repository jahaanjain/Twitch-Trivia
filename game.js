// TODO
// - Format the answers recieved from the database
// - Add a bunch of Twitch Questions
// - Make UI look better

// global variables
var triviaActive = false;
var triviaQuestion;
var triviaAnswer;
var triviaCategory = "Science";
var categories = [{ "TV": null, "Science": null, "Music": null, "Twitch": null }];
var channel = "abc123"; // default channel for now
var message;
var timeToAnswer = 30, // 30 seconds
        display = document.querySelector('#timeLeft');
var leaderboardJSON = [];


document.getElementById('buttone').onclick = function() {
    var channel = document.getElementById('channelForm').value;
    if (channel.length > 1) {
        init(channel); console.log('channel logged');
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

    connect();
    fetch("http://jservice.io/api/clues?category=67") // Television
    .then(response => response.json())
    .then(json => categories.TV = json);
    fetch("http://jservice.io/api/clues?category=25") // Science
    .then(response => response.json())
    .then(json => categories.Science = json);
    fetch("http://jservice.io/api/clues?category=770") // Pop Music
    .then(response => response.json())
    .then(json => categories.Music = json);
}

function newQuestion() {
    var triviaPos = Math.floor(Math.random() * categories[triviaCategory].length);
    document.getElementById("displayTriviaQuestion").innerHTML = categories[triviaCategory][triviaPos].question;
    document.getElementById("answer").innerHTML = "?????";
    document.getElementById("newTriviaQuestion").innerHTML = "Started!";
    document.getElementById("newTriviaQuestion").disabled = true;
    triviaQuestion = categories[triviaCategory][triviaPos].question;
    triviaAnswer = categories[triviaCategory][triviaPos].answer.replace(/<[^>]*>/g, '').replace("^\"|\"$", "");
    triviaActive = true;
    console.log(triviaAnswer);
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
        console.log(messageFull1);
        if (messageFull1.length >= 13 && triviaActive) {
            var username = messageFull1[3].split('=').pop();
            var color = messageFull1[2].split('=').pop();
            username = colorStyle(color, username);
            message = messageFull1[messageFull1.length - 1].split(`:`).pop();
            message = colorStyle('#f5f5f5', message);
            if (message.length > 100) { message = message.substring(0, 100) + "..."; }
            document.getElementById("chat").innerHTML = `${username}: ${message}`;
            checkForAnswer(username, false);
        }
    };
}

function colorStyle(color, text) { return '<span style="color:' + color + '">' + text + '</span>'; }

function checkForAnswer(username, forced) {
    if (triviaActive && triviaAnswer.toLowerCase() == message.toLowerCase() || forced) {
        triviaActive = false;
        document.getElementById("answer").innerHTML = triviaAnswer;
        document.getElementById("newTriviaQuestion").innerHTML = username + " got the answer right!";
        stopTimer();
        triviaQuestion = '';
        triviaAnswer = undefined;
        var timeleft = 5;
        if (leaderboardJSON.some(obj => obj.username === username)) {
            for (var i = 0; i < leaderboardJSON.length; i++) {
                if (leaderboardJSON[i].username == username) { leaderboardJSON[i].points += 1; }
            }
        } 
        else { leaderboardJSON.push({ "username": username, "points": 1 }); }
        if (username !== 'Nobody') { leaderboard(false); }
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
            checkForAnswer('Nobody', true);
        }
    }, 1000);
}
function stopTimer() { clearInterval(mainTimer); }

function leaderboard(reset) {
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
            if (i > 3) { break; }
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
        var row = table.insertRow(1);
        var usernameCell = row.insertCell(0);
        var pointsCell = row.insertCell(1);
        usernameCell.innerHTML = "&nbsp;";
        pointsCell.innerHTML = "&nbsp;";
    }
}