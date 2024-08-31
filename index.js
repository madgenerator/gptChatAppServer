const express = require("express");
const cors = require('cors');
const socketIo = require("socket.io");
const http = require("http");
const path = require("path");

const app = express();
app.use(cors()); // CORS 설정

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", // 모든 출처 허용 (개발 및 테스트 환경)
    methods: ["GET", "POST"]
  }
});

io.on("connection", function(socket){
    console.log("somebody connected our server!!");
    console.log("FROM IP :" + socket.handshake.address);

    socket.on("chatMessage", function(data){
        console.log("Received Data: " + data);
        io.emit("chatMessage", data);
    });
});

const PORT = process.env.PORT || 3000; // Heroku에서 제공하는 포트를 사용하고, 없으면 3000 포트 사용
server.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
});

// default response
app.get("/", (req, res) => {
  res.send("welcome to chatting Server");
});