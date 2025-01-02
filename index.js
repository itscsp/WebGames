const http = require("http");
const app = require("express")();
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"))

app.listen(8081, () => {
    console.log("Listen to port 8081")
})
const websocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(8080, () => console.log("Listening on port 8080"));

//hashmap to store clients
const clients = {}
//hashmap to store game
const games = {};

const wsServer = new websocketServer({
    "httpServer": httpServer
});

wsServer.on("request", request => {
    // # CONNECT
    const connection = request.accept(null, request.origin);

    connection.on("open", () => console.log("Opened!"));
    connection.on("close", () => console.log("Closed!"));
    connection.on("message", message => {
        // console.log(`Received message ${message.utf8Data}`);
        // connection.send(`Received message ${message.utf8Data}`);

        const result = JSON.parse(message.utf8Data);

        //I have received a message from client
        //a user want to create a new game

        // # CREATE GAME
        if(result.method === "create"){
            result.clientId = result.clientId;
            const gameId = guid();
            games[gameId] = {
                "id": gameId,
                "balls": 20,
                "clients": []
            }

            const payLoad = {
                "method": "create",
                "game": games[gameId]
            }

            const con = clients[clientId].connection;
            con.send(JSON.stringify(payLoad));

        }

        // # JOIN GAME
        if(result.method === 'join'){
            const clientId = result.clientId;
            const gameId = result.gameId;
            const game = games[gameId];
            if(game.clients.langth >= 3) {
                // Return if player is more than 3
                return;
            }

            const colorCode = {
                "0": "Red",
                "1":"Green",
                "2": "Blue"
            }

            game.clients.push({
                "clientId": clientId,
                "color": colorCode[game.clients.length]
            })

            const payLoad = {
                "method":'join',
                "game": game
            }

            //Loop through all client and tell them that people has joined
            game.clients.forEach(client => {
                clients[client.clientId].connection.send(JSON.stringify(payLoad))
            })

        }
    });

    //Generate a new clientId
    const clientId = guid();
    clients[clientId] = {
        "connection": connection
    };

    const payLoad = {
        "method": "connect",
        "clientId": clientId
    }

    // Send back the client connect
    connection.send(JSON.stringify(payLoad));

 })


// Following code will generate guid
function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
}
 
// then to call it, plus stitch in '4' in the third group
const guid = () => (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();