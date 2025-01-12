import React, { useState, useEffect, useRef } from "react";
import binary from "../assets/binary-code.png";
import * as monaco from "monaco-editor";
import { initSock } from "../../../backend/Socket";
import { AI_Prompt, chatSession } from "../AIModel";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate, useParams, useLocation } from "react-router-dom";

function Sidebar() {
    const [users, setUsers] = useState([]);
    const [code, setCode] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const navigate = useNavigate();
    const { roomId } = useParams();
    const coderef = useRef(code);
    const socketref = useRef(null);
    const editorRef = useRef(null);
    const editorContainerRef = useRef(null);
    const location = useLocation();

    const randomColor = () => {
        const colors = ["bg-red-500", "bg-green-500", "bg-blue-500", "bg-yellow-500"];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    useEffect(() => {
        const init = async () => {
            socketref.current = await initSock();
            socketref.current.on("connect_error", handleError);
            socketref.current.on("connect_failed", handleError);
            function handleError(e) {
                console.error("Socket error:", e);
                toast.error("Socket connection error");
                navigate("/");
            }
            socketref.current.emit("join", {
                roomId,
                username: location.state?.username,
            });
            socketref.current.on("joined", ({ clients, username, socketid }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the room`);
                }
                setUsers((prevUsers) => {
                    const uniqueUsers = new Map(prevUsers.map((user) => [user.id, user]));
                    clients.forEach((client) => {
                        uniqueUsers.set(client.socketid, {
                            id: client.socketid,
                            name: client.username,
                            color: randomColor(),
                        });
                    });
                    return Array.from(uniqueUsers.values());
                });
                socketref.current.emit("sync_code", {
                    code: coderef.current,
                    socketid,
                });
            });
            socketref.current.on("code_change", ({ code }) => {
                if (editorRef.current && code !== coderef.current) {
                    editorRef.current.setValue(code);
                    coderef.current = code;
                }
            });
            socketref.current.on("left", ({ username }) => {
                toast.info(`${username} left the room`);
                setUsers((prevUsers) =>
                    prevUsers.filter((user) => user.name !== username)
                );
            });
            socketref.current.on("chat_message", ({ username, message }) => {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { username, message },
                ]);
            });
        };
        if (!location.state) {
            navigate("/");
        } else {
            init();
        }
        return () => {
            socketref.current?.disconnect();
        };
    }, [location.state, navigate, roomId]);

    useEffect(() => {
        const savedCode = localStorage.getItem(`code_${roomId}`) || "";
        setCode(savedCode);
        coderef.current = savedCode;
        const editor = monaco.editor.create(editorContainerRef.current, {
            value: savedCode,
            language: "javascript",
            theme: "vs-dark",
            lineNumbers: "on",
            automaticLayout: true,
        });
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
        const resizeObserver = new ResizeObserver(() => {
            editor.layout();
        });
        if (editorContainerRef.current) {
            resizeObserver.observe(editorContainerRef.current);
        }
        return () => {
            editor.dispose();
            resizeObserver.disconnect();
        };
    }, [roomId]);
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.layout();
        }
    }, [isChatOpen]);
    const copyRoomId = () => {
        if (!roomId) {
            toast.error("Room ID is unavailable!");
            return;
        }
        try {
            navigator.clipboard.writeText(roomId);
            toast.success("Room ID copied to clipboard!");
        } catch (err) {
            console.error("Failed to copy Room ID:", err);
            toast.error("Failed to copy Room ID!");
        }
    };

    const leaveRoom = () => {
        socketref.current?.emit("leave", { roomId });
        navigate("/");
    };

    const sendMessage = () => {
        if (newMessage.trim()) {
            socketref.current.emit("chat_message", {
                username: location.state?.username,
                message: newMessage,
            });
            setMessages((prevMessages) => [
                ...prevMessages,
                { username: "You", message: newMessage },
            ]);
            setNewMessage("");
        }
    };
    const analyzeCode = async () => {
        try {
            const FINAL_PROMPT = AI_Prompt.replace('{code}', code);
            const result = await chatSession.sendMessage(FINAL_PROMPT);
            const responseText = result?.response?.text();
            console.log(responseText);
            const formattedResponse = formatText(responseText);
            socketref.current.emit("chat_message", {
                username: "AI",
                message: formattedResponse,
            });
            setMessages((prevMessages) => [
                ...prevMessages,
                { username: "AI", message: formattedResponse },
            ]);
            toast.success("Code analyzed successfully!")
        } catch (error) {
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
    const formatText = (text) => {
        const cleanedText = text.replace(/[`*]/g, '');
        const formattedText = cleanedText.replace(/(\d+\.)/g, '\n$1');
        const boldPattern = /\*\*\*(.*?)\*\*\*/g;
        return formattedText.split(boldPattern).map((part, index) => {
            if (index % 2 !== 0) {
                return <strong key={index}>{part}</strong>;
            }
            return part;
        });
    };


    return (
        <div className="flex h-screen bg-gray-900 text-white relative">
            <div className="w-1/7 md:w-1/5 bg-gray-800 p-4 min-h-screen flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 items-center rounded-md">
                        <img src={binary} className="h-[50px] w-[50px] mx-auto mb-4" alt="Code Logo" />
                    </div>
                    <h1 className="text-lg text-center text-white font-semibold">CODEITFY</h1>
                </div>
                <button
                    onClick={analyzeCode}
                    className="w-full bg-blue-500 text-white p-2 rounded-lg text-sm mb-2 hover:bg-blue-400">
                    Analyze Code with AI
                </button>
                <div className="flex flex-col gap-4 mb-6">
                    {users.map((user) => (
                        <div key={user.id} className="flex items-center gap-2">
                            <div
                                className={`${user.color} w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold`}>
                                {user.name.split(" ").map((word) => word[0]).join("")}
                            </div>
                            <p className="text-white">
                                {user.name}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="mt-auto">
                    <button
                        onClick={copyRoomId}
                        className="w-full bg-white text-black p-2 rounded-lg text-sm mb-2 hover:bg-gray-300">
                        Copy ROOM ID
                    </button>
                    <button
                        onClick={leaveRoom}
                        className="w-full bg-green-500 p-2 rounded-lg text-sm hover:bg-green-400">
                        Leave
                    </button>
                </div>
            </div>

            <div className="flex-grow flex flex-row">
                {isChatOpen && (
                    <div className="w-1/4 bg-gray-700 p-4 flex flex-col shadow-lg overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Chat</h2>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="text-red-500 font-bold">
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto mb-4">
                            {messages.map((msg, index) => (
                                <div key={index} className="mb-2">
                                    <strong className="font-semibold">{msg.username}:</strong>{" "}
                                    <span>{msg.message}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="w-full p-2 bg-gray-800 text-white rounded-lg"
                                placeholder="Type a message"
                            />
                            <button
                                onClick={sendMessage}
                                className="ml-2 bg-blue-500 text-white p-2 rounded-lg">
                                Send
                            </button>
                        </div>
                    </div>
                )}

                <div ref={editorContainerRef} className={`h-full ${isChatOpen ? "w-[900px]" : "w-full"} bg-gray-800`}></div>
            </div>
            <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="absolute top-4 right-4 bg-blue-500 text-white p-2 rounded-lg text-sm hover:bg-blue-400 z-50">
                {isChatOpen ? "" : "🗪"}
            </button>
            <ToastContainer />
        </div>
    );
}

export default Sidebar;
