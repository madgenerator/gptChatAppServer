const express = require("express");
const cors = require('cors');
const socketIo = require("socket.io");
const http = require("http");
const path = require("path");
const axios = require('axios'); // axios 모듈 불러오기

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
const apiKey = "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";
const url = 'https://api.openai.com/v1/chat/completions';

async function sendGPTTranslate(userInput){
  try {
    //인증 - header에
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };


    //질문 - body에
    let text1 = userInput;
    console.log("[QUESTION] "+ text1);
    let text2 = userInput + ":" +"translate it in Japanese.";
        
    const payload = {
      model: "gpt-3.5-turbo",//"gpt-4o" //"gpt-4o-mini"
      messages: [{ role: "user", content: text2 }],
      temperature: 0.7
    };

    console.log("URL:", url);
    console.log("Headers:", headers);
    console.log("Payload:", payload);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
          model: 'gpt-3.5-turbo', // 또는 'gpt-4'
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
      },
      {
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}` // 올바른 API 키를 포함
          }
      }
  );

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    const responseMessage = responseData.choices[0].message.content;
    console.log(responseMessage);
    return responseMessage;
  } 
  catch (error) {
    console.error("Error:", error);
  }
}
