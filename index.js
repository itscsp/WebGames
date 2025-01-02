const http = require("http");
const app = require("express")();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"))

app.listen(8081, () => {
    console.log("Listen to port 8081")
})
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(8080, () => console.log("Listening on port 8080"));

const clients = {}
const games = {};

const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    const connection = request.accept(null, request.origin);

    connection.on("open", () => console.log("Opened!"));
    connection.on("close", () => console.log("Closed!"));
    connection.on("message", message => {
        const result = JSON.parse(message.utf8Data);

        if(result.method === "create"){
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "balls": 100,
                "clients": [],
                "scores": {},
                "timeLeft": 60,
                "isActive": false,
                "ballOwners": {}
            }

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            }

            const con = clients[result.clientId].connection;
            con.send(JSON.stringify(payLoad));
        }

        if(result.method === 'join'){
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if (game.clients.length >= 3) return;

            const colorCode = {
                "0": "Red",
                "1": "Green",
                "2": "Blue"
            }

            game.clients.push({
                "clientId": clientId,
                "color": colorCode[game.clients.length]
            })
            game.scores[clientId] = 0;

            if(game.clients.length === 3) {
                game.isActive = true;
                startGameTimer(gameId);
            }

            const payLoad = {
                "method": 'join',
                "game": game
            }

            game.clients.forEach(client => {
                clients[client.clientId].connection.send(JSON.stringify(payLoad))
            })
        }

        if(result.method === 'play'){
            const gameId = result.gameId;
            const ballId = result.ballId;
            const clientId = result.clientId;
            const color = result.color;
            const game = games[gameId];

            if (!game.isActive) return;

            let state = game.state;
            if (!state) state = {};

            // If ball was owned by someone else, decrease their score
            if (game.ballOwners[ballId] && game.ballOwners[ballId] !== clientId) {
                game.scores[game.ballOwners[ballId]] -= 1;
            }
            
            // If this is a new claim for this player
            if (game.ballOwners[ballId] !== clientId) {
                game.scores[clientId] += 1;
            }

            state[ballId] = color;
            game.ballOwners[ballId] = clientId;
            games[gameId].state = state;
            
            updateGameState();
        }
    });

    const clientId = guid();
    clients[clientId] = {
        "connection": connection
    };

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }

    connection.send(JSON.stringify(payLoad));
});

function startGameTimer(gameId) {
    const interval = setInterval(() => {
        const game = games[gameId];
        if (!game || !game.isActive) {
            clearInterval(interval);
            return;
        }

        game.timeLeft -= 1;

        if (game.timeLeft <= 0) {
            game.isActive = false;
            const winner = Object.entries(game.scores).reduce((a, b) => b[1] > a[1] ? b : a);
            
            const payLoad = {
                "method": "gameOver",
                "winner": winner[0],
                "scores": game.scores
            };

            game.clients.forEach(client => {
                clients[client.clientId].connection.send(JSON.stringify(payLoad));
            });

            clearInterval(interval);
        }
    }, 1000);
}

function updateGameState() {
    for(const g of Object.keys(games)) {
        const game = games[g]
        const payLoad = {
            "method": "update",
            "game": game
        }

        game.clients.forEach(c=> {
            clients[c.clientId].connection.send(JSON.stringify(payLoad))
        })
    }
    setTimeout(updateGameState, 500);
}

function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();