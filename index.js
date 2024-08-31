const express = require("express");
const cors = require('cors');
const socketIo = require("socket.io");
const http = require("http");
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: "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",  // 여기에 OpenAI API 키를 입력하세요
});

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

  socket.on("chatMessage", async function(data) { // async 추가
    console.log("Received Data: " + data.ID+" : "+data.Message);

    try {
        const result = await sendGPTTranslate(data.Message); // await 추가
        const resultData = { ID: data.ID, Message: result };
        io.emit("chatMessage", resultData);
    } catch (error) {
        console.error("Error translating message:", error);
        const resultData = { ID: data.ID, Message: "[Translation Failed]:"+data.Message };
        io.emit("chatMessage", resultData);
    }
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


//GPT Setup
async function sendGPTTranslate(prompt) {
  try {
    //질문 - body에
    let text1 = prompt;
    console.log("[QUESTION] "+ text1);
    let text2 = prompt + ":" +"translate it in Japanese.";

    const response = await openai.completions.create({
      model: "gpt-3.5-turbo",//"gpt-4o" //"gpt-4o-mini"
      prompt: text2,
      temperature: 0.7
    });

    result = response.choices[0].text.trim();
    console.log('Response:', result);
    return result;

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}
