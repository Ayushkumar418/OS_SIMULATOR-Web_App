import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './Dashboard.css';

const Dashboard = () => {
    const modules = [
        {
            id: 'cpu-scheduler',
            title: 'CPU Scheduler',
            description: 'Visualize CPU scheduling algorithms (FCFS, SJF, Priority, Round Robin)',
            icon: '⚙️',
            gradient: 'var(--gradient-primary)',
            path: '/cpu-scheduler'
        },
        {
            id: 'memory',
            title: 'Memory Management',
            description: 'Explore paging, page tables, and page replacement algorithms',
            icon: '💾',
            gradient: 'var(--gradient-secondary)',
            path: '/memory'
        },
        {
            id: 'filesystem',
            title: 'File System',
            description: 'Learn file operations and block-level storage management',
            icon: '📁',
            gradient: 'var(--gradient-warning)',
            path: '/filesystem'
        }
    ];

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="dashboard-title">
                        <span className="title-gradient">OS Simulator</span>
                    </h1>
                    <p className="dashboard-subtitle">
                        Interactive Operating System Visualizer for Education
                    </p>
                </motion.div>
            </header>

            <main className="dashboard-main container">
                <motion.div
                    className="modules-grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    {modules.map((module, index) => (
                        <motion.div
                            key={module.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                        >
                            <Link to={module.path} className="module-card">
                                <div className="module-icon" style={{ background: module.gradient }}>
                                    <span>{module.icon}</span>
                                </div>
                                <div className="module-content">
                                    <h2 className="module-title">{module.title}</h2>
                                    <p className="module-description">{module.description}</p>
                                </div>
                                <div className="module-arrow">→</div>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>

                <motion.section
                    className="features-section"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                >
                    <h2>Features</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>📊 Real-time Visualization</h3>
                            <p>Watch processes execute step-by-step with interactive timelines and state diagrams</p>
                        </div>
                        <div className="feature-card">
                            <h3>🎓 Educational Explanations</h3>
                            <p>Learn with detailed explanations of every OS decision and algorithm choice</p>
                        </div>
                        <div className="feature-card">
                            <h3>📈 Performance Metrics</h3>
                            <p>Analyze waiting time, turnaround time, CPU utilization, and page faults</p>
                        </div>
                        <div className="feature-card">
                            <h3>🎯 Custom Scenarios</h3>
                            <p>Create and test your own process configurations and memory access patterns</p>
                        </div>
                    </div>
                </motion.section>
            </main>

            <footer className="dashboard-footer">
                <p>&copy; 2025 OS Simulator - Educational Project</p>
            </footer>
        </div>
    );
};

export default Dashboard;
