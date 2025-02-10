// This the page when the user joins the room.
import React, { useState, useEffect, useRef } from "react";
import binary from "../assets/binary-code.png"; // Logo
import * as monaco from "monaco-editor"; // Monaco where the code is to be written
import { initSock } from "../../../backend/Socket"; // For socket connection
import { AI_Prompt, chatSession } from "../AIModel"; // AI model for analysis
import { ToastContainer, toast } from "react-toastify"; // For notifications
import { useNavigate, useParams, useLocation } from "react-router-dom"; // For navigation

function Sidebar() {
    const [users, setUsers] = useState([]); // Users
    const [code, setCode] = useState(""); // Code
    const [isChatOpen, setIsChatOpen] = useState(false); // Chat open/close
    const [messages, setMessages] = useState([]); // Messages
    const [newMessage, setNewMessage] = useState(""); // New message
    const navigate = useNavigate();
    const { roomId } = useParams(); // Getting room id from url
    const coderef = useRef(code); // Code reference
    const socketref = useRef(null);// Socket reference
    const editorRef = useRef(null);// Editor reference
    const editorContainerRef = useRef(null);
    const location = useLocation();
    const messagesEndRef = useRef(null); // Messages end reference

    // Random color generator for users
    const randomColor = () => {
        const colors = [
            "bg-gradient-to-br from-pink-500 to-rose-500",
            "bg-gradient-to-br from-green-400 to-emerald-500",
            "bg-gradient-to-br from-blue-400 to-indigo-500",
            "bg-gradient-to-br from-yellow-400 to-amber-500"
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Smooth scrolling to bottom of chat.
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // When message state updates, scroll to bottom.
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // When routing,roomid updates, socket connection works.
    useEffect(() => {
        // Initialize the socket connection.
        const init = async () => {
            socketref.current = initSock();
            // If connenction fails
            socketref.current.on("connect_error", handleError); 
            function handleError(e) { 
                console.error("Socket error:", e);
                toast.error("Socket connection error");
                navigate("/");
            }
            // Emits the join event to server.
            socketref.current.emit("join", { 
                roomId,
                username: location.state?.username,
            });
            // Triggers joined event on server by sending user in the room and new user.
            socketref.current.on("joined", ({ clients, username }) => { 
                // If the user is not the current user.
                if (username !== location.state?.username) { 
                    toast.success(`${username} joined the room`);
                }
                setUsers((prevUsers) => {
                    const uniqueUsers = new Map(prevUsers.map((user) => [user.id, user])); // Stores users in map with id as key.
                    clients.forEach((client) => { // This adds the user in the room with name,id,color.
                        if (!uniqueUsers.has(client.socketid)) {
                            uniqueUsers.set(client.socketid, {
                                id: client.socketid,
                                name: client.username,
                                color: randomColor(),
                            });
                        }
                    });
                    return Array.from(uniqueUsers.values());// Converts the map into array.
                });
            });
            // Sends the current code to the server via event.
            socketref.current.emit("sync_code", { 
                code: coderef.current,
                socketid,
            });
            // If the recieved code is different from the current, it updates the editor.
            socketref.current.on("code_change", ({ code }) => { 
                if (editorRef.current && code !== coderef.current) {
                    editorRef.current.setValue(code);
                    coderef.current = code;
                }
            });
            // Updates the user list by removing the user who left.
            socketref.current.on("left", ({ username }) => { 
                toast.info(`${username} left the room`);
                setUsers((prevUsers) =>
                    prevUsers.filter((user) => user.name !== username)
                );
            });
            // Adds the new message to the existing messages.
            socketref.current.on("chat_message", ({ username, message }) => { 
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { username, message },
                ]);
            });
        };
        // Ensures that the user has valid state information before proceeding.
        if (!location.state) {
            navigate("/");
        } else { // otherwise init function calls.
            init();
        }
        return () => { // Disconnect the socket when user leaves the room.
            socketref.current?.disconnect();
        };
    }, [location.state, navigate, roomId]);

    // When the room id changes, Initialize the monaco editor.
    useEffect(() => {
        // Retrieves the saved code from local storage and sets it in the editor.
        const savedCode = localStorage.getItem(`code_${roomId}`) || "";
        setCode(savedCode);
        coderef.current = savedCode;
        // Creates the monaco editor.
        const editor = monaco.editor.create(editorContainerRef.current, {
            value: savedCode,
            language: "javascript",
            theme: "vs-dark",
            lineNumbers: "on",
            automaticLayout: true,
        });
        // If the code change in the editor, updates the code in localstorage and emits the server.
        editor.onDidChangeModelContent(() => {
            const updatedCode = editor.getValue();
            if (updatedCode !== coderef.current) {
                setCode(updatedCode);
                coderef.current = updatedCode;
                socketref.current.emit("code_change", { roomId, code: updatedCode });
                localStorage.setItem(`code_${roomId}`, updatedCode);
            }
        });
        editorRef.current = editor;
        // Prevents the layout issues when resizing the browser.
        const resizeObserver = new ResizeObserver(() => {
            editor.layout();
        });
        if (editorContainerRef.current) {
            resizeObserver.observe(editorContainerRef.current);
        }
        // Disposes the editor to free up memory and disconnect the resize observer. 
        return () => {
            editor.dispose();
            resizeObserver.disconnect();
        };
    }, [roomId]);

    // Editor layout shrinks when chat is open. 
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.layout();
        }
    }, [isChatOpen]);

    // Copy the room id to clipboard.
    const copyRoomId = () => {
        if (!roomId) { // If room id is not available.
            toast.error("Room ID is unavailable!");
            return;
        }
        try {
            navigator.clipboard.writeText(roomId);
            toast.success("Room ID copied to clipboard!");
        } catch (err) { // Error handling.
            console.error("Failed to copy Room ID:", err);
            toast.error("Failed to copy Room ID!");
        }
    };

    // Leave the room and navigates to the home page.
    const leaveRoom = () => {
        socketref.current?.emit("leave", { roomId });
        navigate("/");
    };

    // Sends the message in chat.
    const sendMessage = () => {
        if (newMessage.trim()) {
            socketref.current.emit("chat_message", { // Triggers chat_message event on server.
                username: location.state?.username,
                message: newMessage,
            });
            setMessages((prevMessages) => [ // Updates the chat state to display the sent message. 
                ...prevMessages,
                { username: "You", message: newMessage },
            ]);
            setNewMessage(""); // Clears the input field after sending message.
        }
    };

    // AI analysis of the code.
    const analyzeCode = async () => {
        try {
            const FINAL_PROMPT = AI_Prompt.replace('{code}', code); // Replacing in the AI prompt.
            const result = await chatSession.sendMessage(FINAL_PROMPT); // Sending the prompt to the AI.
            const responseText = result?.response?.text(); // Getting the response from the AI.
            console.log(responseText);
            const formattedResponse = formatText(responseText); // Formatting the response.
            socketref.current.emit("chat_message", { // Triggers chat_message event on server.
                username: "AI",
                message: formattedResponse,
            });
            setMessages((prevMessages) => [ // Updates the chat state to display the AI response.
                ...prevMessages,
                { username: "AI", message: formattedResponse },
            ]);
            toast.success("Code analyzed successfully!")
        } catch (error) { // Error Handling.
            console.error("Error analyzing code:", error);
            socketref.current.emit("chat_message", {
                username: "AI",
                message: "Error analyzing the code. Please try again later.",
            });
            setMessages((prevMessages) => [
                ...prevMessages,
                { username: "AI", message: "Error analyzing the code. Please try again later." },
            ]);
            toast.error("Error analyzing the code. Please try again later.");
        }
    };

    // Formatting the AI message so that user will not face issues in reading the text.
    const formatText = (text) => {
        const cleanedText = text.replace(/[`*]/g, ''); // Remove backticks and asterisks
        const formattedText = cleanedText.replace(/(\d+\.)/g, '\n$1'); // Add line breaks after numbers
        const boldPattern = /\*\*\*(.*?)\*\*\*/g; // Regular expression to match bold text
        return formattedText.split(boldPattern).map((part, index) => { // Split the text into parts
            // If it's a bold part, wrap it in <strong> tags. Otherwise return the part as is.
            if (index % 2 !== 0) { 
                return <strong key={index}>{part}</strong>;
            }
            return part; 
        });
    };

    return (
        <div className="h-screen bg-slate-900 text-white relative flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 p-6 flex flex-col">
                {/* Title */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src={binary} alt="Binary Code" className="h-[50px] w-[120px] mx-auto mb-4" />
                    </div>
                    <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        CODEITFY
                    </h1>
                </div>
                {/* AI Analysis Button */}
                <button
                    onClick={analyzeCode}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl 
                   text-white font-medium hover:brightness-110 transition-all duration-300 mb-6 
                   flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Analyze with AI
                </button>
                {/* Connected Users */}
                <div className="space-y-3 mb-6">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Connected Users</h2>
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                            <div className={`${user.color} w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg`}>
                                {user.name.split(" ").map((word) => word[0]).join("")}
                            </div>
                            <span className="font-medium">{user.name}</span>
                        </div>
                    ))}
                </div>
                {/* Bottom Actions */}
                <div className="mt-auto space-y-3">
                    <button
                        onClick={copyRoomId}
                        className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded-xl font-medium transition-colors flex items-center 
                        justify-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy Room ID
                    </button>
                    <button
                        onClick={leaveRoom}
                        className="w-full bg-gradient-to-r from-rose-500 to-pink-500 p-3 rounded-xl font-medium hover:brightness-110 
                        transition-all duration-300 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Leave Room
                    </button>
                </div>
            </div>
            {/* Main Content */}
            <div className="flex-1 flex">
                {/* Editor */}
                <div ref={editorContainerRef} className={`h-full ${isChatOpen ? 'w-2/3' : 'w-[98%]'} transition-all duration-300`} />
                {/* Chat Panel */}
                {isChatOpen && (
                    <div className="w-1/3 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700/50 flex flex-col">
                        <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Chat Room</h2>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        {/* Message */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className="group">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-sm font-bold">
                                            {msg.username[0]}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-sm text-slate-300">{msg.username}</p>
                                            <p className="text-white mt-1">{msg.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        {/* Chat Input */}
                        <div className="p-4 border-t border-slate-700/50">
                            <div className="flex gap-2">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} 
                                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type your message..."
                                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 focus:outline-none 
                                    focus:ring-2 focus:ring-green-500/50 placeholder-slate-500"/>
                                <button onClick={sendMessage}
                                className="bg-gradient-to-r from-green-400 to-emerald-500 p-2 rounded-lg hover:brightness-110 transition-all 
                                duration-300">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Chat Toggle Button */}
            {!isChatOpen && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="absolute top-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg hover:brightness-110 
                    transition-all duration-300 shadow-lg flex items-center justify-center text-xl">
                    💬
                </button>
            )}
            {/* Toast Container */}
            <ToastContainer />
        </div>
    );
}

export default Sidebar;
