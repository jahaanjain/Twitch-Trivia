// TODO
// - Format the answers recieved from the database
// - Add a bunch of Twitch Questions
// - Make UI look better
// - upload to github

// global variables
var triviaActive = false;
var triviaQuestion;
var triviaAnswer;
var triviaCategory = "tv";
var categories = [{ "tv": null, "science": null, "music": null }];
var channel = "abc123"; // default channel for now
var message; var started = false;

// debug var
var messageFull1;

function init() { // Happens on website load
    document.getElementById("displayTriviaQuestion").innerHTML = "Press the start button below, and the game will run by itself!";
    document.getElementById("category").innerHTML = "Category: " + triviaCategory;
    connect();
    fetch("http://jservice.io/api/clues?category=67") // Television
    .then(response => response.json())
    .then(json => categories.tv = json);
    fetch("http://jservice.io/api/clues?category=25") // Science
    .then(response => response.json())
    .then(json => categories.science = json);
    fetch("http://jservice.io/api/clues?category=770") // Pop Music
    .then(response => response.json())
    .then(json => categories.music = json);
}

function newQuestion() {
        if (!started) {
            var triviaPos = Math.floor(Math.random() * categories[triviaCategory].length);
            document.getElementById("displayTriviaQuestion").innerHTML = categories[triviaCategory][triviaPos].question;
            document.getElementById("answer").innerHTML = "?????";
            triviaQuestion = categories[triviaCategory][triviaPos].question;
            triviaAnswer = categories[triviaCategory][triviaPos].answer.split('>')[1].split('<')[0]; // <i>example</i>
            triviaActive = true; started = true;
            document.getElementById("newTriviaQuestion").innerHTML = "Started!";
            document.getElementById("newTriviaQuestion").disabled = true;
        }
        else {
            setTimeout(function() {
                var triviaPos = Math.floor(Math.random() * categories[triviaCategory].length);
                document.getElementById("displayTriviaQuestion").innerHTML = categories[triviaCategory][triviaPos].question;
                document.getElementById("answer").innerHTML = "?????";
                document.getElementById("newTriviaQuestion").innerHTML = "Started!";
                triviaQuestion = categories[triviaCategory][triviaPos].question;
                triviaAnswer = categories[triviaCategory][triviaPos].answer.split('>').pop().split('<')[0];
                triviaActive = true;
            }, 5 * 1000);
        }
}

function changeCategory() {
    triviaCategory = document.getElementById("categoryForm").value;
    console.log('detected change --> ' + triviaCategory);
    document.getElementById("category").innerHTML = "Category: " + triviaCategory;
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
        // messageFull1 = messageFull1.split(`;`);
        console.log(messageFull1);
        if (messageFull1.length >= 13 && triviaActive) {
            var username = messageFull1[3].split('=').pop();
            message = messageFull1[messageFull1.length - 1].split(`:`).pop();
            document.getElementById("chat").innerHTML = `Chat: ${username}: ${message}`;
            checkForAnswer();
        }
    };
}

function checkForAnswer() {
    if (triviaActive && triviaAnswer.toLowerCase() == message.toLowerCase()) {
        triviaActive = false;
        document.getElementById("answer").innerHTML = triviaAnswer;
        document.getElementById("newTriviaQuestion").innerHTML = "Next question starting in 5 seconds!";
        triviaQuestion = '';
        triviaAnswer = undefined;
        newQuestion();
    }
}