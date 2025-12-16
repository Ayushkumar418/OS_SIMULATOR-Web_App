import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { schedulerAPI, scenarioAPI } from '../services/api';
import ProcessTimeline from '../components/ProcessTimeline';
import MetricsPanel from '../components/MetricsPanel';
import SimulationControls from '../components/SimulationControls';
import ProcessInput from '../components/ProcessInput';
import ExplanationPanel from '../components/ExplanationPanel';
import ComparisonPanel from '../components/ComparisonPanel';
import { recommendBestAlgorithm } from '../utils/algorithmRecommender';
import './CPUScheduler.css';

const CPUScheduler = () => {
    const [processes, setProcesses] = useState([]);
    const [algorithm, setAlgorithm] = useState('fcfs');
    const [timeQuantum, setTimeQuantum] = useState(4);
    const [preemptive, setPreemptive] = useState(false);
    const [simulation, setSimulation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scenarios, setScenarios] = useState([]);
    // Comparison mode state
    const [comparisonMode, setComparisonMode] = useState(false);
    const [comparisonResults, setComparisonResults] = useState([]);
    const [comparisonRecommendation, setComparisonRecommendation] = useState(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);
    const [showAlgorithmInfo, setShowAlgorithmInfo] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [sortBy, setSortBy] = useState('pid');
    const [sortOrder, setSortOrder] = useState('asc');

    // Algorithm descriptions and how they work
    const algorithmInfo = {
        fcfs: {
            name: "First Come First Serve (FCFS)",
            description: "Non-preemptive scheduling algorithm where processes are executed in the order they arrive.",
            howItWorks: [
                "Processes are placed in a ready queue in order of arrival",
                "CPU is allocated to the first process in the queue",
                "Process runs to completion before the next one starts",
                "No preemption - once started, process runs until finished"
            ],
            advantages: ["Simple and easy to implement", "Fair - follows arrival order", "No starvation"],
            disadvantages: ["Poor average waiting time", "Convoy effect - short processes wait for long ones", "Not suitable for time-sharing systems"],
            bestFor: "Batch systems where throughput is more important than response time"
        },
        sjf: {
            name: preemptive ? "Shortest Remaining Time First (SRTF)" : "Shortest Job First (SJF)",
            description: preemptive
                ? "Preemptive version where CPU switches to shorter jobs as they arrive"
                : "Non-preemptive scheduling where shortest job executes first",
            howItWorks: preemptive ? [
                "At each arrival, check if new process has shorter remaining time",
                "If yes, preempt current process and switch to shorter one",
                "Always runs the process with minimum remaining time",
                "Optimal for minimizing average waiting time"
            ] : [
                "Sort processes by burst time (shortest first)",
                "Execute shortest job completely before next",
                "Jobs arriving later may execute before longer earlier jobs",
                "No preemption - runs to completion"
            ],
            advantages: preemptive
                ? ["Optimal average waiting time", "Better response for short jobs", "Adapts to changing workload"]
                : ["Minimum average waiting time (theoretical)", "Better than FCFS for average metrics"],
            disadvantages: preemptive
                ? ["High context switching overhead", "Requires knowledge of burst time", "Long processes may starve"]
                : ["Starvation for long processes", "Requires burst time prediction", "Not suitable for interactive systems"],
            bestFor: preemptive
                ? "Interactive systems where short tasks need quick response"
                : "Batch systems with known job durations"
        },
        priority: {
            name: preemptive ? "Preemptive Priority Scheduling" : "Priority Scheduling",
            description: preemptive
                ? "CPU switches to higher priority process as soon as it arrives"
                : "Processes are scheduled based on priority (lower number = higher priority)",
            howItWorks: preemptive ? [
                "Each process has a priority number (0 = highest priority)",
                "When higher priority process arrives, current process is preempted",
                "CPU always runs the highest priority ready process",
                "Same priority processes follow FCFS order"
            ] : [
                "Each process assigned a priority value",
                "Process with highest priority (lowest number) runs first",
                "If priorities equal, use FCFS tiebreaker",
                "No preemption - runs to completion"
            ],
            advantages: ["Important tasks get preference", "Flexible - priority can be based on various factors", "Good for real-time systems"],
            disadvantages: ["Starvation of low priority processes", "Priority inversion problem", "Difficult to determine optimal priorities"],
            bestFor: preemptive
                ? "Real-time systems with critical tasks"
                : "Systems with clear task importance hierarchy",
            note: "Priority can be assigned based on: memory needs, time limits, importance, paying users, etc."
        },
        round_robin: {
            name: "Round Robin (RR)",
            description: "Preemptive scheduling designed for time-sharing where each process gets a fixed time quantum",
            howItWorks: [
                `Each process gets a time quantum (${timeQuantum} ms in current setup)`,
                "Process runs for quantum or until completion, whichever is first",
                "If not finished, process moves to end of ready queue",
                "Next process in queue gets CPU",
                "Circular queue - fair distribution of CPU time"
            ],
            advantages: ["Fair CPU sharing", "Good response time", "No starvation", "Works well for time-sharing"],
            disadvantages: ["Higher average waiting time than SJF", "Context switching overhead", "Performance depends on quantum size"],
            bestFor: "Time-sharing systems and interactive applications",
            quantumGuidance: {
                tooSmall: "More context switches, high overhead",
                tooLarge: "Behaves like FCFS, poor response time",
                optimal: "80% of processes should finish within one quantum"
            }
        }
    };

    // Load scenarios on mount
    useEffect(() => {
        loadScenarios();
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Don't trigger if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'r':
                    if (!loading && processes.length > 0 && !comparisonMode) {
                        runSimulation();
                    }
                    break;
                case 'c':
                    resetSimulation();
                    break;
                case 'h':
                    setShowHelp(prev => !prev);
                    break;
                case 'escape':
                    setShowHelp(false);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [loading, processes, comparisonMode]);


    const loadScenarios = async () => {
        try {
            const response = await scenarioAPI.list();
            setScenarios(response.data.scenarios || []);
        } catch (err) {
            console.error('Failed to load scenarios:', err);
        }
    };

    const loadScenario = async (scenarioId) => {
        try {
            const response = await scenarioAPI.load(scenarioId);
            const data = response.data;

            setProcesses(data.processes || []);
            setAlgorithm(data.algorithm || 'fcfs');
            setTimeQuantum(data.time_quantum || 4);
            setSimulation(null);
            setError(null);
        } catch (err) {
            setError('Failed to load scenario');
        }
    };

    const runSimulation = async () => {
        if (processes.length === 0) {
            setError('Please add at least one process');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await schedulerAPI.runSimulation(
                algorithm,
                processes,
                timeQuantum,
                preemptive
            );

            setSimulation(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Simulation failed');
        } finally {
            setLoading(false);
        }
    };

    const resetSimulation = () => {
        setSimulation(null);
        setError(null);
    };

    // Export configuration to JSON file
    const exportConfig = () => {
        const config = {
            processes,
            algorithm,
            timeQuantum,
            preemptive,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cpu-scheduler-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Import configuration from JSON file
    const importConfig = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const config = JSON.parse(e.target.result);

                let importedProcesses = [];
                let importedAlgorithm = algorithm;
                let importedQuantum = timeQuantum;
                let importedPreemptive = preemptive;

                if (config.processes && Array.isArray(config.processes)) {
                    importedProcesses = config.processes;
                    setProcesses(config.processes);
                }
                if (config.algorithm) {
                    importedAlgorithm = config.algorithm;
                    setAlgorithm(config.algorithm);
                }
                if (config.timeQuantum) {
                    importedQuantum = config.timeQuantum;
                    setTimeQuantum(config.timeQuantum);
                }
                if (typeof config.preemptive === 'boolean') {
                    importedPreemptive = config.preemptive;
                    setPreemptive(config.preemptive);
                }

                setError(null);

                // Auto-run simulation if processes exist
                if (importedProcesses.length > 0) {
                    setLoading(true);
                    try {
                        const response = await schedulerAPI.runSimulation(
                            importedAlgorithm,
                            importedProcesses,
                            importedQuantum,
                            importedPreemptive
                        );
                        setSimulation(response.data);
                    } catch (err) {
                        setError(err.response?.data?.detail || 'Simulation failed');
                    } finally {
                        setLoading(false);
                    }
                }
            } catch (err) {
                setError('Invalid configuration file format');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const addProcess = (process) => {
        // Check for duplicate PID
        const existingProcess = processes.find(p => p.pid === process.pid);
        if (existingProcess) {
            setError(`Process ID ${process.pid} already exists! Please use a unique Process ID.`);
            return;
        }

        setProcesses([...processes, process]);
        setSimulation(null);
        setError(null); // Clear any previous errors
    };

    const removeProcess = (pid) => {
        setProcesses(processes.filter(p => p.pid !== pid));
        setSimulation(null);
    };

    // Sort completed processes for table display
    const getSortedProcesses = () => {
        if (!simulation?.completed_processes) return [];

        const sorted = [...simulation.completed_processes].sort((a, b) => {
            let aVal, bVal;

            switch (sortBy) {
                case 'pid':
                    aVal = a.pid;
                    bVal = b.pid;
                    break;
                case 'arrival':
                    aVal = a.arrival_time;
                    bVal = b.arrival_time;
                    break;
                case 'burst':
                    aVal = a.burst_time;
                    bVal = b.burst_time;
                    break;
                case 'completion':
                    aVal = a.completion_time || 0;
                    bVal = b.completion_time || 0;
                    break;
                case 'waiting':
                    aVal = a.wait_time;
                    bVal = b.wait_time;
                    break;
                case 'turnaround':
                    aVal = a.turnaround_time;
                    bVal = b.turnaround_time;
                    break;
                case 'response':
                    aVal = a.response_time || 0;
                    bVal = b.response_time || 0;
                    break;
                default:
                    aVal = a.pid;
                    bVal = b.pid;
            }

            if (sortOrder === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        return sorted;
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Comparison Mode: Run all algorithms and compare
    const runComparison = async () => {
        if (processes.length === 0) {
            setError('Please add at least one process before running comparison');
            return;
        }

        setComparisonLoading(true);
        setError(null);
        setComparisonResults([]);
        setComparisonRecommendation(null);

        try {
            const algorithmsToCompare = [
                { algorithm: 'fcfs', preemptive: false },
                { algorithm: 'sjf', preemptive: false },
                { algorithm: 'sjf', preemptive: true },  // SRTF
                { algorithm: 'priority', preemptive: false },
                { algorithm: 'priority', preemptive: true },
                { algorithm: 'round_robin', preemptive: false }
            ];

            const results = [];

            // Run each algorithm sequentially
            for (const config of algorithmsToCompare) {
                try {
                    const response = await schedulerAPI.runSimulation(
                        config.algorithm,
                        processes,
                        timeQuantum,
                        config.preemptive
                    );

                    results.push({
                        algorithm: config.algorithm,
                        preemptive: config.preemptive,
                        ...response.data
                    });
                } catch (err) {
                    console.error(`Error running ${config.algorithm}:`, err);
                    // Continue with other algorithms even if one fails
                }
            }

            setComparisonResults(results);

            // Generate recommendation
            if (results.length > 0) {
                const recommendation = recommendBestAlgorithm(results);
                setComparisonRecommendation(recommendation);
            }

        } catch (err) {
            setError('Failed to run comparison: ' + (err.response?.data?.detail || err.message));
        } finally {
            setComparisonLoading(false);
        }
    };

    return (
        <div className="cpu-scheduler">
            <header className="page-header">
                <div className="container flex items-center justify-between">
                    <div>
                        <Link to="/" className="back-link">← Back to Dashboard</Link>
                        <h1 className="page-title">CPU Scheduler</h1>
                        <p className="page-subtitle">Visualize CPU scheduling algorithms</p>
                    </div>
                </div>
                <button className="help-btn" onClick={() => setShowHelp(true)}>
                    ❓ Help
                </button>
            </header>

            <main className="page-main container">
                <div className="scheduler-layout">
                    {/* Left Panel - Controls */}
                    <aside className="control-panel">
                        <div className="card">
                            <h2>Algorithm Settings</h2>

                            <div className="form-group">
                                <label htmlFor="algorithm">Scheduling Algorithm</label>
                                <select
                                    id="algorithm"
                                    value={algorithm}
                                    onChange={(e) => setAlgorithm(e.target.value)}
                                >
                                    <option value="fcfs">FCFS (First Come First Serve)</option>
                                    <option value="sjf">SJF (Shortest Job First)</option>
                                    <option value="priority">Priority Scheduling</option>
                                    <option value="round_robin">Round Robin</option>
                                </select>
                            </div>

                            {algorithm === 'round_robin' && (
                                <div className="form-group">
                                    <label htmlFor="timeQuantum">Time Quantum</label>
                                    <input
                                        id="timeQuantum"
                                        type="number"
                                        min="1"
                                        value={timeQuantum}
                                        onChange={(e) => setTimeQuantum(parseInt(e.target.value))}
                                    />
                                </div>
                            )}

                            {(algorithm === 'sjf' || algorithm === 'priority') && (
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={preemptive}
                                            onChange={(e) => setPreemptive(e.target.checked)}
                                        />
                                        <span>Preemptive</span>
                                    </label>
                                </div>
                            )}

                            {/* Algorithm Information - Collapsible */}
                            <div className="algorithm-info-section">
                                <button
                                    className="info-toggle-btn"
                                    onClick={() => setShowAlgorithmInfo(!showAlgorithmInfo)}
                                    type="button"
                                >
                                    <span className="info-icon">{showAlgorithmInfo ? '📖' : 'ℹ️'}</span>
                                    <span>{showAlgorithmInfo ? 'Hide' : 'Show'} Algorithm Info</span>
                                    <span className="toggle-arrow">{showAlgorithmInfo ? '▼' : '▶'}</span>
                                </button>

                                {showAlgorithmInfo && algorithmInfo[algorithm] && (
                                    <div className="algorithm-info-content">
                                        <h4>{algorithmInfo[algorithm].name}</h4>
                                        <p className="info-description">{algorithmInfo[algorithm].description}</p>

                                        <div className="info-section">
                                            <h5>How It Works:</h5>
                                            <ul>
                                                {algorithmInfo[algorithm].howItWorks.map((point, idx) => (
                                                    <li key={idx}>{point}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="info-section">
                                            <h5>✅ Advantages:</h5>
                                            <ul className="advantages-list">
                                                {algorithmInfo[algorithm].advantages.map((adv, idx) => (
                                                    <li key={idx}>{adv}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="info-section">
                                            <h5>❌ Disadvantages:</h5>
                                            <ul className="disadvantages-list">
                                                {algorithmInfo[algorithm].disadvantages.map((dis, idx) => (
                                                    <li key={idx}>{dis}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="info-section best-for">
                                            <h5>🎯 Best For:</h5>
                                            <p>{algorithmInfo[algorithm].bestFor}</p>
                                        </div>

                                        {algorithmInfo[algorithm].note && (
                                            <div className="info-note">
                                                <strong>Note:</strong> {algorithmInfo[algorithm].note}
                                            </div>
                                        )}

                                        {algorithm === 'round_robin' && algorithmInfo[algorithm].quantumGuidance && (
                                            <div className="quantum-guidance">
                                                <h5>⏱️ Time Quantum Guidance:</h5>
                                                <ul>
                                                    <li><strong>Too Small:</strong> {algorithmInfo[algorithm].quantumGuidance.tooSmall}</li>
                                                    <li><strong>Too Large:</strong> {algorithmInfo[algorithm].quantumGuidance.tooLarge}</li>
                                                    <li><strong>Optimal:</strong> {algorithmInfo[algorithm].quantumGuidance.optimal}</li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Demo Scenarios Section - Enhanced Card UI */}
                        <div className="card scenario-card">
                            <div className="scenario-header">
                                <h3>📚 Demo Scenarios</h3>
                                <span className="scenario-subtitle">Quick start with pre-built examples</span>
                            </div>

                            {scenarios.length > 0 ? (
                                <div className="scenario-list">
                                    {scenarios.map(s => (
                                        <button
                                            key={s.id}
                                            className="scenario-item"
                                            onClick={() => loadScenario(s.id)}
                                            title={s.description || 'Click to load this scenario'}
                                        >
                                            <div className="scenario-name">{s.name}</div>
                                            {s.description && (
                                                <div className="scenario-description">{s.description}</div>
                                            )}
                                            <div className="scenario-meta">
                                                <span className="scenario-count">
                                                    {s.process_count || s.processes?.length || 0} processes
                                                </span>
                                                {s.algorithm && (
                                                    <span className="scenario-algo">{s.algorithm.toUpperCase()}</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="scenario-empty">
                                    <p>No demo scenarios available</p>
                                </div>
                            )}
                        </div>

                        {/* Comparison Mode Toggle */}
                        <div className="card comparison-mode-card">
                            <div className="comparison-mode-header">
                                <h3>📊 Comparison Mode</h3>
                                <label className="mode-switch">
                                    <input
                                        type="checkbox"
                                        checked={comparisonMode}
                                        onChange={(e) => {
                                            setComparisonMode(e.target.checked);
                                            if (!e.target.checked) {
                                                setComparisonResults([]);
                                                setComparisonRecommendation(null);
                                            }
                                        }}
                                    />
                                    <span className="mode-switch-slider"></span>
                                </label>
                            </div>
                            <p className="comparison-mode-description">
                                {comparisonMode
                                    ? '✅ Compare all algorithms with current processes'
                                    : 'Enable to compare multiple algorithms side-by-side'}
                            </p>

                            {comparisonMode && (
                                <button
                                    className="btn btn-primary"
                                    onClick={runComparison}
                                    disabled={processes.length === 0 || comparisonLoading}
                                    style={{ width: '100%', marginTop: 'var(--space-md)' }}
                                >
                                    {comparisonLoading ? '⏳ Running Comparison...' : '🚀 Run Comparison'}
                                </button>
                            )}
                        </div>

                        <ProcessInput
                            onAddProcess={addProcess}
                            existingPids={processes.map(p => p.pid)}
                        />

                        <div className="card">
                            <h3>Current Processes ({processes.length})</h3>
                            <div className="process-list">
                                {processes.map((p, index) => (
                                    <div key={`process-${index}-${p.pid}`} className="process-item">
                                        <div className="process-info">
                                            <strong>P{p.pid}</strong>
                                            <span>Arrival: {p.arrival_time}</span>
                                            <span>Burst: {p.burst_time}</span>
                                            {algorithm === 'priority' && <span>Priority: {p.priority}</span>}
                                        </div>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => removeProcess(p.pid)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <SimulationControls
                            onRun={runSimulation}
                            onReset={resetSimulation}
                            loading={loading}
                            disabled={processes.length === 0}
                        />

                        {/* Import/Export Card */}
                        <div className="card import-export-card">
                            <h3>💾 Save / Load</h3>
                            <div className="import-export-buttons">
                                <button
                                    className="btn btn-export"
                                    onClick={exportConfig}
                                    disabled={processes.length === 0}
                                >
                                    📤 Export Config
                                </button>
                                <label className="btn btn-import">
                                    📥 Import Config
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={importConfig}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            </div>
                        </div>
                    </aside>

                    {/* Right Panel - Visualization */}
                    <section className="visualization-panel">
                        {/* Error Popup Notification */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    className="error-notification"
                                    initial={{ opacity: 0, y: -50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -50 }}
                                >
                                    <div className="error-content">
                                        <span className="error-icon">❌</span>
                                        <span className="error-text">{error}</span>
                                        <button className="error-close" onClick={() => setError(null)}>×</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Comparison Mode Results */}
                        {comparisonMode && comparisonResults.length > 0 ? (
                            <div className="card">
                                <ComparisonPanel
                                    comparisonResults={comparisonResults}
                                    recommendation={comparisonRecommendation}
                                />
                            </div>
                        ) : /* Normal Single Algorithm Results */
                            simulation ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="simulation-results"
                                >
                                    <MetricsPanel metrics={simulation.metrics} />

                                    <div className="card gantt-card">
                                        <h2>Gantt Chart</h2>
                                        <div className="gantt-wrapper">
                                            <ProcessTimeline ganttChart={simulation.gantt_chart} />
                                        </div>
                                    </div>

                                    <ExplanationPanel explanations={simulation.explanations} />

                                    <div className="card">
                                        <div className="process-details-header">
                                            <h3>Process Details</h3>
                                            <span className="sort-hint">Click column headers to sort</span>
                                        </div>
                                        <div className="process-table-wrapper">
                                            <table className="process-table">
                                                <thead>
                                                    <tr>
                                                        <th className={`sortable ${sortBy === 'pid' ? 'active' : ''}`} onClick={() => handleSort('pid')}>
                                                            PID {sortBy === 'pid' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className={`sortable ${sortBy === 'arrival' ? 'active' : ''}`} onClick={() => handleSort('arrival')}>
                                                            Arrival {sortBy === 'arrival' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className={`sortable ${sortBy === 'burst' ? 'active' : ''}`} onClick={() => handleSort('burst')}>
                                                            Burst {sortBy === 'burst' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className={`sortable ${sortBy === 'completion' ? 'active' : ''}`} onClick={() => handleSort('completion')}>
                                                            Completion {sortBy === 'completion' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className={`sortable ${sortBy === 'waiting' ? 'active' : ''}`} onClick={() => handleSort('waiting')}>
                                                            Waiting {sortBy === 'waiting' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className={`sortable ${sortBy === 'turnaround' ? 'active' : ''}`} onClick={() => handleSort('turnaround')}>
                                                            Turnaround {sortBy === 'turnaround' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                        <th className={`sortable ${sortBy === 'response' ? 'active' : ''}`} onClick={() => handleSort('response')}>
                                                            Response {sortBy === 'response' && (sortOrder === 'asc' ? '↑' : '↓')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getSortedProcesses().map(p => (
                                                        <tr key={p.pid}>
                                                            <td><strong>P{p.pid}</strong></td>
                                                            <td>{p.arrival_time}</td>
                                                            <td>{p.burst_time}</td>
                                                            <td>{p.completion_time ?? 'N/A'}</td>
                                                            <td>{p.wait_time}</td>
                                                            <td>{p.turnaround_time}</td>
                                                            <td>{p.response_time ?? 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-state-icon">📊</div>
                                    <h3>No Simulation Running</h3>
                                    <p>Add processes and click "Run Simulation" to see visualization</p>
                                </div>
                            )}
                    </section>
                </div>
            </main>

            {/* Help Modal */}
            <AnimatePresence>
                {showHelp && (
                    <motion.div
                        className="help-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowHelp(false)}
                    >
                        <motion.div
                            className="help-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="help-header">
                                <h2>📚 CPU Scheduling Simulator</h2>
                                <button className="help-close" onClick={() => setShowHelp(false)}>×</button>
                            </div>
                            <div className="help-content">
                                <section className="help-section">
                                    <h3>🎯 What is CPU Scheduling?</h3>
                                    <p>CPU scheduling determines which process runs on the CPU at any given time. The scheduler selects processes from the ready queue and allocates CPU time based on the chosen algorithm.</p>
                                </section>

                                <section className="help-section">
                                    <h3>📊 Available Algorithms</h3>
                                    <div className="algorithm-grid">
                                        <div className="algo-card">
                                            <strong>FCFS</strong>
                                            <p>First Come First Serve - executes in arrival order</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>SJF</strong>
                                            <p>Shortest Job First - shortest burst time runs first</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>Priority</strong>
                                            <p>Higher priority processes execute first</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>Round Robin</strong>
                                            <p>Each process gets a time quantum in turns</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>🔧 How to Use</h3>
                                    <ol>
                                        <li>Select an <strong>Algorithm</strong> from the dropdown</li>
                                        <li>Add processes with <strong>Arrival Time</strong> and <strong>Burst Time</strong></li>
                                        <li>Click <strong>Run Simulation</strong> to see the Gantt chart</li>
                                        <li>Enable <strong>Comparison Mode</strong> to compare all algorithms</li>
                                        <li>Try <strong>Demo Scenarios</strong> for pre-built examples</li>
                                    </ol>
                                </section>

                                <section className="help-section">
                                    <h3>📈 Performance Metrics</h3>
                                    <ul>
                                        <li><strong>Waiting Time</strong> - Time spent in ready queue</li>
                                        <li><strong>Turnaround Time</strong> - Total time from arrival to completion</li>
                                        <li><strong>Response Time</strong> - Time until first CPU allocation</li>
                                        <li><strong>Throughput</strong> - Processes completed per time unit</li>
                                    </ul>
                                </section>

                                <section className="help-section">
                                    <h3>⌨️ Keyboard Shortcuts</h3>
                                    <div className="shortcuts-grid">
                                        <div className="shortcut-item">
                                            <kbd>R</kbd>
                                            <span>Run Simulation</span>
                                        </div>
                                        <div className="shortcut-item">
                                            <kbd>C</kbd>
                                            <span>Clear/Reset</span>
                                        </div>
                                        <div className="shortcut-item">
                                            <kbd>H</kbd>
                                            <span>Toggle Help</span>
                                        </div>
                                        <div className="shortcut-item">
                                            <kbd>Esc</kbd>
                                            <span>Close Modal</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CPUScheduler;
