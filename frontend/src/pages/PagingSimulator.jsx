import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './PagingSimulator.css';

const API_BASE = '/api/memory';

const PagingSimulator = () => {
    const navigate = useNavigate();

    // State management
    const [config, setConfig] = useState({
        pageSize: 4,      // KB
        numFrames: 8,
        algorithm: 'fifo'
    });

    const [virtualAddress, setVirtualAddress] = useState('');
    const [addressFormat, setAddressFormat] = useState('decimal'); // decimal, hex, binary
    const [translationResult, setTranslationResult] = useState(null);

    const [referenceString, setReferenceString] = useState('');
    const [memoryState, setMemoryState] = useState(null);
    const [pageTable, setPageTable] = useState([]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [playSpeed, setPlaySpeed] = useState(1000); // milliseconds between steps
    const [timeline, setTimeline] = useState([]);

    const [statistics, setStatistics] = useState({
        totalAccesses: 0,
        pageFaults: 0,
        pageHits: 0,
        hitRatio: 0
    });

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [comparisonResults, setComparisonResults] = useState(null);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Initialize paging system
    useEffect(() => {
        initializeSystem();
    }, []);

    // Auto-play effect
    useEffect(() => {
        if (isPlaying && timeline.length > 0 && currentStep < timeline.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, playSpeed);
            return () => clearTimeout(timer);
        } else if (isPlaying && currentStep >= timeline.length - 1) {
            setIsPlaying(false); // Stop at end
        }
    }, [isPlaying, currentStep, timeline.length, playSpeed]);

    // Validation functions
    const validateReferenceString = (refString) => {
        if (!refString || !refString.trim()) {
            return { valid: false, error: 'Reference string cannot be empty' };
        }

        const trimmed = refString.trim();
        // Check for valid format (numbers and spaces only)
        if (!/^[0-9\s]+$/.test(trimmed)) {
            return { valid: false, error: 'Reference string must contain only numbers and spaces' };
        }

        const pages = trimmed.split(/\s+/).map(num => parseInt(num));

        // Check for valid page numbers
        if (pages.some(p => isNaN(p) || p < 0)) {
            return { valid: false, error: 'Page numbers must be non-negative integers' };
        }

        // Check reasonable length
        if (pages.length === 0) {
            return { valid: false, error: 'Reference string must contain at least one page number' };
        }

        if (pages.length > 1000) {
            return { valid: false, error: 'Reference string too long (max 1000 page references)' };
        }

        return { valid: true, pages: pages };
    };

    const validateConfig = (configToValidate) => {
        const errors = [];

        // Validate page size
        if (configToValidate.pageSize < 1) {
            errors.push('Page size must be at least 1 byte');
        } else if (configToValidate.pageSize > 65536) {
            errors.push('Page size too large (max 65536 bytes)');
        } else if ((configToValidate.pageSize & (configToValidate.pageSize - 1)) !== 0) {
            errors.push('Page size should be a power of 2 (e.g., 256, 512, 1024, 4096)');
        }

        // Validate number of frames
        if (configToValidate.numFrames < 1) {
            errors.push('Number of frames must be at least 1');
        } else if (configToValidate.numFrames > 16) {
            errors.push('Number of frames too large (max 16 for visualization)');
        }

        return errors;
    };

    const validateVirtualAddress = (addr, format) => {
        if (!addr || !addr.trim()) {
            return { valid: false, error: 'Virtual address cannot be empty' };
        }

        const trimmed = addr.trim();
        let value;

        try {
            if (format === 'hex') {
                if (!/^[0-9A-Fa-f]+$/.test(trimmed)) {
                    return { valid: false, error: 'Invalid hexadecimal address' };
                }
                value = parseInt(trimmed, 16);
            } else if (format === 'binary') {
                if (!/^[01]+$/.test(trimmed)) {
                    return { valid: false, error: 'Invalid binary address' };
                }
                value = parseInt(trimmed, 2);
            } else {
                if (!/^[0-9]+$/.test(trimmed)) {
                    return { valid: false, error: 'Invalid decimal address' };
                }
                value = parseInt(trimmed, 10);
            }

            if (isNaN(value) || value < 0) {
                return { valid: false, error: 'Address must be non-negative' };
            }

            if (value > 1048576) { // 1MB limit for reasonable addresses
                return { valid: false, error: 'Address too large (max 1MB)' };
            }

            return { valid: true, value: value };
        } catch (e) {
            return { valid: false, error: 'Invalid address format' };
        }
    };

    // Run comparison of all algorithms
    const runComparison = () => {
        const pages = parseReferenceString(referenceString);

        if (pages.length === 0) {
            setError('Please enter a valid reference string');
            return;
        }

        setLoading(true);
        setComparisonResults(null);

        // Run all three algorithms
        const results = [];

        // FIFO
        const fifoResult = runAlgorithmForComparison('FIFO', pages, config.numFrames);
        results.push(fifoResult);

        // LRU
        const lruResult = runAlgorithmForComparison('LRU', pages, config.numFrames);
        results.push(lruResult);

        // Optimal
        const optimalResult = runAlgorithmForComparison('Optimal', pages, config.numFrames);
        results.push(optimalResult);

        // Find best algorithm (fewest faults)
        const minFaults = Math.min(...results.map(r => r.faults));
        results.forEach(r => {
            r.isBest = r.faults === minFaults;
        });

        setComparisonResults(results);
        setLoading(false);
    };

    // Helper function to run algorithm for comparison
    const runAlgorithmForComparison = (algorithmName, pages, numFrames) => {
        const frames = Array(numFrames).fill(null);
        let faults = 0;
        let hits = 0;

        if (algorithmName === 'FIFO') {
            const queue = [];
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                if (frames.includes(page)) {
                    hits++;
                } else {
                    faults++;
                    const emptyIdx = frames.indexOf(null);
                    if (emptyIdx !== -1) {
                        frames[emptyIdx] = page;
                        queue.push(page);
                    } else {
                        const victim = queue.shift();
                        const victimIdx = frames.indexOf(victim);
                        frames[victimIdx] = page;
                        queue.push(page);
                    }
                }
            }
        } else if (algorithmName === 'LRU') {
            const lastUsed = {};
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                if (frames.includes(page)) {
                    hits++;
                    lastUsed[page] = i;
                } else {
                    faults++;
                    const emptyIdx = frames.indexOf(null);
                    if (emptyIdx !== -1) {
                        frames[emptyIdx] = page;
                        lastUsed[page] = i;
                    } else {
                        let lruPage = null;
                        let lruTime = Infinity;
                        for (const p of frames) {
                            if (p !== null) {
                                const time = lastUsed[p] !== undefined ? lastUsed[p] : -1;
                                if (time < lruTime) {
                                    lruTime = time;
                                    lruPage = p;
                                }
                            }
                        }
                        const victimIdx = frames.indexOf(lruPage);
                        frames[victimIdx] = page;
                        lastUsed[page] = i;
                    }
                }
            }
        } else if (algorithmName === 'Optimal') {
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                if (frames.includes(page)) {
                    hits++;
                } else {
                    faults++;
                    const emptyIdx = frames.indexOf(null);
                    if (emptyIdx !== -1) {
                        frames[emptyIdx] = page;
                    } else {
                        let farthestUse = -1;
                        let victimPage = frames[0];
                        for (const p of frames) {
                            if (p !== null) {
                                let nextUse = Infinity;
                                for (let j = i + 1; j < pages.length; j++) {
                                    if (pages[j] === p) {
                                        nextUse = j;
                                        break;
                                    }
                                }
                                if (nextUse > farthestUse) {
                                    farthestUse = nextUse;
                                    victimPage = p;
                                }
                            }
                        }
                        const victimIdx = frames.indexOf(victimPage);
                        frames[victimIdx] = page;
                    }
                }
            }
        }

        return {
            algorithm: algorithmName,
            faults: faults,
            hits: hits,
            hitRatio: ((hits / pages.length) * 100).toFixed(1),
            accesses: pages.length
        };
    };

    const initializeSystem = async () => {
        try {
            const response = await axios.post(`${API_BASE}/create-page-table`, {
                pid: 1,
                num_pages: 16,
                num_frames: config.numFrames,
                page_size: config.pageSize
            });

            setMemoryState(response.data.memory_state);
            setPageTable(response.data.page_table || []);
        } catch (err) {
            // Backend is optional - simulation runs entirely in frontend
            // Only log to console, don't show error to user
            console.warn('Backend not available - running in frontend-only mode:', err.message);
        }
    };

    // Parse reference string into array of page numbers
    const parseReferenceString = (input) => {
        return input
            .trim()
            .split(/[\s,]+/)
            .map(num => parseInt(num))
            .filter(num => !isNaN(num) && num >= 0);
    };

    // Run page replacement simulation
    const runSimulation = () => {
        // Validate reference string
        const validation = validateReferenceString(referenceString);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        // Validate configuration
        const configErrors = validateConfig(config);
        if (configErrors.length > 0) {
            setError(configErrors.join('. '));
            return;
        }

        const pages = validation.pages;

        setLoading(true);
        setError(null);

        // Route to appropriate algorithm
        if (config.algorithm === 'fifo') {
            runFIFOSimulation(pages);
        } else if (config.algorithm === 'lru') {
            runLRUSimulation(pages);
        } else if (config.algorithm === 'optimal') {
            runOptimalSimulation(pages);
        }
    };

    // FIFO Algorithm
    const runFIFOSimulation = (pages) => {
        const frames = Array(config.numFrames).fill(null);
        const queue = [];
        const history = [];
        let faults = 0;
        let hits = 0;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            if (frames.includes(page)) {
                hits++;
                history.push({
                    step: i,
                    page: page,
                    frames: [...frames],
                    fault: false,
                    victim: null
                });
            } else {
                faults++;
                let victim = null;

                const emptyIdx = frames.indexOf(null);
                if (emptyIdx !== -1) {
                    frames[emptyIdx] = page;
                    queue.push(page);
                } else {
                    victim = queue.shift();
                    const victimIdx = frames.indexOf(victim);
                    frames[victimIdx] = page;
                    queue.push(page);
                }

                history.push({
                    step: i,
                    page: page,
                    frames: [...frames],
                    fault: true,
                    victim: victim
                });
            }
        }

        setStatistics({
            totalAccesses: pages.length,
            pageFaults: faults,
            pageHits: hits,
            hitRatio: ((hits / pages.length) * 100).toFixed(1)
        });

        setTimeline(history);
        setCurrentStep(0);
        setLoading(false);
    };

    // LRU Algorithm
    const runLRUSimulation = (pages) => {
        const frames = Array(config.numFrames).fill(null);
        const lastUsed = {}; // Track last access time for each page
        const history = [];
        let faults = 0;
        let hits = 0;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            if (frames.includes(page)) {
                // Page hit
                hits++;
                lastUsed[page] = i; // Update last used time
                history.push({
                    step: i,
                    page: page,
                    frames: [...frames],
                    fault: false,
                    victim: null
                });
            } else {
                // Page fault
                faults++;
                let victim = null;

                const emptyIdx = frames.indexOf(null);
                if (emptyIdx !== -1) {
                    // Empty frame available
                    frames[emptyIdx] = page;
                    lastUsed[page] = i;
                } else {
                    // Need to replace - find LRU page
                    let lruPage = null;
                    let lruTime = Infinity;

                    for (const p of frames) {
                        if (p !== null) {
                            const time = lastUsed[p] !== undefined ? lastUsed[p] : -1;
                            if (time < lruTime) {
                                lruTime = time;
                                lruPage = p;
                            }
                        }
                    }

                    victim = lruPage;
                    const victimIdx = frames.indexOf(victim);
                    frames[victimIdx] = page;
                    lastUsed[page] = i;
                }

                history.push({
                    step: i,
                    page: page,
                    frames: [...frames],
                    fault: true,
                    victim: victim
                });
            }
        }

        setStatistics({
            totalAccesses: pages.length,
            pageFaults: faults,
            pageHits: hits,
            hitRatio: ((hits / pages.length) * 100).toFixed(1)
        });

        setTimeline(history);
        setCurrentStep(0);
        setLoading(false);
    };

    // Optimal Algorithm
    const runOptimalSimulation = (pages) => {
        const frames = Array(config.numFrames).fill(null);
        const history = [];
        let faults = 0;
        let hits = 0;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            if (frames.includes(page)) {
                hits++;
                history.push({
                    step: i,
                    page: page,
                    frames: [...frames],
                    fault: false,
                    victim: null
                });
            } else {
                faults++;
                let victim = null;

                const emptyIdx = frames.indexOf(null);
                if (emptyIdx !== -1) {
                    frames[emptyIdx] = page;
                } else {
                    // Find page used furthest in future
                    let farthestUse = -1;
                    let victimPage = frames[0];

                    for (const p of frames) {
                        if (p !== null) {
                            // Find next use of this page
                            let nextUse = Infinity;
                            for (let j = i + 1; j < pages.length; j++) {
                                if (pages[j] === p) {
                                    nextUse = j;
                                    break;
                                }
                            }

                            if (nextUse > farthestUse) {
                                farthestUse = nextUse;
                                victimPage = p;
                            }
                        }
                    }

                    victim = victimPage;
                    const victimIdx = frames.indexOf(victim);
                    frames[victimIdx] = page;
                }

                history.push({
                    step: i,
                    page: page,
                    frames: [...frames],
                    fault: true,
                    victim: victim
                });
            }
        }

        setStatistics({
            totalAccesses: pages.length,
            pageFaults: faults,
            pageHits: hits,
            hitRatio: ((hits / pages.length) * 100).toFixed(1)
        });

        setTimeline(history);
        setCurrentStep(0);
        setLoading(false);
    };

    // Preset scenarios
    const presetScenarios = [
        { name: "Basic Example", value: "0 1 2 3 0 1 4 0 1 2 3 4", desc: "Simple demonstration" },
        { name: "FIFO Anomaly", value: "1 2 3 4 1 2 5 1 2 3 4 5", desc: "Shows Belady's anomaly" },
        { name: "Locality of Reference", value: "0 0 1 1 0 0 1 1 2 2 3 3", desc: "Repeated page access" },
        { name: "High Miss Rate", value: "0 1 2 3 4 5 6 7 8 9", desc: "Sequential with no reuse" },
        { name: "Sequential Access", value: "0 1 2 3 4 5 6 7", desc: "Linear page sequence" },
        { name: "Working Set", value: "1 2 3 4 1 2 5 1 2 3 4 5", desc: "Active page subset" }
    ];

    const loadPreset = (preset) => {
        setReferenceString(preset.value);
        setShowPresetDropdown(false);
    };

    // Export results as JSON
    const exportResults = (format) => {
        const data = {
            configuration: config,
            referenceString: referenceString,
            statistics: statistics,
            comparisonResults: comparisonResults,
            timestamp: new Date().toISOString()
        };

        if (format === 'json') {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `paging-simulation-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            let csv = 'Algorithm,Page Faults,Page Hits,Hit Ratio\n';
            if (comparisonResults) {
                comparisonResults.forEach(r => {
                    csv += `${r.algorithm},${r.faults},${r.hits},${r.hitRatio}%\n`;
                });
            } else {
                csv += `${config.algorithm.toUpperCase()},${statistics.pageFaults},${statistics.pageHits},${statistics.hitRatio}%\n`;
            }
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `paging-results-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // Navigation controls
    const stepForward = () => {
        if (currentStep < timeline.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const stepBackward = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const jumpToStep = (step) => {
        if (step >= 0 && step < timeline.length) {
            setCurrentStep(step);
        }
    };

    const togglePlayPause = () => {
        if (currentStep >= timeline.length - 1) {
            setCurrentStep(0); // Restart if at end
        }
        setIsPlaying(!isPlaying);
    };

    const changeSpeed = (newSpeed) => {
        setPlaySpeed(newSpeed);
    };

    // Translate virtual address
    const translateAddress = () => {
        // Validate address
        const validation = validateVirtualAddress(virtualAddress, addressFormat);
        if (!validation.valid) {
            setError(validation.error);
            setTranslationResult(null);
            return;
        }

        // Check if simulation has been run
        if (timeline.length === 0) {
            setError('Please run a simulation first');
            setTranslationResult(null);
            return;
        }

        const virtualAddr = validation.value;
        const pageNum = Math.floor(virtualAddr / config.pageSize);
        const offset = virtualAddr % config.pageSize;

        // Check if page is in memory
        const frameIdx = timeline[currentStep]?.frames.indexOf(pageNum);
        const isInMemory = frameIdx !== -1;

        const physicalAddr = isInMemory ? (frameIdx * config.pageSize + offset) : null;

        setError(null);
        setTranslationResult({
            virtual: virtualAddr,
            pageNumber: pageNum,
            offset: offset,
            frameNumber: isInMemory ? frameIdx : null,
            physical: physicalAddr,
            inMemory: isInMemory
        });
    };

    return (
        <div className="paging-simulator">
            {/* Back Button */}
            <button className="pg-back-button" onClick={() => navigate('/memory')}>
                ← Back to Memory Management
            </button>

            {/* Header */}
            <header className="paging-header">
                <div className="header-content">
                    <h1 className="matrix-title">
                        <span className="matrix-bracket">{'>'}</span>
                        Paging Simulation
                        <span className="matrix-cursor">_</span>
                    </h1>
                    <p className="header-subtitle">Virtual Memory • Page Tables • Address Translation</p>
                    <button className="help-button" onClick={() => setShowHelp(true)}>❓ Help</button>
                </div>
            </header>

            {/* Error Notification */}
            {error && (
                <div className="error-notification">
                    <div className="error-content">
                        <span className="error-icon">⚠️</span>
                        <span className="error-message">{error}</span>
                        <button className="error-close" onClick={() => setError(null)}>✕</button>
                    </div>
                </div>
            )}

            {/* Main Layout */}
            <div className="paging-layout">
                {/* Control Panel - Left */}
                <aside className="control-section">
                    <div className="matrix-card">
                        <h3>⚙️ Configuration</h3>

                        <div className="config-group">
                            <label>Page Size (KB)</label>
                            <select
                                value={config.pageSize}
                                onChange={(e) => setConfig({ ...config, pageSize: parseInt(e.target.value) })}
                                className="matrix-select"
                            >
                                <option value={4}>4 KB</option>
                                <option value={8}>8 KB</option>
                                <option value={16}>16 KB</option>
                            </select>
                        </div>

                        <div className="config-group">
                            <label>Physical Frames</label>
                            <input
                                type="number"
                                value={config.numFrames}
                                onChange={(e) => setConfig({ ...config, numFrames: parseInt(e.target.value) })}
                                min="4"
                                max="32"
                                className="matrix-input"
                            />
                        </div>

                        <div className="config-group">
                            <label>Replacement Algorithm</label>
                            <select
                                value={config.algorithm}
                                onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                                className="matrix-select"
                            >
                                <option value="fifo">FIFO</option>
                                <option value="lru">LRU</option>
                                <option value="optimal">Optimal</option>
                            </select>
                        </div>
                    </div>

                    {/* Address Translator */}
                    <div className="matrix-card">
                        <h3>🔢 Address Translator</h3>

                        <div className="address-input-group">
                            <input
                                type="text"
                                value={virtualAddress}
                                onChange={(e) => setVirtualAddress(e.target.value)}
                                placeholder="Enter virtual address..."
                                className="matrix-input address-input"
                            />
                            <div className="format-selector">
                                {['decimal', 'hex', 'binary'].map(format => (
                                    <button
                                        key={format}
                                        className={`format-btn ${addressFormat === format ? 'active' : ''}`}
                                        onClick={() => setAddressFormat(format)}
                                    >
                                        {format.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            className="matrix-button primary"
                            onClick={translateAddress}
                            disabled={!virtualAddress || timeline.length === 0}
                        >
                            Translate →
                        </button>

                        {/* Translation Result */}
                        {translationResult && (
                            <div className="translation-result">
                                <div className="result-row">
                                    <span>Page #:</span>
                                    <span className="value">P{translationResult.pageNumber}</span>
                                </div>
                                <div className="result-row">
                                    <span>Offset:</span>
                                    <span className="value">{translationResult.offset}</span>
                                </div>
                                <div className="result-row">
                                    <span>Physical Addr:</span>
                                    <span className={`value ${translationResult.inMemory ? '' : 'fault'}`}>
                                        {translationResult.inMemory ?
                                            translationResult.physical :
                                            '❌ PAGE FAULT'}
                                    </span>
                                </div>
                                {translationResult.inMemory && (
                                    <div className="result-row">
                                        <span>Frame #:</span>
                                        <span className="value">F{translationResult.frameNumber}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Reference String Input */}
                    <div className="matrix-card">
                        <h3>📝 Page References</h3>

                        <textarea
                            value={referenceString}
                            onChange={(e) => setReferenceString(e.target.value)}
                            placeholder="Enter page numbers (space-separated)&#10;Example: 0 1 2 3 0 1 4 0 1 2 3 4"
                            className="matrix-textarea"
                            rows="3"
                        />

                        <div className="button-group">
                            <div className="preset-dropdown-wrapper">
                                <button
                                    className="matrix-button secondary"
                                    onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                >
                                    📋 Load Preset
                                </button>
                                {showPresetDropdown && (
                                    <div className="preset-dropdown">
                                        {presetScenarios.map((preset, idx) => (
                                            <div
                                                key={idx}
                                                className="preset-item"
                                                onClick={() => loadPreset(preset)}
                                            >
                                                <div className="preset-name">{preset.name}</div>
                                                <div className="preset-desc">{preset.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                className="matrix-button primary"
                                onClick={runSimulation}
                                disabled={loading || !referenceString.trim()}
                            >
                                {loading ? 'Running...' : 'Simulate →'}
                            </button>
                        </div>

                        <button
                            className="matrix-button compare-btn"
                            onClick={runComparison}
                            disabled={loading || !referenceString.trim()}
                            style={{ marginTop: '0.75rem' }}
                        >
                            🔄 Compare All Algorithms
                        </button>
                    </div>
                </aside>

                {/* Visualization Area - Center/Right */}
                <main className="visualization-area">
                    {/* Statistics */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-value">{statistics.totalAccesses}</div>
                            <div className="stat-label">Total Accesses</div>
                        </div>
                        <div className="stat-card fault">
                            <div className="stat-icon">❌</div>
                            <div className="stat-value">{statistics.pageFaults}</div>
                            <div className="stat-label">Page Faults</div>
                        </div>
                        <div className="stat-card hit">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{statistics.pageHits}</div>
                            <div className="stat-label">Page Hits</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📈</div>
                            <div className="stat-value">{statistics.hitRatio}%</div>
                            <div className="stat-label">Hit Ratio</div>
                            {statistics.totalAccesses > 0 && (
                                <div className="export-buttons">
                                    <button className="export-btn" onClick={() => exportResults('json')}>📄 JSON</button>
                                    <button className="export-btn" onClick={() => exportResults('csv')}>📊 CSV</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Memory Grid */}
                    <div className="matrix-card memory-section">
                        <h3>🗄️ Physical Memory Frames</h3>
                        <div className="memory-grid">
                            {timeline.length > 0 ? (
                                <div className="frames-container">
                                    {timeline[currentStep]?.frames.map((page, idx) => {
                                        const isAccessedFrame = page === timeline[currentStep]?.page;
                                        return (
                                            <motion.div
                                                key={isAccessedFrame ? `${idx}-${currentStep}` : idx}
                                                className={`memory-frame ${page !== null ? 'occupied' : 'free'} ${timeline[currentStep]?.fault &&
                                                    timeline[currentStep]?.page === page ? 'page-fault' :
                                                    !timeline[currentStep]?.fault &&
                                                        timeline[currentStep]?.page === page ? 'page-hit' : ''
                                                    }`}
                                                initial={isAccessedFrame ? { scale: 0.95, opacity: 0.8 } : false}
                                                animate={isAccessedFrame ? { scale: 1, opacity: 1 } : {}}
                                                transition={isAccessedFrame ? {
                                                    duration: 0.3,
                                                    delay: 0
                                                } : {}}
                                            >
                                                <div className="frame-number">F{idx}</div>
                                                <div className="frame-content">
                                                    {page !== null ? `P${page}` : '—'}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="matrix-spinner"></div>
                                    <p>Run simulation to see memory frames</p>
                                </div>
                            )}
                        </div>

                        {/* Timeline info and controls */}
                        {timeline.length > 0 && (
                            <>
                                <div className="timeline-info">
                                    <div className="step-indicator">
                                        Step {currentStep + 1} of {timeline.length}:
                                        <span className={timeline[currentStep]?.fault ? 'fault-text' : 'hit-text'}>
                                            {timeline[currentStep]?.fault ? ' Page Fault' : ' Page Hit'}
                                        </span>
                                        {timeline[currentStep]?.victim !== null && (
                                            <span className="victim-text">
                                                {' '}(Replaced P{timeline[currentStep]?.victim})
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Playback Controls */}
                                <div className="playback-controls">
                                    <button
                                        className="playback-btn"
                                        onClick={() => jumpToStep(0)}
                                        disabled={currentStep === 0}
                                    >
                                        ⏮ First
                                    </button>
                                    <button
                                        className="playback-btn"
                                        onClick={stepBackward}
                                        disabled={currentStep === 0 || isPlaying}
                                    >
                                        ◀ Prev
                                    </button>

                                    <button
                                        className="playback-btn play-pause"
                                        onClick={togglePlayPause}
                                    >
                                        {isPlaying ? '⏸ Pause' : '▶ Play'}
                                    </button>

                                    <span className="step-counter">{currentStep + 1} / {timeline.length}</span>

                                    <button
                                        className="playback-btn"
                                        onClick={stepForward}
                                        disabled={currentStep === timeline.length - 1 || isPlaying}
                                    >
                                        Next ▶
                                    </button>
                                    <button
                                        className="playback-btn"
                                        onClick={() => jumpToStep(timeline.length - 1)}
                                        disabled={currentStep === timeline.length - 1}
                                    >
                                        Last ⏭
                                    </button>
                                </div>

                                {/* Speed Control */}
                                <div className="speed-control">
                                    <label>Speed:</label>
                                    <div className="speed-buttons">
                                        <button
                                            className={`speed-btn ${playSpeed === 1500 ? 'active' : ''}`}
                                            onClick={() => changeSpeed(1500)}
                                        >
                                            0.5x
                                        </button>
                                        <button
                                            className={`speed-btn ${playSpeed === 1000 ? 'active' : ''}`}
                                            onClick={() => changeSpeed(1000)}
                                        >
                                            1x
                                        </button>
                                        <button
                                            className={`speed-btn ${playSpeed === 500 ? 'active' : ''}`}
                                            onClick={() => changeSpeed(500)}
                                        >
                                            2x
                                        </button>
                                        <button
                                            className={`speed-btn ${playSpeed === 250 ? 'active' : ''}`}
                                            onClick={() => changeSpeed(250)}
                                        >
                                            4x
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Page Table */}
                    <div className="matrix-card">
                        <h3>📋 Page Table</h3>
                        <div className="page-table-container">
                            {timeline.length > 0 ? (
                                <div className="page-table-grid">
                                    <div className="page-table-header">
                                        <div className="table-cell">Page #</div>
                                        <div className="table-cell">Frame #</div>
                                        <div className="table-cell">Status</div>
                                    </div>
                                    {timeline[currentStep]?.frames.map((pageNum, frameIdx) => {
                                        if (pageNum === null) return null; // Skip empty frames

                                        const isCurrentPage = pageNum === timeline[currentStep]?.page;

                                        return (
                                            <div
                                                key={frameIdx}
                                                className={`page-table-row valid ${isCurrentPage ? 'current' : ''}`}
                                            >
                                                <div className="table-cell">P{pageNum}</div>
                                                <div className="table-cell">F{frameIdx}</div>
                                                <div className="table-cell">
                                                    {isCurrentPage ? (
                                                        timeline[currentStep]?.fault ? '🔴 FAULT' : '🟢 HIT'
                                                    ) : '✓ Loaded'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {timeline[currentStep]?.frames.filter(p => p !== null).length === 0 && (
                                        <div className="empty-state">
                                            <p>No pages loaded yet</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p>Page table will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Comparison Results */}
                    {comparisonResults && (
                        <div className="matrix-card comparison-section">
                            <h3>🔄 Algorithm Comparison Results</h3>
                            <div className="comparison-table">
                                <div className="comparison-header">
                                    <div className="comp-cell">Algorithm</div>
                                    <div className="comp-cell">Page Faults</div>
                                    <div className="comp-cell">Page Hits</div>
                                    <div className="comp-cell">Hit Ratio</div>
                                </div>
                                {comparisonResults.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`comparison-row ${result.isBest ? 'best-result' : ''}`}
                                    >
                                        <div className="comp-cell algorithm-name">
                                            {result.algorithm}
                                            {result.isBest && <span className="best-badge">🏆 BEST</span>}
                                        </div>
                                        <div className="comp-cell">{result.faults}</div>
                                        <div className="comp-cell">{result.hits}</div>
                                        <div className="comp-cell">{result.hitRatio}%</div>
                                    </div>
                                ))}
                            </div>
                            <div className="comparison-info">
                                <p>💡 Lower page faults = Better performance</p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="modal-overlay" onClick={() => setShowHelp(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>�� Paging Simulator Help</h2>
                            <button className="modal-close" onClick={() => setShowHelp(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <section>
                                <h3>🎯 How to Use</h3>
                                <ol>
                                    <li>Select an <strong>algorithm</strong> (FIFO, LRU, or Optimal)</li>
                                    <li>Configure <strong>frames</strong> and <strong>page size</strong></li>
                                    <li>Enter a <strong>reference string</strong> or load a preset</li>
                                    <li>Click <strong>SIMULATE</strong> to run</li>
                                    <li>Use playback controls to step through the simulation</li>
                                </ol>
                            </section>

                            <section>
                                <h3>📚 Algorithms</h3>
                                <div className="algo-desc">
                                    <strong>FIFO (First-In-First-Out)</strong>
                                    <p>Replaces the oldest page in memory. Simple but can suffer from Belady's anomaly.</p>
                                </div>
                                <div className="algo-desc">
                                    <strong>LRU (Least Recently Used)</strong>
                                    <p>Replaces the page that hasn't been used for the longest time. Better performance than FIFO.</p>
                                </div>
                                <div className="algo-desc">
                                    <strong>Optimal (Belady's Algorithm)</strong>
                                    <p>Replaces the page that won't be used for the longest time in the future. Theoretical best (requires future knowledge).</p>
                                </div>
                            </section>

                            <section>
                                <h3>🔧 Features</h3>
                                <ul>
                                    <li><strong>Auto-play:</strong> Automatic step-through with adjustable speed</li>
                                    <li><strong>Algorithm Comparison:</strong> Run all algorithms and see which performs best</li>
                                    <li><strong>Address Translation:</strong> Convert virtual addresses to physical</li>
                                    <li><strong>Export:</strong> Download results as JSON or CSV</li>
                                </ul>
                            </section>

                            <section>
                                <h3>📊 Understanding Results</h3>
                                <p><strong>Page Fault:</strong> Page not in memory (red pulse)</p>
                                <p><strong>Page Hit:</strong> Page found in memory (green pulse)</p>
                                <p><strong>Hit Ratio:</strong> Percentage of hits (higher = better)</p>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagingSimulator;
