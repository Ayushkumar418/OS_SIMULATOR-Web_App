import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './ContiguousAllocator.css';

const API_BASE = '/api/memory/contiguous';

const ContiguousAllocator = () => {
    const [memoryState, setMemoryState] = useState(null);
    const [algorithm, setAlgorithm] = useState('first_fit');
    const [processId, setProcessId] = useState(1);
    const [processSize, setProcessSize] = useState(100);
    const [totalMemory, setTotalMemory] = useState(1000);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [explanations, setExplanations] = useState([]);
    const [showInfo, setShowInfo] = useState(false);

    // Enhanced features state
    const [showASCII, setShowASCII] = useState(true);
    const [comparisonMode, setComparisonMode] = useState(false);
    const [comparisonResults, setComparisonResults] = useState(null);
    const [comparisonLoading, setComparisonLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Fetch initial state
    useEffect(() => {
        fetchMemoryState();
    }, []);

    const fetchMemoryState = async () => {
        try {
            const response = await axios.get(`${API_BASE}/state`);
            setMemoryState(response.data);
        } catch (err) {
            console.error('Failed to fetch memory state:', err);
        }
    };

    const handleAllocate = async () => {
        if (processSize <= 0) {
            setError('Process size must be greater than 0');
            return;
        }

        // Check for duplicate process ID
        if (memoryState?.blocks) {
            const existingProcess = memoryState.blocks.find(
                block => block.allocated && block.process_id === processId
            );
            if (existingProcess) {
                setError(`⚠️ Process ID ${processId} already exists!\nPlease use a different Process ID or deallocate the existing process first.`);
                return;
            }
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/allocate`, {
                process_id: processId,
                size: processSize,
                algorithm: algorithm,
                total_memory: totalMemory
            });

            // Update state with proper structure
            setMemoryState({
                ...response.data.memory_state,
                initialized: true,
                fragmentation: response.data.fragmentation
            });
            setExplanations(response.data.explanations || []);
            setProcessId(processId + 1); // Auto-increment for next process
        } catch (err) {
            const errorDetail = err.response?.data?.detail || '';

            // Provide user-friendly error messages
            if (errorDetail.includes('No suitable block found')) {
                setError(`❌ Memory Full! Cannot allocate ${processSize} KB. Try:\n• Deallocating some processes (click on allocated blocks)\n• Reducing process size\n• Using Reset Memory to start fresh\nLargest free block: ${memoryState?.fragmentation?.largest_free_block || 0} KB`);
            } else if (errorDetail.includes('Invalid algorithm')) {
                setError('⚠️ Invalid algorithm selected. Please choose a valid allocation algorithm.');
            } else {
                setError(`❌ Allocation Failed: ${errorDetail || 'Unknown error occurred'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeallocate = async (pid) => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE}/deallocate`, {
                process_id: pid
            });

            setMemoryState({
                ...response.data.memory_state,
                initialized: true,
                fragmentation: response.data.fragmentation
            });
            setExplanations(response.data.explanations || []);
        } catch (err) {
            setError(err.response?.data?.detail || 'Deallocation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        try {
            await axios.post(`${API_BASE}/reset`);
            setMemoryState(null);
            setExplanations([]);
            setError(null);
            setProcessId(1);

            // Initialize with current totalMemory size by fetching state
            // The backend will use the new size on next allocation
            fetchMemoryState();
        } catch (err) {
            setError('Reset failed');
        }
    };

    // Preset Scenarios
    const presetScenarios = {
        fragmentation: {
            name: "Fragmentation Demo",
            description: "Shows how external fragmentation occurs",
            processes: [
                { id: 1, size: 100 },
                { id: 2, size: 50 },
                { id: 3, size: 200 },
                { id: 4, size: 75 },
                { id: 5, size: 150 }
            ],
            deallocate: [2, 4], // Deallocate these after allocation
            algorithm: 'first_fit'
        },
        comparison: {
            name: "Best vs Worst Fit",
            description: "Compare Best Fit and Worst Fit algorithms",
            processes: [
                { id: 1, size: 200 },
                { id: 2, size: 100 },
                { id: 3, size: 150 }
            ],
            algorithm: 'best_fit'
        },
        sequential: {
            name: "Sequential Allocation",
            description: "Normal sequential process allocation",
            processes: [
                { id: 1, size: 100 },
                { id: 2, size: 150 },
                { id: 3, size: 120 },
                { id: 4, size: 180 }
            ],
            algorithm: 'first_fit'
        },
        mixed: {
            name: "Mixed Process Sizes",
            description: "Variable-sized processes to test algorithms",
            processes: [
                { id: 1, size: 50 },
                { id: 2, size: 300 },
                { id: 3, size: 100 },
                { id: 4, size: 250 },
                { id: 5, size: 75 }
            ],
            algorithm: 'worst_fit'
        }
    };

    const loadScenario = async (scenarioKey) => {
        const scenario = presetScenarios[scenarioKey];
        if (!scenario) return;

        // Reset first
        await handleReset();
        setError(null);

        // Wait for reset to complete
        setTimeout(async () => {
            // Allocate all processes
            for (const process of scenario.processes) {
                try {
                    const response = await axios.post(`${API_BASE}/allocate`, {
                        process_id: process.id,
                        size: process.size,
                        algorithm: scenario.algorithm,
                        total_memory: totalMemory
                    });

                    setMemoryState({
                        ...response.data.memory_state,
                        initialized: true,
                        fragmentation: response.data.fragmentation
                    });

                    // Small delay for visual effect
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    console.error('Error in scenario:', err);
                }
            }

            // Deallocate specified processes if any
            if (scenario.deallocate) {
                await new Promise(resolve => setTimeout(resolve, 500));
                for (const pid of scenario.deallocate) {
                    try {
                        const response = await axios.post(`${API_BASE}/deallocate`, {
                            process_id: pid
                        });

                        setMemoryState({
                            ...response.data.memory_state,
                            initialized: true,
                            fragmentation: response.data.fragmentation
                        });

                        await new Promise(resolve => setTimeout(resolve, 200));
                    } catch (err) {
                        console.error('Error deallocating:', err);
                    }
                }
            }

            setAlgorithm(scenario.algorithm);
        }, 500);
    };

    const algorithmInfo = {
        first_fit: {
            name: "First Fit",
            description: "Allocates the first available block that is large enough",
            pros: ["Fast allocation", "Simple implementation"],
            cons: ["Creates fragmentation at beginning", "Not optimal utilization"],
            complexity: "O(n)"
        },
        best_fit: {
            name: "Best Fit",
            description: "Allocates the smallest block that is large enough",
            pros: ["Better memory utilization", "Reduces wasted space"],
            cons: ["Slower than first fit", "Creates small fragments"],
            complexity: "O(n)"
        },
        worst_fit: {
            name: "Worst Fit",
            description: "Allocates the largest available block",
            pros: ["Leaves larger free blocks", "Good for variable-sized allocations"],
            cons: ["Poor utilization", "Wastes large blocks"],
            complexity: "O(n)"
        },
        next_fit: {
            name: "Next Fit",
            description: "Like first fit, but continues from last allocation point",
            pros: ["Distributes allocations evenly", "Faster than first fit on average"],
            cons: ["Still creates fragmentation", "May miss better earlier blocks"],
            complexity: "O(n)"
        }
    };

    // Predefined color palette for distinct process visualization
    const processColors = [
        '#3b82f6', // Blue
        '#8b5cf6', // Purple
        '#ec4899', // Pink
        '#f59e0b', // Amber
        '#10b981', // Emerald
        '#06b6d4', // Cyan
        '#6366f1', // Indigo
        '#f97316', // Orange
        '#14b8a6', // Teal
        '#a855f7', // Violet
        '#84cc16', // Lime
        '#f43f5e'  // Rose
    ];

    const getBlockColor = (block) => {
        if (!block.allocated) return 'var(--mem-free)';

        // Use process ID to select from color palette (cycles through if more than 12 processes)
        const colorIndex = (block.process_id - 1) % processColors.length;
        return processColors[colorIndex];
    };

    // Generate ASCII diagram
    const generateASCIIDiagram = () => {
        if (!memoryState || !memoryState.blocks) return '';

        let diagram = '';
        let addresses = '0';

        // Create block representation
        memoryState.blocks.forEach((block, index) => {
            const label = block.allocated ? `P${block.process_id}:${block.size}KB` : `FREE:${block.size}KB`;
            diagram += `[${label}]`;
            addresses += ' '.repeat(Math.max(1, label.length - String(block.end).length)) + block.end;
        });

        return `${diagram}\n${addresses}`;
    };

    // Run Algorithm Comparison
    const runComparison = async () => {
        if (!memoryState || !memoryState.blocks || memoryState.blocks.length === 0) {
            setError('⚠️ No memory initialized. Please allocate some processes first before running comparison.');
            return;
        }

        // Get current allocated processes
        const allocatedProcesses = memoryState.blocks
            .filter(b => b.allocated)
            .map(b => ({ id: b.process_id, size: b.size }));

        if (allocatedProcesses.length === 0) {
            setError('⚠️ No processes allocated for comparison. Allocate at least one process first.');
            return;
        }

        setComparisonLoading(true);
        setComparisonResults(null);
        setError(null);

        const algorithms = ['first_fit', 'best_fit', 'worst_fit', 'next_fit'];
        const results = [];
        const currentTotalMemory = memoryState.total_memory;

        try {
            for (const algo of algorithms) {
                console.log(`Testing ${algo}...`);

                // Reset memory to ensure clean state
                await axios.post(`${API_BASE}/reset`);

                // Small delay to ensure reset completes
                await new Promise(resolve => setTimeout(resolve, 100));

                const startTime = performance.now();
                let finalState = null;
                let successfulAllocations = 0;
                let failedAllocations = 0;

                // Try to allocate all processes in order
                for (const process of allocatedProcesses) {
                    try {
                        const response = await axios.post(`${API_BASE}/allocate`, {
                            process_id: process.id,
                            size: process.size,
                            algorithm: algo,
                            total_memory: currentTotalMemory
                        });

                        if (response.status === 200) {
                            finalState = response.data;
                            successfulAllocations++;
                        }
                    } catch (err) {
                        console.error(`Allocation failed for ${algo}, P${process.id}:`, err.response?.data);
                        failedAllocations++;
                        // If allocation fails, still continue to test the algorithm
                    }
                }

                const endTime = performance.now();
                const executionTime = (endTime - startTime).toFixed(2);

                // Only add result if at least one allocation succeeded
                if (finalState && successfulAllocations > 0) {
                    results.push({
                        algorithm: algo,
                        name: algo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                        fragmentation: finalState.fragmentation?.fragmentation_percentage || 0,
                        freeBlocks: finalState.fragmentation?.external_fragments || 0,
                        largestFree: finalState.fragmentation?.largest_free_block || 0,
                        executionTime: parseFloat(executionTime),
                        successfulAllocations,
                        failedAllocations
                    });
                } else {
                    // Even if failed, add entry to show it was tested
                    results.push({
                        algorithm: algo,
                        name: algo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                        fragmentation: 100,
                        freeBlocks: 0,
                        largestFree: 0,
                        executionTime: parseFloat(executionTime),
                        successfulAllocations,
                        failedAllocations
                    });
                }
            }

            if (results.length === 0) {
                setError('Comparison failed: No algorithms could allocate the processes.');
                setComparisonLoading(false);
                return;
            }

            // Find best algorithm (lowest fragmentation among successful ones)
            const successfulResults = results.filter(r => r.successfulAllocations > 0);
            const best = successfulResults.length > 0
                ? successfulResults.reduce((prev, curr) =>
                    curr.fragmentation < prev.fragmentation ? curr : prev
                )
                : results[0];

            setComparisonResults({ results, best: best.algorithm });

            // Restore original state with original algorithm
            console.log('Restoring original state...');
            await axios.post(`${API_BASE}/reset`);

            setTimeout(async () => {
                for (const process of allocatedProcesses) {
                    try {
                        await axios.post(`${API_BASE}/allocate`, {
                            process_id: process.id,
                            size: process.size,
                            algorithm: algorithm,
                            total_memory: currentTotalMemory
                        });
                    } catch (err) {
                        console.error('Error restoring process:', err);
                    }
                }

                // Fetch final state
                try {
                    const stateResponse = await axios.get(`${API_BASE}/state`);
                    setMemoryState({
                        ...stateResponse.data,
                        initialized: true
                    });
                } catch (err) {
                    console.error('Error fetching state:', err);
                }
            }, 500);

        } catch (err) {
            console.error('Comparison error:', err);
            setError('Comparison failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setComparisonLoading(false);
        }
    };

    const fragmentation = memoryState?.fragmentation || {};
    const navigate = useNavigate();

    return (
        <div className="contiguous-allocator">
            {/* Back Button */}
            <button className="ca-back-button" onClick={() => navigate('/memory')}>
                ← Back to Memory Management
            </button>

            <header className="allocator-header">
                <h1>Contiguous Memory Allocation</h1>
                <p>Visualize and compare memory allocation algorithms</p>
                <button className="help-btn" onClick={() => setShowHelp(true)}>
                    ❓ Help
                </button>
            </header>

            <div className="allocator-layout">
                {/* Left Panel - Controls */}
                <aside className="control-panel">
                    <div className="card">
                        <h3>⚙️ Allocation Controls</h3>

                        <div className="form-group">
                            <label>Algorithm</label>
                            <select
                                value={algorithm}
                                onChange={(e) => setAlgorithm(e.target.value)}
                                className="select-input"
                            >
                                <option value="first_fit">First Fit</option>
                                <option value="best_fit">Best Fit</option>
                                <option value="worst_fit">Worst Fit</option>
                                <option value="next_fit">Next Fit</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                Process ID
                                {(() => {
                                    const allocatedIds = memoryState?.blocks
                                        ?.filter(b => b.allocated)
                                        .map(b => b.process_id) || [];
                                    const isDuplicate = allocatedIds.includes(processId);

                                    return isDuplicate && (
                                        <span className="validation-warning">⚠️ Already taken</span>
                                    );
                                })()}
                            </label>
                            <input
                                type="number"
                                value={processId}
                                onChange={(e) => setProcessId(parseInt(e.target.value))}
                                min="1"
                                className={(() => {
                                    const allocatedIds = memoryState?.blocks
                                        ?.filter(b => b.allocated)
                                        .map(b => b.process_id) || [];
                                    return allocatedIds.includes(processId) ? 'input-error' : '';
                                })()}
                            />
                            {memoryState?.blocks && (() => {
                                const allocatedIds = memoryState.blocks
                                    .filter(b => b.allocated)
                                    .map(b => b.process_id)
                                    .sort((a, b) => a - b);

                                return allocatedIds.length > 0 && (
                                    <span className="helper-text">
                                        In use: {allocatedIds.join(', ')}
                                    </span>
                                );
                            })()}
                        </div>

                        <div className="form-group">
                            <label>Process Size (KB)</label>
                            <input
                                type="number"
                                value={processSize}
                                onChange={(e) => setProcessSize(parseInt(e.target.value))}
                                min="1"
                                max={totalMemory}
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleAllocate}
                            disabled={loading}
                        >
                            {loading ? '⏳ Allocating...' : '➕ Allocate Memory'}
                        </button>

                        <button
                            className="btn btn-secondary"
                            onClick={handleReset}
                            style={{ marginTop: '10px' }}
                        >
                            🔄 Reset Memory
                        </button>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>
                                Total Memory (KB)
                                {memoryState?.initialized && memoryState.allocated_blocks > 0 && (
                                    <span className="validation-warning" style={{ fontSize: '11px' }}>
                                        ⚠️ Reset to change
                                    </span>
                                )}
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={totalMemory}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Allow empty string for clearing
                                        if (value === '') {
                                            setTotalMemory('');
                                            return;
                                        }
                                        const newSize = parseInt(value);
                                        if (!isNaN(newSize) && newSize >= 0) {
                                            setTotalMemory(newSize);
                                        }
                                    }}
                                    onBlur={() => {
                                        // If empty or invalid on blur, reset to 1000
                                        if (totalMemory === '' || totalMemory < 100) {
                                            setTotalMemory(1000);
                                        }
                                    }}
                                    min="100"
                                    max="10000"
                                    step="100"
                                    placeholder="1000"
                                    disabled={memoryState?.initialized && memoryState.allocated_blocks > 0}
                                    className={memoryState?.initialized && memoryState.allocated_blocks > 0 ? 'input-disabled' : ''}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn btn-secondary"
                                    onClick={async () => {
                                        // Validate
                                        if (totalMemory < 100 || totalMemory > 10000) {
                                            setError('Total Memory must be between 100 and 10,000 KB');
                                            return;
                                        }

                                        // Reset first
                                        await handleReset();

                                        // Force backend to initialize with new size
                                        // by making a dummy allocation with the new total_memory
                                        setTimeout(async () => {
                                            try {
                                                // Allocate a tiny process to initialize memory with new size
                                                const response = await axios.post(`${API_BASE}/allocate`, {
                                                    process_id: 999,
                                                    size: 1,
                                                    algorithm: 'first_fit',
                                                    total_memory: totalMemory
                                                });

                                                // Immediately deallocate it
                                                await axios.post(`${API_BASE}/deallocate`, {
                                                    process_id: 999
                                                });

                                                // Fetch the state to show updated memory size
                                                const stateResponse = await axios.get(`${API_BASE}/state`);
                                                setMemoryState({
                                                    ...stateResponse.data,
                                                    initialized: true
                                                });
                                            } catch (err) {
                                                console.error('Error initializing memory:', err);
                                            }
                                        }, 300);
                                    }}
                                    disabled={memoryState?.initialized && memoryState.allocated_blocks > 0}
                                    title="Apply new memory size"
                                    style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
                                >
                                    ✓ Apply
                                </button>
                            </div>
                            <span className="helper-text">
                                Range: 100 - 10,000 KB {totalMemory >= 1000 && `(${(totalMemory / 1000).toFixed(1)} MB)`}
                            </span>
                        </div>
                    </div>

                    {/* Algorithm Info */}
                    <div className="card">
                        <button
                            className="info-toggle-btn"
                            onClick={() => setShowInfo(!showInfo)}
                        >
                            <span className="info-icon">📚</span>
                            <span>{algorithmInfo[algorithm]?.name} Info</span>
                            <span className="toggle-arrow">{showInfo ? '▼' : '▶'}</span>
                        </button>

                        {showInfo && (
                            <motion.div
                                className="algorithm-info-content"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <p className="info-description">
                                    {algorithmInfo[algorithm]?.description}
                                </p>

                                <div className="info-section">
                                    <h5>✓ Advantages:</h5>
                                    <ul className="advantages-list">
                                        {algorithmInfo[algorithm]?.pros.map((pro, i) => (
                                            <li key={i}>{pro}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="info-section">
                                    <h5>✗ Disadvantages:</h5>
                                    <ul className="disadvantages-list">
                                        {algorithmInfo[algorithm]?.cons.map((con, i) => (
                                            <li key={i}>{con}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="best-for">
                                    <p><strong>Complexity:</strong> {algorithmInfo[algorithm]?.complexity}</p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Preset Scenarios */}
                    <div className="card">
                        <h3>🎯 Preset Scenarios</h3>
                        <p className="scenario-description">Quick-load educational examples</p>
                        <div className="scenario-buttons">
                            {Object.entries(presetScenarios).map(([key, scenario]) => (
                                <button
                                    key={key}
                                    className="btn btn-scenario"
                                    onClick={() => loadScenario(key)}
                                    title={scenario.description}
                                >
                                    {scenario.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Algorithm Comparison */}
                    <div className="card">
                        <h3>📊 Algorithm Comparison</h3>
                        <p className="scenario-description">Compare all algorithms with current processes</p>
                        <button
                            className="btn btn-primary"
                            onClick={runComparison}
                            disabled={comparisonLoading || !memoryState?.initialized}
                            style={{ width: '100%' }}
                        >
                            {comparisonLoading ? '⏳ Comparing...' : '🔍 Compare Algorithms'}
                        </button>
                    </div>
                </aside>

                {/* Right Panel - Visualization */}
                <main className="visualization-panel">
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

                    {/* Memory Statistics at top */}
                    {memoryState && memoryState.initialized && (
                        <div className="card fragmentation-card">
                            <h3>📊 Memory Statistics</h3>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-label">Total Memory</span>
                                    <span className="stat-value">{memoryState.total_memory} KB</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Allocated</span>
                                    <span className="stat-value">{fragmentation.total_allocated || 0} KB</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Free</span>
                                    <span className="stat-value">{fragmentation.total_free_memory || 0} KB</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Fragmentation</span>
                                    <span className="stat-value highlight">
                                        {fragmentation.fragmentation_percentage || 0}%
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Free Blocks</span>
                                    <span className="stat-value">{fragmentation.external_fragments || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Largest Free</span>
                                    <span className="stat-value">{fragmentation.largest_free_block || 0} KB</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Memory Visualization */}
                    <div className="card">
                        <h2>Memory Layout</h2>

                        {memoryState && memoryState.initialized ? (
                            <div className="memory-container">
                                <div className="memory-bar">
                                    <AnimatePresence>
                                        {memoryState.blocks.map((block, index) => {
                                            const widthPercent = (block.size / memoryState.total_memory) * 100;

                                            return (
                                                <motion.div
                                                    key={`block-${block.start}-${index}`}
                                                    className={`memory-block ${block.allocated ? 'allocated' : 'free'}`}
                                                    style={{
                                                        width: `${widthPercent}%`,
                                                        backgroundColor: getBlockColor(block)
                                                    }}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    transition={{ duration: 0.3 }}
                                                    onClick={() => block.allocated && handleDeallocate(block.process_id)}
                                                >
                                                    <div className="block-content">
                                                        <span className="block-label">
                                                            {block.allocated ? `P${block.process_id}` : 'FREE'}
                                                        </span>
                                                        <span className="block-size">{block.size} KB</span>
                                                    </div>
                                                    {/* Hover Tooltip */}
                                                    <div className="block-tooltip">
                                                        <div className="tooltip-title">
                                                            {block.allocated ? `Process ${block.process_id}` : 'Free Block'}
                                                        </div>
                                                        <div className="tooltip-row">
                                                            <span>Start:</span>
                                                            <span>{block.start} KB</span>
                                                        </div>
                                                        <div className="tooltip-row">
                                                            <span>End:</span>
                                                            <span>{block.end} KB</span>
                                                        </div>
                                                        <div className="tooltip-row">
                                                            <span>Size:</span>
                                                            <span>{block.size} KB</span>
                                                        </div>
                                                        {block.allocated && (
                                                            <div className="tooltip-row" style={{ color: '#ff6b6b', marginTop: '0.5rem' }}>
                                                                <span>🗑️ Click to free</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>

                                {/* Address Labels */}
                                <div className="address-labels">
                                    <span>0</span>
                                    <span>{Math.floor(memoryState.total_memory / 4)}</span>
                                    <span>{Math.floor(memoryState.total_memory / 2)}</span>
                                    <span>{Math.floor((memoryState.total_memory * 3) / 4)}</span>
                                    <span>{memoryState.total_memory}</span>
                                </div>

                                {/* Memory Legend */}
                                <div className="memory-legend">
                                    <div className="legend-item">
                                        <div className="legend-color free"></div>
                                        <span>Free Space</span>
                                    </div>
                                    {memoryState.blocks.filter(b => b.allocated).slice(0, 5).map((block, i) => (
                                        <div key={i} className="legend-item">
                                            <div className="legend-color" style={{ backgroundColor: getBlockColor(block) }}></div>
                                            <span>P{block.process_id}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-state-icon">💾</div>
                                <h3>No Memory Initialized</h3>
                                <p>Allocate your first process to get started</p>
                            </div>
                        )}
                    </div>

                    {/* ASCII Diagram */}
                    {memoryState && memoryState.initialized && (
                        <div className="card">
                            <div className="ascii-header">
                                <h3>📝 ASCII Memory Diagram</h3>
                                <button
                                    className="btn-icon"
                                    onClick={() => setShowASCII(!showASCII)}
                                    title={showASCII ? "Hide diagram" : "Show diagram"}
                                >
                                    {showASCII ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {showASCII && (
                                <pre className="ascii-diagram">
                                    {generateASCIIDiagram()}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* Comparison Results */}
                    {comparisonResults && (
                        <div className="card">
                            <h3>🏆 Algorithm Comparison Results</h3>
                            <div className="comparison-results">
                                <table className="comparison-table">
                                    <thead>
                                        <tr>
                                            <th>Algorithm</th>
                                            <th>Fragmentation</th>
                                            <th>Free Blocks</th>
                                            <th>Largest Free</th>
                                            <th>Time (ms)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonResults.results.map((result) => (
                                            <tr
                                                key={result.algorithm}
                                                className={result.algorithm === comparisonResults.best ? 'best-result' : ''}
                                            >
                                                <td>
                                                    {result.algorithm === comparisonResults.best && '🏆 '}
                                                    {result.name || result.algorithm.replace(/_/g, ' ').toUpperCase()}
                                                    {result.failedAllocations > 0 && (
                                                        <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '8px' }}>
                                                            ({result.failedAllocations} failed)
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ color: result.fragmentation >= 100 ? '#ef4444' : 'inherit' }}>
                                                    {result.fragmentation >= 100 ? 'N/A' : `${result.fragmentation}%`}
                                                </td>
                                                <td>{result.freeBlocks}</td>
                                                <td>{result.largestFree} KB</td>
                                                <td>{result.executionTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="comparison-recommendation">
                                    <strong>✓ Best Choice:</strong> {comparisonResults.best.replace('_', ' ').toUpperCase()}
                                    (Lowest Fragmentation)
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Explanations */}
                    {explanations.length > 0 && (
                        <div className="card">
                            <h3>📝 Step-by-Step Execution</h3>
                            <div className="explanations-list">
                                {explanations.map((exp, i) => (
                                    <motion.div
                                        key={i}
                                        className="explanation-item"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <span className="step-number">{i + 1}</span>
                                        <span className="step-text">{exp}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

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
                                <h2>📚 Contiguous Memory Allocation</h2>
                                <button className="help-close" onClick={() => setShowHelp(false)}>×</button>
                            </div>
                            <div className="help-content">
                                <section className="help-section">
                                    <h3>🎯 What is Contiguous Allocation?</h3>
                                    <p>Each process is allocated a single continuous block of memory. The OS maintains a list of free and allocated memory blocks.</p>
                                </section>

                                <section className="help-section">
                                    <h3>📊 Allocation Algorithms</h3>
                                    <div className="algorithm-grid">
                                        <div className="algo-card">
                                            <strong>First Fit</strong>
                                            <p>Allocates the first hole that is big enough. Fast but can cause fragmentation at the start.</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>Best Fit</strong>
                                            <p>Allocates the smallest hole that is big enough. Produces smallest leftover holes.</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>Worst Fit</strong>
                                            <p>Allocates the largest hole. Leaves larger remaining holes for future allocations.</p>
                                        </div>
                                        <div className="algo-card">
                                            <strong>Next Fit</strong>
                                            <p>Like First Fit but starts searching from the last allocation point.</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="help-section">
                                    <h3>🔧 How to Use</h3>
                                    <ol>
                                        <li>Set <strong>Total Memory</strong> size and click Apply</li>
                                        <li>Choose an <strong>Allocation Algorithm</strong></li>
                                        <li>Enter <strong>Process ID</strong> and <strong>Size</strong></li>
                                        <li>Click <strong>Allocate Memory</strong></li>
                                        <li><strong>Click on blocks</strong> to deallocate them</li>
                                        <li>Use <strong>Compare Algorithms</strong> to see performance differences</li>
                                    </ol>
                                </section>

                                <section className="help-section">
                                    <h3>⚡ Tips</h3>
                                    <ul>
                                        <li>Hover over memory blocks to see details</li>
                                        <li>Try preset scenarios to learn about fragmentation</li>
                                        <li>Watch the fragmentation % as you allocate/deallocate</li>
                                    </ul>
                                </section>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ContiguousAllocator;
