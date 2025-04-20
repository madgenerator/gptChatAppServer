const express = require("express");
const cors = require('cors');
const socketIo = require("socket.io");
const http = require("http");
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ 프론트엔드 주소를 변수로 관리
const CHAT_FRONTEND_ORIGIN = process.env.CHAT_FRONTEND_URL;

// 사용자 정보 저장
const userInfo = {};
const languageList = [];

const app = express();

// ✅ CORS 설정
app.use(cors({
    origin: CHAT_FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true
}));

const server = http.createServer(app);

// ✅ Socket.IO CORS 설정
const io = socketIo(server, {
    cors: {
        origin: CHAT_FRONTEND_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on("connection", function(socket){
    console.log("somebody connected our server!!");
    console.log("FROM IP :" + socket.handshake.address);

    userInfo[socket.id] = "English";
    if (!languageList.includes("English")) {
        languageList.push("English");
        console.log(`New language added: English`);
    }

    socket.on("setLanguage", function(Language){
        userInfo[socket.id] = Language;

        if (!languageList.includes(Language)) {
            languageList.push(Language);
            console.log(`New language added: ${Language}`);
        }
    });

    socket.on("chatMessage", async function(data) {
        console.log("Received Data: " + data.ID + " : " + data.Message);
        const message = data.Message;
        const translations = {};

        for (const language of languageList) {
            try {
                const translatedMessage = await sendGeminiTranslate(message, language);
                translations[language] = translatedMessage;
            }
            catch (error) {
                console.error("Error translating message:", error);
                translations[language] = "[Translation Failed]: " + message;
            }
        }

        for (const [socketId, language] of Object.entries(userInfo)) {
            const translatedMessage = translations[language] || `[Translation Failed]: ${message}`;
            io.to(socketId).emit("chatMessage", {
                ID: data.ID,
                Message: translatedMessage,
                ProfileNum: data.ProfileNum
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
});

app.get("/", (req, res) => {
    res.send("welcome to chatting Server");
});

async function sendGeminiTranslate(prompt, language) {
    try {
        let text2 = prompt + ": translate it in " + language + ". 번역 결과만 딱 전달해줘. 다른 설명은 절대 하지말고";
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent(text2);
        const response = await result.response;
        const translatedMessage = response.text();
        console.log('Response:', translatedMessage);
        return translatedMessage;
    }
    catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        return "[Translation Failed]: " + prompt;
    }
}
