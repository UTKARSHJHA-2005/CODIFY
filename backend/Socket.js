import { io } from "socket.io-client";

export const initSock = (timeout = 50000) => {
    const options = {
        forceNew: true,
        reconnectionAttempts: "Infinity", 
        timeout: timeout, 
        transports: ["websocket"], 
    };
    return io("http://localhost:3000", options);
};
