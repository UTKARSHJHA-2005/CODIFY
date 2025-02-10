import './App.css'
import Home from './pages/Home'; // Home Page
import Editor from './pages/Editor'; // Code Collaboration page
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; // For routing of pages

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/edit/:roomId" element={<Editor />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
