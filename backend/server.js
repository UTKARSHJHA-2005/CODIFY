import http from "http";
import express from "express";
import fetch from "node-fetch";
import { Server } from "socket.io";
import cors from "cors";
const app = express();
app.use(cors());
app.use(cors({
    origin: "http://localhost:5173",
}));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
    },
});
const usersocketmap = {};
function getallclient(roomid) {
    return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map((socketid) => {
        return {
            socketid,
            username: usersocketmap[socketid],
        };
    });
}
io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);
    socket.on('join', ({ roomid, username }) => {
        usersocketmap[socket.id] = username;
        socket.join(roomid);
        const clients = getallclient(roomid);
        console.log(clients);
        io.to(roomid).emit('joined', {
            clients,
            username,
            socketid: socket.id,
        });
    });
    socket.on('leave', ({ roomid }) => {
        socket.leave(roomid);
        delete usersocketmap[socket.id];
        const clients = getallclient(roomid);
        io.to(roomid).emit('left', {
            username: usersocketmap[socket.id],
            clients,
        });
    });
    socket.on('code_change', ({ roomid, code }) => {
        socket.broadcast.to(roomid).emit('code_change', { code });
    });
    socket.on('disconnect', () => {
        for (let roomid of Object.keys(socket.rooms)) {
            socket.leave(roomid);
        }
        delete usersocketmap[socket.id];
    });
});

// app.post('/analyze-code', async (req, res) => {
//     const code = req.body;
//     console.log("Received code:", code);

//     if (!code) {
//         return res.status(400).json({ error: "Code is required" });
//     }

//     try {
//         const apiKey = "AIzaSyCfU1mnmPjJ06bN2cZ-HJVBjr5titBlOyk";  
//         const apiUrl = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-001:generateText";
//         const response = await fetch(apiUrl, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${apiKey}`,
//             },
//             body: JSON.stringify({
//                 model: "gemini-1.5-pro-001",
//                 prompt: `Analyze the following JavaScript code:\n${code}`,
//             }),
//         });
//         const rawData = await response.text(); 
//         console.log("Raw response from Gemini API:", rawData);
//         if (!response.ok) {
//             throw new Error(`API request failed with status ${response.status}: ${rawData}`);
//         }
//         let parsedData;
//         try {
//             parsedData = JSON.parse(rawData);
//         } catch (e) {
//             console.error("Failed to parse response as JSON:", e);
//             throw new Error("Invalid JSON response from Gemini API");
//         }

//         if (!parsedData || !parsedData.result) {
//             throw new Error("Invalid response format from Gemini API");
//         }

//         res.json({ result: parsedData.result });

//     } catch (error) {
//         console.error("Error analyzing code:", error);
//         res.status(500).json({ error: error.message || "Internal server error" });
//     }
// });



const PORT = 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));