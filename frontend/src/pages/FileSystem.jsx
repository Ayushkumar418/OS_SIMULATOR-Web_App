import { Link } from 'react-router-dom';
import './FileSystem.css';

const FileSystem = () => {
    return (
        <div className="filesystem">
            <header className="page-header">
                <div className="container">
                    <Link to="/" className="back-link">← Back to Dashboard</Link>
                    <h1 className="page-title">File System</h1>
                    <p className="page-subtitle">Block-Level File Operations and Visualization</p>
                </div>
            </header>

            <main className="page-main container">
                <div className="coming-soon">
                    <div className="coming-soon-icon">📁</div>
                    <h2>File System Module</h2>
                    <p>Interactive file system operations and block visualization</p>
                    <div className="features-list">
                        <div className="feature-item">✓ Create/Read/Write/Delete files</div>
                        <div className="feature-item">✓ Directory management</div>
                        <div className="feature-item">✓ Block allocation visualization</div>
                        <div className="feature-item">✓ Inode and metadata tracking</div>
                    </div>
                    <p className="coming-soon-note">
                        This module is functional via the API and ready for frontend integration.
                        <br />
                        Use the API endpoints to test file system operations.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default FileSystem;
