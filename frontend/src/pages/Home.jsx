// This is the starting page where the user can create its own room by creating a new room id or can join the room by inputting the room id.
import React, { useState } from 'react';
import binary from "../assets/binary-code.png"; // Image
import uniqid from 'uniqid'; // For getting the room id
import { ToastContainer, toast } from 'react-toastify'; // For notifications
import { useNavigate } from 'react-router-dom'; // For navigation

export default function Home() {
    const [roomId, setRoomId] = useState(''); // State to store the room ID
    const [username, setUsername] = useState(''); // State to store the username
    const navigate = useNavigate(); // For navigation of pages

    // Creates the new room with the unique id
    const create = (e) => {
        e.preventDefault();
        const id = uniqid(); // Provides the unique id
        setRoomId(id); // Fills the input box with the new room id
        toast.success("Created a new room");
    };

    // Joins the room. 
    const handleJoin = () => {
        // Checks that the roomid and username is filled.
        if (!roomId || !username) {
            toast.error("Username and Room ID are required");
            return;
        }
        console.log("Navigating with Room ID and Username:", roomId, username);
        navigate(`/edit/${roomId}`, { state: { username } }); // Navigates to the room page with the help of room id.
    };

    // If the enter is pressed at the end of the input field, then also proceeds.
    const handleInputEnter = (e) => {
        if (e.code === "Enter") handleJoin();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>
            {/* Main container */}
            <div className="w-full max-w-md relative">
                {/* Card */}
                <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-500">
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="text-green-400 mb-3">
                                <img src={binary} alt="Binary Code" className="h-[70px] w-[70px] mx-auto mb-4" />
                            </div>
                            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
                                Join Session
                            </h1>
                            <p className="text-slate-400">Connect and collaborate in real-time</p>
                        </div>
                        {/* Form */}
                        <div className="space-y-6">
                            <input type="text" placeholder="Enter Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)}
                                onKeyUp={handleInputEnter}
                                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white 
                            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 
                            transition-all"/>
                            <input type="text" placeholder="Your Username" value={username} onChange={(e) => setUsername(e.target.value)}
                                onKeyUp={handleInputEnter}
                                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white 
                            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 
                            transition-all"/>
                            {/* Join Button */}
                            <button onClick={handleJoin}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-slate-900 font-semibold px-5 py-4 
                            rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                                <span>Join Session</span>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12H19M19 12L12 5M19 12L12 19" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            {/* Create Room Link */}
                            <div className="relative pt-4 text-center group">
                                <span className="text-slate-400 text-sm">
                                    Need a new room?{' '}
                                    <button onClick={create}
                                        className="inline-flex items-center text-green-400 hover:text-green-300 font-medium transition-colors 
                                    relative group-hover:underline underline-offset-4 decoration-2">
                                        Create one now
                                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-green-400 transform scale-x-0 
                                        group-hover:scale-x-100 transition-transform origin-left"></span>
                                    </button>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Toast Container */}
            <ToastContainer />
        </div>
    );
}
