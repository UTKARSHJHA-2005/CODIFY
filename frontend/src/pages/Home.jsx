import React, { useState } from 'react';
import binary from "../assets/binary-code.png";
import uniqid from 'uniqid';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function Home() {
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    const create = (e) => {
        e.preventDefault();
        const id = uniqid();
        setRoomId(id); 
        toast.success("Created a new room");
    };

    const handleJoin = () => {
        if (!roomId || !username) {
            toast.error("Username and Room ID are required");
            return;
        }
        console.log("Navigating with Room ID and Username:", roomId, username);
        navigate(`/edit/${roomId}`, { state: { username } });
    };

    const handleInputEnter = (e) => {
        if (e.code === "Enter") handleJoin();
    };

    return (
        <div className="flex items-center justify-center h-screen bg-slate-900">
            <div className="bg-gray-800 opacity-90 text-white p-8 rounded-lg shadow-xl w-[400px]">
                <img src={binary} alt="Binary Code" className="h-[50px] w-[50px] mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-4 text-center">Paste invitation ROOM ID</h2>
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="ROOM ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        onKeyUp={handleInputEnter} />
                    <input
                        type="text"
                        placeholder="USERNAME"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-gray-700 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        onKeyUp={handleInputEnter} />
                    <button
                        onClick={handleJoin}
                        className="bg-green-500 text-black py-2 px-4 rounded-lg font-semibold hover:bg-green-400 transition">
                        Join
                    </button>
                </div>
                <p className="text-gray-400 text-sm mt-4 text-center">
                    If you don't have an invite, then create{' '}
                    <span onClick={create} className="text-green-500 cursor-pointer hover:underline">New Room</span>
                </p>
            </div>
            <ToastContainer />
        </div>
    );
}
