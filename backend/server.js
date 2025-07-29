import http from "http"; // Creates http server (for socket.io).
import express from "express"; // Handles http server.
import { Server } from "socket.io"; // Enables real-time communication.
import cors from "cors"; // Allows requests from frontent hosted.
const app = express();

// Enables CORS to enable communcation between frontend and backend.
app.use(cors());
app.use(cors({
    origin: "https://codify-blue.vercel.app/",
}));

app.use(express.json());// Parses incoming JSON requests.

const server = http.createServer(app); // Wraps Express with an HTTP server.

// Initializes Socket.io with CORS to allow WebSocket connections from frontend.
const io = new Server(server, { 
    cors: {
        origin: "https://codify-blue.vercel.app/",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
    },
});

const usersocketmap = {};// Stores usernames mapped to their socket id.

// Retrieves all connected users in the room by converting socket id to array and maps to their username. 
function getallclient(roomid) {
    return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map((socketid) => {
        return {
            socketid,
            username: usersocketmap[socketid],
        };
    });
}

// New websocket connection.
io.on("connection", (socket) => {
    console.log("Socket Connected:", socket.id);
    // Working of socket when room joins.
    socket.on('join', ({ roomid, username }) => {
        // Stores the username in usersocketmap as socket id as key and user joins the room.
        usersocketmap[socket.id] = username;
        socket.join(roomid);
        // Fetches all connected users and notifies in the room.
        const clients = getallclient(roomid);
        console.log(clients);
        io.to(roomid).emit('joined', {
            clients,
            username,
            socketid: socket.id,
        });
    });
    // Working of socket when room leaves.
    socket.on('leave', ({ roomid }) => {
        socket.leave(roomid);
        delete usersocketmap[socket.id];// Deletes the user from usersocketmap.
        // Broadcasts the user lists after the user list and notifies in the room.
        const clients = getallclient(roomid);
        io.to(roomid).emit('left', {
            username: usersocketmap[socket.id],
            clients,
        });
    });
    // When one user changes code, broadcasts it to everyone in the room.
    socket.on('code_change', ({ roomid, code }) => {
        socket.broadcast.to(roomid).emit('code_change', { code });
    });
    // Ensures the user leaves all rooms when they disconnect or deleted from the usersocketmap.
    socket.on('disconnect', () => {
        for (let roomid of Object.keys(socket.rooms)) {
            socket.leave(roomid);
        }
        delete usersocketmap[socket.id];
    });
});

// Starts the server on port 3000.
const PORT = 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
