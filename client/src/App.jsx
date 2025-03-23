import { Route, Routes } from 'react-router-dom';
import './App.css'
import Entry from "./pages/Entry";
import Cam from './pages/Cam';

function App() {
    return <div>
        <Routes>
            <Route path="/" element={<Entry/>}></Route>
            <Route path="/cam" element={<Cam/>}></Route>
        </Routes>
    </div>
}

export default App
