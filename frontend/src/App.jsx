import './App.css'
import Home from './pages/Home'
import Editor from './pages/Editor'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"

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
