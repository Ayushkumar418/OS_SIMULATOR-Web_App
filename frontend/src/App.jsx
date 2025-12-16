import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CPUScheduler from './pages/CPUScheduler';
import MemoryManagement from './pages/MemoryManagement';
import ContiguousAllocator from './pages/ContiguousAllocator';
import PagingSimulator from './pages/PagingSimulator';
import SegmentationSimulator from './pages/SegmentationSimulator';
import FileSystem from './pages/FileSystem';
import './App.css';

function App() {
    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/cpu-scheduler" element={<CPUScheduler />} />
                    <Route path="/memory" element={<MemoryManagement />} />
                    <Route path="/memory/contiguous" element={<ContiguousAllocator />} />
                    <Route path="/memory/paging" element={<PagingSimulator />} />
                    <Route path="/memory/segmentation" element={<SegmentationSimulator />} />
                    <Route path="/filesystem" element={<FileSystem />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
