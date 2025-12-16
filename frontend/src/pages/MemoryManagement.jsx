import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import './MemoryManagement.css';

function MemoryManagement() {
    const navigate = useNavigate();

    const modules = [
        {
            id: 'contiguous',
            title: 'Contiguous Memory Allocation',
            icon: '📦',
            description: 'Visualize First Fit, Best Fit, Worst Fit, and Next Fit allocation algorithms with real-time fragmentation analysis.',
            features: ['4 Allocation Algorithms', 'Fragmentation Metrics', 'ASCII Diagrams', 'Algorithm Comparison'],
            status: 'implemented',
            path: '/memory/contiguous',
            color: '#3b82f6'
        },
        {
            id: 'paging',
            title: 'Paging Simulation',
            icon: '📄',
            description: 'Simulate paged memory management with page replacement algorithms (FIFO, LRU, Optimal) and page fault analysis.',
            features: ['Page Replacement', 'Page Fault Analysis', 'TLB Simulation', 'Multi-level Paging'],
            status: 'implemented',
            path: '/memory/paging',
            color: '#8b5cf6'
        },
        {
            id: 'segmentation',
            title: 'Segmentation Simulation',
            icon: '🧩',
            description: 'Explore segmented memory organization with segment tables, dynamic segment allocation, and protection mechanisms.',
            features: ['Segment Tables', 'Dynamic Allocation', 'Protection Bits', 'Segment Addressing'],
            status: 'implemented',
            path: '/memory/segmentation',
            color: '#ec4899'
        },
        {
            id: 'virtual-memory',
            title: 'Virtual Memory',
            icon: '🔄',
            description: 'Understand virtual memory concepts with demand paging, page replacement strategies, and working set visualization.',
            features: ['Demand Paging', 'Thrashing Analysis', 'Working Set Model', 'Page Fault Handling'],
            status: 'coming-soon',
            path: '/memory/virtual',
            color: '#10b981'
        }
    ];

    const handleNavigate = (module) => {
        if (module.status === 'implemented') {
            navigate(module.path);
        }
    };

    return (
        <div className="memory-management-page">
            {/* Header */}
            <div className="page-header">
                <button className="back-button" onClick={() => navigate('/')}>
                    ← Dashboard
                </button>
                <div className="header-content">
                    <h1>Memory Management</h1>
                    <p className="header-description">
                        Explore different memory management techniques and algorithms used in modern operating systems
                    </p>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="modules-grid">
                {modules.map((module, index) => (
                    <motion.div
                        key={module.id}
                        className={`module-card ${module.status}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        onClick={() => handleNavigate(module)}
                        style={{ borderColor: module.color }}
                    >
                        <div className="module-header">
                            <div className="module-icon" style={{ background: `${module.color}20` }}>
                                {module.icon}
                            </div>
                            {module.status === 'implemented' ? (
                                <span className="status-badge implemented">✓ Implemented</span>
                            ) : (
                                <span className="status-badge coming-soon">⏳ Coming Soon</span>
                            )}
                        </div>

                        <h2 className="module-title">{module.title}</h2>
                        <p className="module-description">{module.description}</p>

                        <div className="module-features">
                            {module.features.map((feature, idx) => (
                                <span key={idx} className="feature-tag">
                                    {feature}
                                </span>
                            ))}
                        </div>

                        <button
                            className={`module-button ${module.status}`}
                            disabled={module.status !== 'implemented'}
                            style={{
                                background: module.status === 'implemented' ? module.color : undefined
                            }}
                        >
                            {module.status === 'implemented' ? (
                                <>Launch Simulator →</>
                            ) : (
                                <>Coming Soon</>
                            )}
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Footer Info */}
            <div className="info-section">
                <h3>📚 About Memory Management</h3>
                <div className="info-grid">
                    <div className="info-card">
                        <h4>What is Memory Management?</h4>
                        <p>
                            Memory management is the process of controlling and coordinating computer memory,
                            assigning portions to programs upon request and freeing it for reuse when no longer needed.
                        </p>
                    </div>
                    <div className="info-card">
                        <h4>Why is it Important?</h4>
                        <p>
                            Efficient memory management ensures optimal system performance, prevents memory leaks,
                            enables multitasking, and provides process isolation and protection.
                        </p>
                    </div>
                    <div className="info-card">
                        <h4>Key Concepts</h4>
                        <p>
                            Learn about allocation strategies, fragmentation, paging, segmentation, virtual memory,
                            and how operating systems optimize memory usage.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MemoryManagement;
