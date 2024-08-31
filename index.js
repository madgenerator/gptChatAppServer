const express = require("express");
const cors = require('cors');
const socketIo = require("socket.io");
const http = require("http");
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: "sk-svcacct-YqiH857BG9GrragcWyRMlD6iljWkYMpfGTKFsIYyc9BTVBGT3BlbkFJBD-trybAHjuuVLRFQ87vkVM2qWf3ttNkOGrkgzzSlB-TkAA",  // key는 User(front) 아닌 Bot(Server) 용으로 생성
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
    const language = "japanese"; //data.Language

    try {
        const result = await sendGPTTranslate(data.Message,language); // await 추가
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
async function sendGPTTranslate(prompt, language) {
  try {
    //질문 - body에
    let text1 = prompt;
    console.log("[QUESTION] "+ text1);
    let text2 = prompt + ":" +"translate it in "+language+".";

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', //"gpt-4o" //"gpt-4o-mini"
      messages: [
        { role: 'user', content: text2 }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    result = response.choices[0].message.content.trim();
    console.log('Response:', result);
    return result;

  } 
  catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}
