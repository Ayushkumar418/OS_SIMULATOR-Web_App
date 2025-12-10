import { Link } from 'react-router-dom';
import './MemoryManagement.css';

const MemoryManagement = () => {
    return (
        <div className="memory-management">
            <header className="page-header">
                <div className="container">
                    <Link to="/" className="back-link">← Back to Dashboard</Link>
                    <h1 className="page-title">Memory Management</h1>
                    <p className="page-subtitle">Paging, Page Tables, and Page Replacement Algorithms</p>
                </div>
            </header>

            <main className="page-main container">
                <div className="coming-soon">
                    <div className="coming-soon-icon">💾</div>
                    <h2>Memory Management Module</h2>
                    <p>Interactive paging and page replacement visualization</p>
                    <div className="features-list">
                        <div className="feature-item">✓ Page table visualization</div>
                        <div className="feature-item">✓ Virtual to physical address translation</div>
                        <div className="feature-item">✓ Page fault simulation</div>
                        <div className="feature-item">✓ Page replacement algorithms (FIFO, LRU, Optimal)</div>
                    </div>
                    <p className="coming-soon-note">
                        This module is functional via the API and ready for frontend integration.
                        <br />
                        Use the API endpoints to test memory operations.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default MemoryManagement;
