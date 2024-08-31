const express = require("express");
const cors = require('cors');
const socketIo = require("socket.io");
const http = require("http");
const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: "sk-svcacct-YqiH857BG9GrragcWyRMlD6iljWkYMpfGTKFsIYyc9BTVBGT3BlbkFJBD-trybAHjuuVLRFQ87vkVM2qWf3ttNkOGrkgzzSlB-TkAA",  // key는 User(front) 아닌 Bot(Server) 용으로 생성
});

// 사용자 정보 저장을 위한 객체
const userInfo = {};
const languageList = {};

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

  //기본은 english
  userInfo[socket.id] = { language: "English" }; 
  if (!languageList.includes("English")) {
    languageList.push("English");
    console.log(`New language added: ${"English"}`);
  }

  // 사용자가 언어를 설정할 때
  socket.on("setLanguage", function(Language){
    userInfo[socket.id] = { language: Language };

    // 언어가 목록에 없으면 추가합니다.
    if (!languageList.includes(Language)) {
      languageList.push(Language);
      console.log(`New language added: ${Language}`);
    }
  });

  //채팅 메세지 입력할 때 
  socket.on("chatMessage", async function(data) { // async 추가
    console.log("Received Data: " + data.ID+" : "+data.Message);
    const language = "English"; //data.Language

    const message = data.Message;

    // 번역된 메시지를 저장할 객체
    const translations = {};

    // 필요한 언어에 대해 번역을 수행합니다.
    for (const language of languageList) {
      try {
        // 클라이언트의 언어로 번역된 메시지를 가져옵니다.
        const translatedMessage = await sendGPTTranslate(message, language);
        translations[language] = translatedMessage;
      } 
      catch (error) {
        console.error("Error translating message:", error);
        translations[language] = "[Translation Failed]: " + message;
      }
    }

    // userInfo 의 clientId를 key, user를 value로 반환 (clientId 에 해당하는 값을 반환 (language: Language))
    for (const [clientId, user] of Object.entries(userInfo)) {
      const userLanguage = user.language;
      const translatedMessage = translations[userLanguage] || `[Translation Failed]: ${message}`;
      io.to(clientId).emit("chatMessage", { ID: data.ID, Message: translatedMessage });
    }
    
    /*
    try {
        const result = await sendGPTTranslate(data.Message,language); // await 추가
        const resultData = { ID: data.ID, Message: result };
        io.emit("chatMessage", resultData);
    } catch (error) {
        console.error("Error translating message:", error);
        const resultData = { ID: data.ID, Message: "[Translation Failed]:"+data.Message };
        io.emit("chatMessage", resultData);
    }
    */

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
