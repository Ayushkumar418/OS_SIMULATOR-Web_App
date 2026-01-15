import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './VirtualMemory.css';

const VirtualMemory = () => {
    const navigate = useNavigate();

    // Configuration State
    const [config, setConfig] = useState({
        numFrames: 8,
        pageSize: 4, // KB
        tlbSize: 4,
        algorithm: 'lru',
        workingSetWindow: 4
    });

    // Process State
    const [processes, setProcesses] = useState([
        { id: 1, name: 'Process A', pages: 12, color: '#00ffaa' },
        { id: 2, name: 'Process B', pages: 8, color: '#ff00aa' }
    ]);
    const [activeProcess, setActiveProcess] = useState(1);

    // Memory State
    const [physicalMemory, setPhysicalMemory] = useState(
        Array(8).fill(null).map((_, i) => ({ frameId: i, page: null, processId: null, dirty: false, referenced: false }))
    );
    const [tlb, setTlb] = useState([]);
    const [pageTable, setPageTable] = useState({});

    // Simulation State
    const [referenceString, setReferenceString] = useState('0 1 2 3 0 1 4 0 1 2 3 4');
    const [timeline, setTimeline] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(1000);

    // Statistics State
    const [stats, setStats] = useState({
        pageFaults: 0,
        pageHits: 0,
        tlbHits: 0,
        tlbMisses: 0,
        diskReads: 0,
        diskWrites: 0
    });

    // Thrashing Detection
    const [cpuUtilization, setCpuUtilization] = useState([]);
    const [isThrashing, setIsThrashing] = useState(false);
    const [workingSetSize, setWorkingSetSize] = useState(0);

    // UI State
    const [showHelp, setShowHelp] = useState(false);
    const [error, setError] = useState(null);
    const [selectedFrame, setSelectedFrame] = useState(null);
    const [newProcessPages, setNewProcessPages] = useState('8');
    const [comparisonResults, setComparisonResults] = useState(null);
    const [isComparing, setIsComparing] = useState(false);
    const comparisonRef = useRef(null);

    // Page Table & Address Translation State
    const [showPageTable, setShowPageTable] = useState(false);
    const [addressInput, setAddressInput] = useState('');
    const [translationResult, setTranslationResult] = useState(null);
    const [contextSwitchCount, setContextSwitchCount] = useState(0);
    const [dirtyPageCount, setDirtyPageCount] = useState(0);

    // Algorithm info
    const algorithms = {
        fifo: { name: 'FIFO', desc: 'First-In-First-Out - replaces oldest page' },
        lru: { name: 'LRU', desc: 'Least Recently Used - replaces least recently accessed page' },
        optimal: { name: 'Optimal', desc: 'Replaces page not used for longest time in future' },
        clock: { name: 'Clock', desc: 'Second-chance algorithm using reference bit' },
        lfu: { name: 'LFU', desc: 'Least Frequently Used - replaces least accessed page' },
        mfu: { name: 'MFU', desc: 'Most Frequently Used - replaces most accessed page' }
    };

    // Demo scenarios
    const demoScenarios = [
        { name: 'Locality Demo', desc: 'Shows temporal locality', refs: '1 2 3 1 2 3 1 2 3 4 5 4 5 4 5' },
        { name: 'Thrashing Demo', desc: 'High page fault rate', refs: '0 1 2 3 4 5 6 7 0 1 2 3 4 5 6 7' },
        { name: 'Working Set', desc: 'Working set behavior', refs: '1 2 1 3 1 2 1 4 1 2 1 3 5' },
        { name: 'FIFO Anomaly', desc: 'Belady\'s anomaly case', refs: '1 2 3 4 1 2 5 1 2 3 4 5' },
        { name: 'LRU Optimal', desc: 'LRU performs well', refs: '1 2 3 4 2 1 5 6 2 1 2 3 7 6 3 2 1' },
        { name: 'Random Access', desc: 'Poor locality', refs: '7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1' }
    ];

    // Load demo scenario
    const loadScenario = (scenario) => {
        setReferenceString(scenario.refs);
        resetSimulation();
    };

    // Initialize page table for process
    const initializePageTable = useCallback((processId, numPages) => {
        const table = {};
        for (let i = 0; i < numPages; i++) {
            table[i] = {
                valid: false,
                frameNumber: null,
                dirty: false,
                referenced: false,
                loadTime: null,
                lastAccess: null,
                accessCount: 0
            };
        }
        setPageTable(prev => ({ ...prev, [processId]: table }));
    }, []);

    // Initialize system
    useEffect(() => {
        processes.forEach(p => initializePageTable(p.id, p.pages));
        setPhysicalMemory(
            Array(config.numFrames).fill(null).map((_, i) => ({
                frameId: i,
                page: null,
                processId: null,
                dirty: false,
                referenced: false
            }))
        );
    }, [config.numFrames, processes, initializePageTable]);

    // Auto-play simulation
    useEffect(() => {
        if (isPlaying && currentStep < timeline.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, playSpeed);
            return () => clearTimeout(timer);
        } else if (isPlaying && currentStep >= timeline.length - 1) {
            setIsPlaying(false);
        }
    }, [isPlaying, currentStep, timeline.length, playSpeed]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Don't trigger if typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case ' ': // Space - play/pause
                    e.preventDefault();
                    if (timeline.length > 0) {
                        setIsPlaying(prev => !prev);
                    }
                    break;
                case 'arrowleft': // Previous step
                    e.preventDefault();
                    if (currentStep > 0) {
                        setCurrentStep(prev => prev - 1);
                    }
                    break;
                case 'arrowright': // Next step
                    e.preventDefault();
                    if (currentStep < timeline.length - 1) {
                        setCurrentStep(prev => prev + 1);
                    }
                    break;
                case 'r': // Reset
                    resetSimulation();
                    break;
                case 'h': // Toggle help
                    setShowHelp(prev => !prev);
                    break;
                case 'escape': // Close help
                    setShowHelp(false);
                    setError(null);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [timeline.length, currentStep]);

    // Update state when step changes
    useEffect(() => {
        if (currentStep >= 0 && currentStep < timeline.length) {
            const step = timeline[currentStep];
            setPhysicalMemory(step.memory);
            setTlb(step.tlb);
            setStats(step.stats);
            setWorkingSetSize(step.workingSetSize);

            // Build CPU utilization for ALL steps up to current step
            // This ensures we see all bars when jumping to last step
            const allUtilData = [];
            for (let i = 0; i <= currentStep; i++) {
                const stepData = timeline[i];
                const faultRate = stepData.stats.pageFaults / (i + 1);
                // CPU util is inversely proportional to fault rate
                // If all are faults, util is 0%. If no faults, util is 100%
                const util = Math.max(0, Math.min(100, 100 - (faultRate * 100)));
                allUtilData.push({
                    step: i,
                    util: util,
                    faultRate: faultRate,
                    isFault: stepData.isFault
                });
            }
            setCpuUtilization(allUtilData);

            // Detect thrashing based on recent fault rate
            const faultRate = step.stats.pageFaults / (currentStep + 1);
            if (faultRate > 0.5 && currentStep > 5) {
                setIsThrashing(true);
            } else {
                setIsThrashing(false);
            }
        }
    }, [currentStep, timeline]);

    // Parse reference string
    const parseReferenceString = (input) => {
        return input.trim().split(/[\s,]+/).map(num => parseInt(num)).filter(num => !isNaN(num) && num >= 0);
    };

    // Find victim page based on algorithm
    const findVictim = (memory, algorithm, pages, currentIndex, accessHistory) => {
        const occupiedFrames = memory.filter(f => f.page !== null);
        if (occupiedFrames.length === 0) return 0;

        switch (algorithm) {
            case 'fifo':
                let oldestTime = Infinity;
                let oldestFrame = 0;
                occupiedFrames.forEach(f => {
                    if (f.loadTime < oldestTime) {
                        oldestTime = f.loadTime;
                        oldestFrame = f.frameId;
                    }
                });
                return oldestFrame;

            case 'lru':
                let lruTime = Infinity;
                let lruFrame = 0;
                occupiedFrames.forEach(f => {
                    if (f.lastAccess < lruTime) {
                        lruTime = f.lastAccess;
                        lruFrame = f.frameId;
                    }
                });
                return lruFrame;

            case 'optimal':
                let farthestUse = -1;
                let optimalFrame = occupiedFrames[0].frameId;
                occupiedFrames.forEach(f => {
                    let nextUse = Infinity;
                    for (let i = currentIndex + 1; i < pages.length; i++) {
                        if (pages[i] === f.page) {
                            nextUse = i;
                            break;
                        }
                    }
                    if (nextUse > farthestUse) {
                        farthestUse = nextUse;
                        optimalFrame = f.frameId;
                    }
                });
                return optimalFrame;

            case 'clock':
                // Simple clock - find first unreferenced
                for (let i = 0; i < memory.length; i++) {
                    if (memory[i].page !== null && !memory[i].referenced) {
                        return i;
                    }
                }
                // All referenced, clear and return first
                return occupiedFrames[0].frameId;

            case 'lfu':
                let minCount = Infinity;
                let lfuFrame = 0;
                occupiedFrames.forEach(f => {
                    if (f.accessCount < minCount) {
                        minCount = f.accessCount;
                        lfuFrame = f.frameId;
                    }
                });
                return lfuFrame;

            case 'mfu':
                let maxCount = -1;
                let mfuFrame = 0;
                occupiedFrames.forEach(f => {
                    if (f.accessCount > maxCount) {
                        maxCount = f.accessCount;
                        mfuFrame = f.frameId;
                    }
                });
                return mfuFrame;

            default:
                return 0;
        }
    };

    // Run simulation
    const runSimulation = () => {
        const pages = parseReferenceString(referenceString);
        if (pages.length === 0) {
            setError('Please enter a valid page reference string');
            return;
        }

        const process = processes.find(p => p.id === activeProcess);
        if (!process) {
            setError('Please select a process');
            return;
        }

        // Validate pages
        const invalidPages = pages.filter(p => p >= process.pages);
        if (invalidPages.length > 0) {
            setError(`Invalid page numbers: ${invalidPages.join(', ')}. Process has ${process.pages} pages (0-${process.pages - 1})`);
            return;
        }

        setError(null);

        // Initialize simulation
        let memory = Array(config.numFrames).fill(null).map((_, i) => ({
            frameId: i,
            page: null,
            processId: null,
            dirty: false,
            referenced: false,
            loadTime: null,
            lastAccess: null,
            accessCount: 0
        }));

        let currentTlb = [];
        let simStats = { pageFaults: 0, pageHits: 0, tlbHits: 0, tlbMisses: 0, diskReads: 0, diskWrites: 0 };
        let simTimeline = [];
        let accessHistory = [];

        pages.forEach((page, index) => {
            accessHistory.push(page);
            let isFault = false;
            let isHit = false;
            let tlbHit = false;
            let victimPage = null;
            let victimFrame = null;
            let hitFrame = null;
            let hitTlbSlot = null;

            // Check TLB first
            const tlbEntry = currentTlb.find(t => t.page === page && t.processId === activeProcess);
            if (tlbEntry) {
                tlbHit = true;
                simStats.tlbHits++;
                isHit = true;
                simStats.pageHits++;

                // Update access info
                const frame = memory.find(f => f.frameId === tlbEntry.frame);
                if (frame) {
                    frame.lastAccess = index;
                    frame.accessCount++;
                    frame.referenced = true;
                    // Simulate write operation (30% chance) - marks page dirty
                    if (Math.random() < 0.3) {
                        frame.dirty = true;
                    }
                    hitFrame = frame.frameId;
                    hitTlbSlot = currentTlb.findIndex(t => t.page === page && t.processId === activeProcess);
                }
            } else {
                simStats.tlbMisses++;

                // Check page table / physical memory
                const frameWithPage = memory.find(f => f.page === page && f.processId === activeProcess);

                if (frameWithPage) {
                    isHit = true;
                    simStats.pageHits++;
                    frameWithPage.lastAccess = index;
                    frameWithPage.accessCount++;
                    frameWithPage.referenced = true;
                    // Simulate write operation (30% chance)
                    if (Math.random() < 0.3) {
                        frameWithPage.dirty = true;
                    }
                    hitFrame = frameWithPage.frameId;

                    // Update TLB
                    if (currentTlb.length >= config.tlbSize) {
                        currentTlb.shift();
                    }
                    currentTlb.push({ page, frame: frameWithPage.frameId, processId: activeProcess });
                    hitTlbSlot = currentTlb.length - 1;
                } else {
                    // Page fault
                    isFault = true;
                    simStats.pageFaults++;
                    simStats.diskReads++;

                    // Find free frame or victim
                    let targetFrame = memory.find(f => f.page === null);

                    if (!targetFrame) {
                        // Need to replace
                        const victimFrameId = findVictim(memory, config.algorithm, pages, index, accessHistory);
                        targetFrame = memory[victimFrameId];
                        victimPage = targetFrame.page;
                        victimFrame = victimFrameId;

                        if (targetFrame.dirty) {
                            simStats.diskWrites++;
                        }

                        // Remove from TLB
                        currentTlb = currentTlb.filter(t => !(t.frame === victimFrameId));
                    }

                    // Load page
                    targetFrame.page = page;
                    targetFrame.processId = activeProcess;
                    targetFrame.dirty = false;
                    targetFrame.referenced = true;
                    targetFrame.loadTime = index;
                    targetFrame.lastAccess = index;
                    targetFrame.accessCount = 1;
                    hitFrame = targetFrame.frameId;

                    // Update TLB
                    if (currentTlb.length >= config.tlbSize) {
                        currentTlb.shift();
                    }
                    currentTlb.push({ page, frame: targetFrame.frameId, processId: activeProcess });
                    hitTlbSlot = currentTlb.length - 1;
                }
            }

            // Calculate working set
            const windowStart = Math.max(0, accessHistory.length - config.workingSetWindow);
            const workingSet = new Set(accessHistory.slice(windowStart));

            // Record step
            simTimeline.push({
                step: index,
                page,
                isFault,
                isHit,
                tlbHit,
                victimPage,
                victimFrame,
                hitFrame,
                hitTlbSlot,
                memory: JSON.parse(JSON.stringify(memory)),
                tlb: [...currentTlb],
                stats: { ...simStats },
                workingSetSize: workingSet.size,
                workingSet: Array.from(workingSet)
            });
        });

        setTimeline(simTimeline);
        setCurrentStep(0);
        setCpuUtilization([]);
        setIsThrashing(false);
    };

    // Reset simulation
    const resetSimulation = () => {
        setTimeline([]);
        setCurrentStep(-1);
        setIsPlaying(false);
        setStats({ pageFaults: 0, pageHits: 0, tlbHits: 0, tlbMisses: 0, diskReads: 0, diskWrites: 0 });
        setPhysicalMemory(
            Array(config.numFrames).fill(null).map((_, i) => ({
                frameId: i, page: null, processId: null, dirty: false, referenced: false
            }))
        );
        setTlb([]);
        setCpuUtilization([]);
        setIsThrashing(false);
        setWorkingSetSize(0);
        setComparisonResults(null);
    };

    // Simulate for a specific algorithm (internal helper)
    const simulateForAlgorithm = (pages, algorithm, numFrames, processId) => {
        let memory = Array(numFrames).fill(null).map((_, i) => ({
            frameId: i,
            page: null,
            processId: null,
            dirty: false,
            referenced: false,
            loadTime: null,
            lastAccess: null,
            accessCount: 0
        }));

        let simStats = { pageFaults: 0, pageHits: 0 };

        pages.forEach((page, index) => {
            const frameWithPage = memory.find(f => f.page === page && f.processId === processId);

            if (frameWithPage) {
                simStats.pageHits++;
                frameWithPage.lastAccess = index;
                frameWithPage.accessCount++;
                frameWithPage.referenced = true;
            } else {
                simStats.pageFaults++;
                let targetFrame = memory.find(f => f.page === null);

                if (!targetFrame) {
                    const victimFrameId = findVictim(memory, algorithm, pages, index, []);
                    targetFrame = memory[victimFrameId];
                }

                targetFrame.page = page;
                targetFrame.processId = processId;
                targetFrame.dirty = false;
                targetFrame.referenced = true;
                targetFrame.loadTime = index;
                targetFrame.lastAccess = index;
                targetFrame.accessCount = 1;
            }
        });

        return simStats;
    };

    // Compare all algorithms
    const compareAllAlgorithms = () => {
        const pages = parseReferenceString(referenceString);
        if (pages.length === 0) {
            setError('Please enter a valid page reference string');
            return;
        }

        const process = processes.find(p => p.id === activeProcess);
        if (!process) {
            setError('Please select a process');
            return;
        }

        const invalidPages = pages.filter(p => p >= process.pages);
        if (invalidPages.length > 0) {
            setError(`Invalid page numbers: ${invalidPages.join(', ')}. Process has ${process.pages} pages (0-${process.pages - 1})`);
            return;
        }

        setIsComparing(true);
        setError(null);

        // Run simulation for each algorithm
        const results = [];
        const algoKeys = ['fifo', 'lru', 'optimal', 'clock', 'lfu', 'mfu'];

        algoKeys.forEach(algo => {
            const stats = simulateForAlgorithm(pages, algo, config.numFrames, activeProcess);
            const hitRatio = stats.pageFaults + stats.pageHits > 0
                ? (stats.pageHits / (stats.pageFaults + stats.pageHits)) * 100
                : 0;

            results.push({
                algorithm: algo,
                name: algorithms[algo].name,
                pageFaults: stats.pageFaults,
                pageHits: stats.pageHits,
                hitRatio: hitRatio,
                faultRate: 100 - hitRatio
            });
        });

        // Sort by page faults (lower is better)
        results.sort((a, b) => a.pageFaults - b.pageFaults);

        // Determine best algorithm and analysis
        const best = results[0];
        const worst = results[results.length - 1];
        const current = results.find(r => r.algorithm === config.algorithm);

        // Generate analysis
        let analysis = '';
        if (best.algorithm === 'optimal') {
            analysis = `Optimal algorithm has the fewest faults (${best.pageFaults}) as expected, since it uses future knowledge. `;
            const secondBest = results[1];
            if (secondBest.pageFaults === best.pageFaults) {
                analysis += `${secondBest.name} performs equally well for this reference string. `;
            } else {
                analysis += `${secondBest.name} is the best practical algorithm with ${secondBest.pageFaults} faults. `;
            }
        } else {
            analysis = `${best.name} performs best with only ${best.pageFaults} page faults. `;
        }

        // Check for locality patterns
        const uniquePages = new Set(pages).size;
        if (uniquePages <= config.numFrames) {
            analysis += `Since unique pages (${uniquePages}) ≤ frames (${config.numFrames}), all algorithms perform similarly after initial loading. `;
        } else if (worst.pageFaults === pages.length) {
            analysis += `High fault rate indicates possible thrashing - consider increasing frames. `;
        }

        // Check if LRU beats FIFO
        const lruResult = results.find(r => r.algorithm === 'lru');
        const fifoResult = results.find(r => r.algorithm === 'fifo');
        if (lruResult && fifoResult && lruResult.pageFaults < fifoResult.pageFaults) {
            analysis += `LRU outperforms FIFO here due to temporal locality in the reference pattern. `;
        }

        // Current algorithm performance
        const currentRank = results.findIndex(r => r.algorithm === config.algorithm) + 1;
        if (currentRank === 1) {
            analysis += `Your current algorithm (${current.name}) is the best choice! `;
        } else {
            analysis += `Your current ${current.name} ranks #${currentRank}. Consider using ${best.name} for this workload. `;
        }

        setComparisonResults({
            results,
            best,
            worst,
            current,
            currentRank,
            analysis,
            totalAccesses: pages.length,
            uniquePages,
            frames: config.numFrames
        });

        setIsComparing(false);

        // Auto-scroll to comparison results
        setTimeout(() => {
            if (comparisonRef.current) {
                comparisonRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    // Add new process
    const addProcess = () => {
        // Validate pages input
        const pagesNum = parseInt(newProcessPages);
        if (isNaN(pagesNum) || newProcessPages === '') {
            setError('Please enter a valid number of pages (1-20)');
            return;
        }
        if (pagesNum < 1 || pagesNum > 20) {
            setError('Number of pages must be between 1 and 20');
            return;
        }

        const newId = Math.max(...processes.map(p => p.id)) + 1;
        const colors = ['#00ffaa', '#ff00aa', '#ffaa00', '#00aaff', '#aa00ff', '#ff5500'];
        const newProcess = {
            id: newId,
            name: `Process ${String.fromCharCode(64 + newId)}`,
            pages: pagesNum,
            color: colors[newId % colors.length]
        };
        setProcesses([...processes, newProcess]);
        initializePageTable(newId, pagesNum);
        setNewProcessPages('8'); // Reset to default as string
        setError(null);
    };

    // Delete process
    const deleteProcess = (processId) => {
        if (processes.length <= 1) {
            setError('Cannot delete the last process');
            return;
        }
        setProcesses(processes.filter(p => p.id !== processId));
        if (activeProcess === processId) {
            setActiveProcess(processes.find(p => p.id !== processId)?.id || 1);
        }
        resetSimulation();
    };

    // Update process color
    const updateProcessColor = (processId, newColor) => {
        setProcesses(processes.map(p =>
            p.id === processId ? { ...p, color: newColor } : p
        ));
    };

    // Generate random reference string
    const generateRandomReferenceString = () => {
        const process = processes.find(p => p.id === activeProcess);
        if (!process) return;

        const length = Math.floor(Math.random() * 15) + 10; // 10-24 accesses
        const pages = [];

        // Generate with some locality (70% chance to reuse recent page)
        for (let i = 0; i < length; i++) {
            if (i > 0 && Math.random() < 0.7 && pages.length > 0) {
                // Reuse one of the last 3 pages (locality)
                const recentPages = pages.slice(-3);
                pages.push(recentPages[Math.floor(Math.random() * recentPages.length)]);
            } else {
                // Random new page
                pages.push(Math.floor(Math.random() * process.pages));
            }
        }

        setReferenceString(pages.join(' '));
        resetSimulation();
    };

    // Clear comparison results
    const clearComparisonResults = () => {
        setComparisonResults(null);
    };

    // Get process color
    const getProcessColor = (processId) => {
        const process = processes.find(p => p.id === processId);
        return process?.color || '#00ffaa';
    };

    // Get page table for current process (derived from physical memory)
    const getPageTable = (processId) => {
        const process = processes.find(p => p.id === processId);
        if (!process) return [];

        const pageTable = [];
        for (let i = 0; i < process.pages; i++) {
            const frame = physicalMemory.find(f => f.page === i && f.processId === processId);
            pageTable.push({
                virtualPage: i,
                frameNumber: frame ? frame.frameId : null,
                valid: frame !== undefined,
                dirty: frame?.dirty || false,
                referenced: frame?.referenced || false,
                loadTime: frame?.loadTime,
                lastAccess: frame?.lastAccess
            });
        }
        return pageTable;
    };

    // Address Translation Demo
    const translateAddress = () => {
        const virtualAddress = parseInt(addressInput);
        if (isNaN(virtualAddress) || virtualAddress < 0) {
            setError('Please enter a valid virtual address (0 or positive integer)');
            return;
        }

        const process = processes.find(p => p.id === activeProcess);
        if (!process) {
            setError('Please select a process');
            return;
        }

        // Check if simulation has been run
        const hasSimulation = timeline.length > 0 && currentStep >= 0;

        // Get current memory and TLB state
        const currentMemory = hasSimulation ? timeline[currentStep].memory : physicalMemory;
        const currentTlb = hasSimulation ? timeline[currentStep].tlb : tlb;

        const pageSize = config.pageSize * 1024; // Convert KB to bytes
        const virtualPageNumber = Math.floor(virtualAddress / pageSize);
        const offset = virtualAddress % pageSize;

        // Check if page number is valid for this process
        if (virtualPageNumber >= process.pages) {
            setTranslationResult({
                virtualAddress,
                virtualPageNumber,
                offset,
                pageSize,
                error: `Page ${virtualPageNumber} is outside process address space (0-${process.pages - 1})`,
                steps: [
                    { step: 1, name: 'Parse Address', status: 'done', detail: `VA=${virtualAddress} → Page=${virtualPageNumber}, Offset=${offset}` },
                    { step: 2, name: 'Check Bounds', status: 'error', detail: `Page ${virtualPageNumber} > max page ${process.pages - 1}` }
                ]
            });
            return;
        }

        // If no simulation run yet, inform user
        if (!hasSimulation) {
            setTranslationResult({
                virtualAddress,
                virtualPageNumber,
                offset,
                pageSize,
                pageFault: true,
                steps: [
                    { step: 1, name: 'Parse Address', status: 'done', detail: `VA=${virtualAddress} → Page=${virtualPageNumber}, Offset=${offset}` },
                    { step: 2, name: 'Check Memory', status: 'fault', detail: 'No simulation run - all pages on disk' },
                    { step: 3, name: 'Result', status: 'pending', detail: 'Run simulation to load pages into memory' }
                ]
            });
            return;
        }

        // Check TLB first
        const tlbEntry = currentTlb.find(e => e.page === virtualPageNumber && e.processId === activeProcess);
        const steps = [
            { step: 1, name: 'Parse Address', status: 'done', detail: `VA=${virtualAddress} → Page=${virtualPageNumber}, Offset=${offset}` }
        ];

        if (tlbEntry) {
            // TLB Hit
            const physicalAddress = tlbEntry.frame * pageSize + offset;
            steps.push({ step: 2, name: 'TLB Lookup', status: 'hit', detail: `TLB HIT! Page ${virtualPageNumber} → Frame ${tlbEntry.frame}` });
            steps.push({ step: 3, name: 'Calculate PA', status: 'done', detail: `PA = ${tlbEntry.frame} × ${pageSize} + ${offset} = ${physicalAddress}` });

            setTranslationResult({
                virtualAddress,
                virtualPageNumber,
                offset,
                pageSize,
                tlbHit: true,
                frameNumber: tlbEntry.frame,
                physicalAddress,
                steps
            });
        } else {
            // TLB Miss - check page table (physical memory)
            steps.push({ step: 2, name: 'TLB Lookup', status: 'miss', detail: 'TLB MISS - checking page table...' });

            const frame = currentMemory.find(f => f.page === virtualPageNumber && f.processId === activeProcess);

            if (frame) {
                // Page in memory
                const physicalAddress = frame.frameId * pageSize + offset;
                steps.push({ step: 3, name: 'Page Table', status: 'hit', detail: `Page ${virtualPageNumber} → Frame ${frame.frameId} (Valid)` });
                steps.push({ step: 4, name: 'Calculate PA', status: 'done', detail: `PA = ${frame.frameId} × ${pageSize} + ${offset} = ${physicalAddress}` });

                setTranslationResult({
                    virtualAddress,
                    virtualPageNumber,
                    offset,
                    pageSize,
                    tlbHit: false,
                    pageTableHit: true,
                    frameNumber: frame.frameId,
                    physicalAddress,
                    steps
                });
            } else {
                // Page Fault!
                steps.push({ step: 3, name: 'Page Table', status: 'fault', detail: `Page ${virtualPageNumber} NOT in memory - PAGE FAULT!` });
                steps.push({ step: 4, name: 'Handle Fault', status: 'pending', detail: 'Would load page from disk and update TLB...' });

                setTranslationResult({
                    virtualAddress,
                    virtualPageNumber,
                    offset,
                    pageSize,
                    tlbHit: false,
                    pageTableHit: false,
                    pageFault: true,
                    steps
                });
            }
        }
    };

    // Context Switch - switch to different process
    const switchToProcess = (newProcessId) => {
        if (newProcessId === activeProcess) return;

        // Flush TLB on context switch (common in real systems)
        setTlb([]);
        setActiveProcess(newProcessId);
        setContextSwitchCount(prev => prev + 1);
        setTranslationResult(null);

        // Don't reset the simulation, just switch context
    };

    // Count dirty pages
    const countDirtyPages = () => {
        return physicalMemory.filter(f => f.dirty).length;
    };

    // Export state
    const exportState = () => {
        const data = {
            config,
            processes,
            referenceString,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `virtual-memory-state-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Import state
    const importState = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.json')) {
            setError('Invalid file type. Please select a .json file');
            event.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate required fields exist
                if (!data.config && !data.processes && !data.referenceString) {
                    setError('Invalid file format: Missing required configuration data');
                    return;
                }

                // Validate config if present
                if (data.config) {
                    const { numFrames, tlbSize, workingSetWindow, algorithm } = data.config;

                    if (numFrames !== undefined && (numFrames < 2 || numFrames > 16 || !Number.isInteger(numFrames))) {
                        setError('Import error: Physical Frames must be between 2 and 16');
                        return;
                    }
                    if (tlbSize !== undefined && (tlbSize < 1 || tlbSize > 8 || !Number.isInteger(tlbSize))) {
                        setError('Import error: TLB Size must be between 1 and 8');
                        return;
                    }
                    if (workingSetWindow !== undefined && (workingSetWindow < 2 || workingSetWindow > 10 || !Number.isInteger(workingSetWindow))) {
                        setError('Import error: Working Set Window must be between 2 and 10');
                        return;
                    }
                    if (algorithm !== undefined && !['fifo', 'lru', 'optimal', 'clock', 'lfu', 'mfu'].includes(algorithm)) {
                        setError('Import error: Invalid algorithm specified');
                        return;
                    }

                    setConfig(data.config);
                }

                // Validate processes if present
                if (data.processes) {
                    if (!Array.isArray(data.processes)) {
                        setError('Import error: Processes must be an array');
                        return;
                    }
                    for (const proc of data.processes) {
                        if (!proc.id || !proc.name || !proc.pages) {
                            setError('Import error: Each process must have id, name, and pages');
                            return;
                        }
                        if (proc.pages < 1 || proc.pages > 20) {
                            setError(`Import error: Process "${proc.name}" has invalid pages (must be 1-20)`);
                            return;
                        }
                    }
                    setProcesses(data.processes);
                }

                // Validate reference string if present
                if (data.referenceString) {
                    if (typeof data.referenceString !== 'string') {
                        setError('Import error: Reference string must be a string');
                        return;
                    }
                    setReferenceString(data.referenceString);
                }

                // Reset and auto-run simulation if reference string exists
                resetSimulation();
                setError(null);

                // Auto-run simulation after import if reference string exists
                if (data.referenceString && data.referenceString.trim()) {
                    // Use setTimeout to ensure state is updated before running simulation
                    setTimeout(() => {
                        // We need to manually run simulation with imported data
                        // since the state might not be updated yet
                        const pages = data.referenceString.trim().split(/[\s,]+/).map(num => parseInt(num)).filter(num => !isNaN(num) && num >= 0);
                        if (pages.length > 0) {
                            runSimulation();
                        }
                    }, 100);
                }

            } catch (err) {
                setError('Import failed: Invalid JSON format. Please check the file.');
            }
        };

        reader.onerror = () => {
            setError('Failed to read file. Please try again.');
        };

        reader.readAsText(file);
        event.target.value = '';
    };

    // Validate and update config field
    const updateConfig = (field, value, min, max) => {
        const numValue = parseInt(value);
        if (value === '' || isNaN(numValue)) {
            // Allow empty for typing, but show warning
            setConfig(prev => ({ ...prev, [field]: value }));
            return;
        }
        if (numValue < min) {
            setError(`${field.replace(/([A-Z])/g, ' $1').trim()} must be at least ${min}`);
            setConfig(prev => ({ ...prev, [field]: min }));
            return;
        }
        if (numValue > max) {
            setError(`${field.replace(/([A-Z])/g, ' $1').trim()} must be at most ${max}`);
            setConfig(prev => ({ ...prev, [field]: max }));
            return;
        }
        setError(null);
        setConfig(prev => ({ ...prev, [field]: numValue }));
    };

    return (
        <div className="virtual-memory">
            {/* Back Button */}
            <button className="vm-back-btn" onClick={() => navigate('/memory')}>
                ← Back to Memory Management
            </button>

            {/* Header */}
            <header className="vm-header">
                <div className="vm-header-content">
                    <h1 className="vm-title">
                        <span className="vm-icon">🌐</span>
                        Virtual Memory Simulator
                        <span className="vm-cursor">_</span>
                    </h1>
                    <p className="vm-subtitle">TLB • Demand Paging • Thrashing Detection • Working Set</p>
                    <button className="vm-help-btn" onClick={() => setShowHelp(true)}>❓ Help</button>
                </div>
            </header>

            {/* Error Notification */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        className="vm-error"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Thrashing Alert */}
            <AnimatePresence>
                {isThrashing && (
                    <motion.div
                        className="vm-thrashing-alert"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <span className="thrashing-icon">🔥</span>
                        <span>THRASHING DETECTED! High page fault rate - system performance degraded</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Layout */}
            <div className="vm-layout">
                {/* Left Panel - Controls */}
                <aside className="vm-controls">
                    {/* Configuration Card */}
                    <div className="vm-card">
                        <h3>⚙️ Configuration</h3>

                        <div className="vm-form-group">
                            <label>Physical Frames <span className="vm-range-hint">(2-16)</span></label>
                            <input
                                type="number"
                                value={config.numFrames}
                                onChange={(e) => updateConfig('numFrames', e.target.value, 2, 16)}
                                onBlur={() => {
                                    if (config.numFrames === '' || isNaN(parseInt(config.numFrames))) {
                                        setConfig(prev => ({ ...prev, numFrames: 8 }));
                                    }
                                }}
                                min="2"
                                max="16"
                                className="vm-input"
                            />
                        </div>

                        <div className="vm-form-group">
                            <label>TLB Size <span className="vm-range-hint">(1-8)</span></label>
                            <input
                                type="number"
                                value={config.tlbSize}
                                onChange={(e) => updateConfig('tlbSize', e.target.value, 1, 8)}
                                onBlur={() => {
                                    if (config.tlbSize === '' || isNaN(parseInt(config.tlbSize))) {
                                        setConfig(prev => ({ ...prev, tlbSize: 4 }));
                                    }
                                }}
                                min="1"
                                max="8"
                                className="vm-input"
                            />
                        </div>

                        <div className="vm-form-group">
                            <label>Algorithm</label>
                            <select
                                value={config.algorithm}
                                onChange={(e) => setConfig({ ...config, algorithm: e.target.value })}
                                className="vm-select"
                            >
                                {Object.entries(algorithms).map(([key, algo]) => (
                                    <option key={key} value={key}>{algo.name}</option>
                                ))}
                            </select>
                            <small className="vm-algo-desc">{algorithms[config.algorithm]?.desc}</small>
                        </div>

                        <div className="vm-form-group">
                            <label>Working Set Window (Δ) <span className="vm-range-hint">(2-10)</span></label>
                            <input
                                type="number"
                                value={config.workingSetWindow}
                                onChange={(e) => updateConfig('workingSetWindow', e.target.value, 2, 10)}
                                onBlur={() => {
                                    if (config.workingSetWindow === '' || isNaN(parseInt(config.workingSetWindow))) {
                                        setConfig(prev => ({ ...prev, workingSetWindow: 4 }));
                                    }
                                }}
                                min="2"
                                max="10"
                                className="vm-input"
                            />
                        </div>
                    </div>

                    {/* Process Selection */}
                    <div className="vm-card">
                        <h3>📋 Processes <span className="vm-context-badge" title="Context switches flush TLB">CS: {contextSwitchCount}</span></h3>
                        <div className="vm-process-list">
                            {processes.map(p => (
                                <div
                                    key={p.id}
                                    className={`vm-process-item ${activeProcess === p.id ? 'active' : ''}`}
                                    style={{ '--process-color': p.color }}
                                >
                                    <div className="vm-process-main" onClick={() => switchToProcess(p.id)}>
                                        <span className="vm-process-indicator" style={{ background: p.color }}></span>
                                        <span className="vm-process-name">{p.name}</span>
                                        <span className="vm-process-pages">{p.pages} pages</span>
                                    </div>
                                    <div className="vm-process-actions">
                                        <input
                                            type="color"
                                            value={p.color}
                                            onChange={(e) => updateProcessColor(p.id, e.target.value)}
                                            className="vm-color-picker"
                                            title="Change color"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button
                                            className="vm-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteProcess(p.id);
                                            }}
                                            title="Delete process"
                                            disabled={processes.length <= 1}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="vm-add-process-section">
                            <label className="vm-add-label">Add New Process</label>
                            <div className="vm-add-process-row">
                                <div className="vm-pages-wrapper">
                                    <span className="vm-pages-label">Pages:</span>
                                    <input
                                        type="number"
                                        value={newProcessPages}
                                        onChange={(e) => setNewProcessPages(e.target.value)}
                                        min="1"
                                        max="20"
                                        className="vm-input vm-pages-input"
                                        placeholder="1-20"
                                    />
                                </div>
                                <button className="vm-btn vm-btn-secondary" onClick={addProcess}>
                                    + Add
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Reference String Input */}
                    <div className="vm-card">
                        <h3>📝 Page References</h3>
                        <textarea
                            value={referenceString}
                            onChange={(e) => setReferenceString(e.target.value)}
                            placeholder="Enter page numbers (space-separated)"
                            className="vm-textarea"
                            rows="3"
                        />
                        <div className="vm-btn-group">
                            <button className="vm-btn vm-btn-primary" onClick={runSimulation}>
                                ▶ Simulate
                            </button>
                            <button className="vm-btn vm-btn-secondary" onClick={resetSimulation}>
                                ↺ Reset
                            </button>
                        </div>
                        <button
                            className="vm-btn vm-btn-compare"
                            onClick={compareAllAlgorithms}
                            disabled={isComparing}
                        >
                            {isComparing ? '⏳ Comparing...' : '📊 Compare All Algorithms'}
                        </button>

                        {/* Demo Scenarios */}
                        <div className="vm-scenarios">
                            <h4>📚 Demo Scenarios</h4>
                            <div className="vm-scenario-list">
                                {demoScenarios.map((scenario, idx) => (
                                    <button
                                        key={idx}
                                        className="vm-scenario-btn"
                                        onClick={() => loadScenario(scenario)}
                                        title={scenario.desc}
                                    >
                                        {scenario.name}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="vm-scenario-btn vm-random-btn"
                                onClick={generateRandomReferenceString}
                                title="Generate random reference string with locality"
                            >
                                🎲 Random
                            </button>
                        </div>
                    </div>

                    {/* Import/Export */}
                    <div className="vm-card vm-io-card">
                        <h4>💾 Save / Load</h4>
                        <div className="vm-io-btns">
                            <button className="vm-btn vm-btn-export" onClick={exportState}>📤 Export</button>
                            <label className="vm-btn vm-btn-import">
                                📥 Import
                                <input type="file" accept=".json" onChange={importState} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>

                    {/* Address Translation Demo */}
                    <div className="vm-card vm-translation-card">
                        <h4>🔄 Address Translation</h4>
                        <div className="vm-translation-input">
                            <label>Virtual Address (bytes):</label>
                            <input
                                type="number"
                                value={addressInput}
                                onChange={(e) => setAddressInput(e.target.value)}
                                placeholder="e.g., 8192"
                                className="vm-input"
                            />
                            <button className="vm-btn vm-btn-translate" onClick={translateAddress}>
                                ⚡ Translate
                            </button>
                        </div>
                        {translationResult && (
                            <div className="vm-translation-result">
                                <div className="vm-translation-steps">
                                    {translationResult.steps.map((step, idx) => (
                                        <div key={idx} className={`vm-step ${step.status}`}>
                                            <span className="vm-step-num">{step.step}</span>
                                            <span className="vm-step-name">{step.name}</span>
                                            <span className="vm-step-detail">{step.detail}</span>
                                        </div>
                                    ))}
                                </div>
                                {translationResult.physicalAddress !== undefined && (
                                    <div className="vm-translation-final">
                                        <span className="vm-pa-label">Physical Address:</span>
                                        <span className="vm-pa-value">{translationResult.physicalAddress}</span>
                                    </div>
                                )}
                                {translationResult.pageFault && (
                                    <div className="vm-translation-fault">
                                        ❌ PAGE FAULT - Page not in memory!
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Page Table Toggle */}
                    <button
                        className={`vm-btn vm-btn-pagetable ${showPageTable ? 'active' : ''}`}
                        onClick={() => setShowPageTable(!showPageTable)}
                    >
                        📋 {showPageTable ? 'Hide' : 'Show'} Page Table
                    </button>
                </aside>

                {/* Right Panel - Visualization */}
                <main className="vm-main">
                    {/* Statistics Grid */}
                    <div className="vm-stats-grid">
                        <div className="vm-stat-card fault">
                            <div className="vm-stat-icon">📄</div>
                            <div className="vm-stat-value">{stats.pageFaults}</div>
                            <div className="vm-stat-label">Page Faults</div>
                        </div>
                        <div className="vm-stat-card hit">
                            <div className="vm-stat-icon">✓</div>
                            <div className="vm-stat-value">{stats.pageHits}</div>
                            <div className="vm-stat-label">Page Hits</div>
                        </div>
                        <div className="vm-stat-card hit-ratio">
                            <div className="vm-stat-icon">📊</div>
                            <div className="vm-stat-value">
                                {stats.pageFaults + stats.pageHits > 0
                                    ? ((stats.pageHits / (stats.pageFaults + stats.pageHits)) * 100).toFixed(1)
                                    : 0}%
                            </div>
                            <div className="vm-stat-label">Hit Ratio</div>
                        </div>
                        <div className="vm-stat-card tlb-hit">
                            <div className="vm-stat-icon">⚡</div>
                            <div className="vm-stat-value">{stats.tlbHits}</div>
                            <div className="vm-stat-label">TLB Hits</div>
                        </div>
                        <div className="vm-stat-card tlb-miss">
                            <div className="vm-stat-icon">🔍</div>
                            <div className="vm-stat-value">{stats.tlbMisses}</div>
                            <div className="vm-stat-label">TLB Misses</div>
                        </div>
                        <div className="vm-stat-card disk">
                            <div className="vm-stat-icon">💿</div>
                            <div className="vm-stat-value">{stats.diskReads}</div>
                            <div className="vm-stat-label">Disk Reads</div>
                        </div>
                        <div className="vm-stat-card working-set">
                            <div className="vm-stat-icon">📈</div>
                            <div className="vm-stat-value">{workingSetSize}</div>
                            <div className="vm-stat-label">Working Set</div>
                        </div>
                    </div>

                    {/* Physical Memory Visualization */}
                    <div className="vm-card vm-memory-card">
                        <h3>🖥️ Physical Memory (Frames)</h3>
                        <div className="vm-frames-grid">
                            {physicalMemory.map((frame, idx) => {
                                const isHit = timeline[currentStep]?.hitFrame === idx && timeline[currentStep]?.isHit;
                                return (
                                    <motion.div
                                        key={`frame-${idx}-${isHit ? currentStep : 'static'}`}
                                        className={`vm-frame ${frame.page !== null ? 'occupied' : 'free'} ${timeline[currentStep]?.victimFrame === idx ? 'victim' : ''
                                            } ${timeline[currentStep]?.page === frame.page && timeline[currentStep]?.isFault ? 'loading' : ''
                                            } ${isHit ? 'hit' : ''}`}
                                        style={{ '--frame-color': frame.processId ? getProcessColor(frame.processId) : '#333' }}
                                        onClick={() => setSelectedFrame(frame)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        data-tooltip={frame.page !== null ?
                                            `🖼 Frame ${idx} | Page P${frame.page}\n📥 Load: Step ${frame.loadTime !== null ? frame.loadTime + 1 : '-'}\n🕐 Last: Step ${frame.lastAccess !== null ? frame.lastAccess + 1 : '-'}\n📊 Hits: ${frame.accessCount || 0}${frame.dirty ? '\n⚠️ Dirty' : ''}${frame.referenced ? '\n✓ Referenced' : ''}`
                                            : `📭 Frame ${idx} | Empty`
                                        }
                                    >
                                        <div className="vm-frame-color-bar"></div>
                                        <div className="vm-frame-header">F{idx}</div>
                                        <div className="vm-frame-content">
                                            {frame.page !== null ? (
                                                <>
                                                    <span className="vm-page-num">P{frame.page}</span>
                                                    {frame.dirty && <span className="vm-dirty-flag">D</span>}
                                                    {frame.referenced && <span className="vm-ref-flag">R</span>}
                                                </>
                                            ) : (
                                                <span className="vm-empty">Empty</span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* TLB Visualization */}
                    <div className="vm-card vm-tlb-card">
                        <h3>⚡ Translation Lookaside Buffer (TLB)</h3>
                        <div className="vm-tlb-grid">
                            {Array(config.tlbSize).fill(null).map((_, idx) => {
                                const entry = tlb[idx];
                                const isHitSlot = timeline[currentStep]?.hitTlbSlot === idx && timeline[currentStep]?.tlbHit;
                                return (
                                    <div key={`tlb-${idx}-${isHitSlot ? currentStep : 'static'}`} className={`vm-tlb-entry ${entry ? 'valid' : 'invalid'} ${isHitSlot ? 'hit' : ''}`}>
                                        <div className="vm-tlb-slot">Slot {idx} {isHitSlot && <span className="vm-tlb-hit-badge">HIT!</span>}</div>
                                        {entry ? (
                                            <div className="vm-tlb-mapping">
                                                <span className="vm-tlb-vpn">VPN: {entry.page}</span>
                                                <span className="vm-tlb-arrow">→</span>
                                                <span className="vm-tlb-frame">Frame: {entry.frame}</span>
                                            </div>
                                        ) : (
                                            <div className="vm-tlb-empty">Empty</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="vm-tlb-stats">
                            <span>Hit Rate: <strong>{stats.tlbHits + stats.tlbMisses > 0 ? ((stats.tlbHits / (stats.tlbHits + stats.tlbMisses)) * 100).toFixed(1) : 0}%</strong></span>
                            <span className="vm-context-switch-stat">Context Switches: <strong>{contextSwitchCount}</strong></span>
                        </div>
                    </div>

                    {/* Page Table Visualization */}
                    {showPageTable && (
                        <div className="vm-card vm-pagetable-card">
                            <div className="vm-pagetable-header">
                                <h3>📋 Page Table - {processes.find(p => p.id === activeProcess)?.name}</h3>
                                <div className="vm-pagetable-legend">
                                    <span className="vm-legend-valid">● Valid</span>
                                    <span className="vm-legend-dirty">● Dirty</span>
                                    <span className="vm-legend-invalid">○ Invalid</span>
                                </div>
                            </div>
                            <div className="vm-pagetable-grid">
                                <div className="vm-pagetable-row header">
                                    <span>Virtual Page</span>
                                    <span>Frame #</span>
                                    <span>Valid</span>
                                    <span>Dirty</span>
                                    <span>Ref</span>
                                </div>
                                {getPageTable(activeProcess).map((entry, idx) => (
                                    <div key={idx} className={`vm-pagetable-row ${entry.valid ? 'valid' : 'invalid'} ${entry.dirty ? 'dirty' : ''}`}>
                                        <span className="vm-vp">P{entry.virtualPage}</span>
                                        <span className="vm-fn">{entry.valid ? `F${entry.frameNumber}` : '-'}</span>
                                        <span className={`vm-flag ${entry.valid ? 'active' : ''}`}>{entry.valid ? '✓' : '✗'}</span>
                                        <span className={`vm-flag ${entry.dirty ? 'dirty-flag' : ''}`}>{entry.dirty ? '⚠' : '-'}</span>
                                        <span className={`vm-flag ${entry.referenced ? 'ref-flag' : ''}`}>{entry.referenced ? '●' : '-'}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="vm-pagetable-summary">
                                <span>Pages in Memory: <strong>{getPageTable(activeProcess).filter(e => e.valid).length}</strong></span>
                                <span>Dirty Pages: <strong className="dirty-count">{getPageTable(activeProcess).filter(e => e.dirty).length}</strong></span>
                            </div>
                        </div>
                    )}

                    {/* Playback Controls */}
                    {timeline.length > 0 && (
                        <div className="vm-card vm-playback-card">
                            <h3>🎮 Playback Controls</h3>
                            <div className="vm-playback-controls">
                                <button
                                    className="vm-playback-btn"
                                    onClick={() => setCurrentStep(0)}
                                    disabled={currentStep <= 0}
                                    title="First"
                                >
                                    ⏮⏮
                                </button>
                                <button
                                    className="vm-playback-btn"
                                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                    disabled={currentStep <= 0}
                                    title="Previous"
                                >
                                    ⏮
                                </button>
                                <button
                                    className="vm-playback-btn play-pause"
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    title={isPlaying ? 'Pause' : 'Play'}
                                >
                                    {isPlaying ? '⏸' : '▶'}
                                </button>
                                <button
                                    className="vm-playback-btn"
                                    onClick={() => setCurrentStep(Math.min(timeline.length - 1, currentStep + 1))}
                                    disabled={currentStep >= timeline.length - 1}
                                    title="Next"
                                >
                                    ⏭
                                </button>
                                <button
                                    className="vm-playback-btn"
                                    onClick={() => setCurrentStep(timeline.length - 1)}
                                    disabled={currentStep >= timeline.length - 1}
                                    title="Last"
                                >
                                    ⏭⏭
                                </button>
                                <span className="vm-step-counter">
                                    Step {currentStep + 1} / {timeline.length}
                                </span>
                            </div>

                            {/* Current Step Info */}
                            {timeline[currentStep] && (
                                <div className="vm-step-info">
                                    <div className={`vm-step-badge ${timeline[currentStep].isFault ? 'fault' : 'hit'}`}>
                                        {timeline[currentStep].isFault ? '❌ PAGE FAULT' : '✓ PAGE HIT'}
                                    </div>
                                    <div className="vm-step-details">
                                        <span>Accessing Page: <strong>P{timeline[currentStep].page}</strong></span>
                                        {timeline[currentStep].tlbHit && <span className="vm-tlb-hit-badge">⚡ TLB Hit</span>}
                                        {timeline[currentStep].victimPage !== null && (
                                            <span className="vm-victim-info">
                                                Evicted: P{timeline[currentStep].victimPage} from F{timeline[currentStep].victimFrame}
                                            </span>
                                        )}
                                    </div>
                                    <div className="vm-working-set-info">
                                        Working Set: [{timeline[currentStep].workingSet?.join(', ')}]
                                    </div>
                                </div>
                            )}

                            {/* Speed Control */}
                            <div className="vm-speed-control">
                                <span>Speed:</span>
                                {[2000, 1000, 500, 250].map(speed => (
                                    <button
                                        key={speed}
                                        className={`vm-speed-btn ${playSpeed === speed ? 'active' : ''}`}
                                        onClick={() => setPlaySpeed(speed)}
                                    >
                                        {speed === 2000 ? '0.5x' : speed === 1000 ? '1x' : speed === 500 ? '2x' : '4x'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* CPU Utilization Chart (Thrashing Indicator) */}
                    {timeline.length > 0 && (
                        <div className="vm-card vm-chart-card">
                            <h3>📈 CPU Utilization & Thrashing Monitor</h3>
                            <div className="vm-chart-info">
                                <span>Steps: <strong>{currentStep + 1} / {timeline.length}</strong></span>
                                <span>Fault Rate: <strong>{((stats.pageFaults / (currentStep + 1)) * 100).toFixed(1)}%</strong></span>
                                <span>Status: <strong className={isThrashing ? 'thrashing-text' : 'normal-text'}>
                                    {isThrashing ? '🔥 THRASHING' : '✓ Normal'}
                                </strong></span>
                            </div>
                            <div className="vm-chart">
                                <div className="vm-chart-y-axis">
                                    <span>100%</span>
                                    <span>50%</span>
                                    <span>0%</span>
                                </div>
                                <div className="vm-chart-container">
                                    <div className="vm-chart-bars">
                                        {cpuUtilization.map((point, idx) => (
                                            <div
                                                key={idx}
                                                className={`vm-chart-bar ${point.util < 30 ? 'critical' : point.util < 60 ? 'warning' : ''} ${point.step === currentStep ? 'current' : ''}`}
                                                style={{ height: `${Math.max(point.util, 5)}%` }}
                                                data-tooltip={`Step ${point.step + 1} • ${point.util.toFixed(0)}% CPU • ${point.isFault ? '❌ Fault' : '✓ Hit'}`}
                                            >
                                                {point.step === currentStep && <span className="vm-bar-marker">▼</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="vm-chart-x-labels">
                                        {cpuUtilization.length > 0 && (
                                            <>
                                                <span>1</span>
                                                {cpuUtilization.length > 1 && <span>{currentStep + 1}</span>}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="vm-chart-legend">
                                <span className="vm-legend-good">● Normal (&gt;60%)</span>
                                <span className="vm-legend-warning">● Warning (30-60%)</span>
                                <span className="vm-legend-critical">● Thrashing (&lt;30%)</span>
                            </div>
                        </div>
                    )}

                    {/* Algorithm Comparison Results */}
                    {comparisonResults && (
                        <div ref={comparisonRef} className="vm-card vm-comparison-card">
                            <div className="vm-comparison-header">
                                <h3>📊 Algorithm Comparison Results</h3>
                                <button
                                    className="vm-btn vm-btn-clear"
                                    onClick={clearComparisonResults}
                                    title="Clear comparison results"
                                >
                                    ✕ Clear
                                </button>
                            </div>

                            {/* Summary Stats */}
                            <div className="vm-comparison-summary">
                                <div className="vm-summary-item">
                                    <span className="vm-summary-label">Total Accesses:</span>
                                    <span className="vm-summary-value">{comparisonResults.totalAccesses}</span>
                                </div>
                                <div className="vm-summary-item">
                                    <span className="vm-summary-label">Unique Pages:</span>
                                    <span className="vm-summary-value">{comparisonResults.uniquePages}</span>
                                </div>
                                <div className="vm-summary-item">
                                    <span className="vm-summary-label">Frames:</span>
                                    <span className="vm-summary-value">{comparisonResults.frames}</span>
                                </div>
                            </div>

                            {/* Comparison Table */}
                            <div className="vm-comparison-table-wrapper">
                                <table className="vm-comparison-table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Algorithm</th>
                                            <th>Page Faults</th>
                                            <th>Page Hits</th>
                                            <th>Hit Ratio</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comparisonResults.results.map((result, idx) => (
                                            <tr
                                                key={result.algorithm}
                                                className={`
                                                    ${idx === 0 ? 'best-row' : ''}
                                                    ${result.algorithm === config.algorithm ? 'current-row' : ''}
                                                    ${idx === comparisonResults.results.length - 1 ? 'worst-row' : ''}
                                                `}
                                            >
                                                <td className="rank-cell">
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                                </td>
                                                <td className="algo-cell">
                                                    {result.name}
                                                    {result.algorithm === config.algorithm && <span className="current-badge">Current</span>}
                                                </td>
                                                <td className="fault-cell">{result.pageFaults}</td>
                                                <td className="hit-cell">{result.pageHits}</td>
                                                <td className="ratio-cell">{result.hitRatio.toFixed(1)}%</td>
                                                <td className="status-cell">
                                                    {idx === 0 ? (
                                                        <span className="best-badge">✓ Best</span>
                                                    ) : idx === comparisonResults.results.length - 1 ? (
                                                        <span className="worst-badge">✗ Worst</span>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Analysis */}
                            <div className="vm-comparison-analysis">
                                <h4>💡 Analysis</h4>
                                <p>{comparisonResults.analysis}</p>
                            </div>

                            {/* Best Algorithm Recommendation */}
                            <div className="vm-recommendation">
                                <div className="vm-recommendation-header">
                                    <span className="vm-rec-icon">🏆</span>
                                    <span className="vm-rec-title">Recommended Algorithm</span>
                                </div>
                                <div className="vm-recommendation-content">
                                    <span className="vm-rec-algo">{comparisonResults.best.name}</span>
                                    <span className="vm-rec-stats">
                                        {comparisonResults.best.pageFaults} faults • {comparisonResults.best.hitRatio.toFixed(1)}% hit ratio
                                    </span>
                                </div>
                                {comparisonResults.best.algorithm !== config.algorithm && (
                                    <button
                                        className="vm-btn vm-btn-apply"
                                        onClick={() => setConfig({ ...config, algorithm: comparisonResults.best.algorithm })}
                                    >
                                        Apply {comparisonResults.best.name} Algorithm
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Help Modal */}
            <AnimatePresence>
                {showHelp && (
                    <motion.div
                        className="vm-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowHelp(false)}
                    >
                        <motion.div
                            className="vm-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="vm-modal-header">
                                <h2>🌐 Virtual Memory Simulator Help</h2>
                                <button onClick={() => setShowHelp(false)}>✕</button>
                            </div>
                            <div className="vm-modal-body">
                                <section>
                                    <h3>📖 What is Virtual Memory?</h3>
                                    <p>Virtual memory creates an illusion of a large, contiguous memory space by using disk as extension of RAM. Processes can use more memory than physically available.</p>
                                </section>

                                <section>
                                    <h3>🔧 How to Use</h3>
                                    <ol>
                                        <li>Configure <strong>Physical Frames</strong> and <strong>TLB Size</strong></li>
                                        <li>Select a <strong>Page Replacement Algorithm</strong></li>
                                        <li>Choose or create a <strong>Process</strong></li>
                                        <li>Enter <strong>Page Reference String</strong> or use presets</li>
                                        <li>Click <strong>Simulate</strong> and watch the animation</li>
                                        <li>Use playback controls to step through each access</li>
                                    </ol>
                                </section>

                                <section>
                                    <h3>📊 Page Replacement Algorithms (6 Total)</h3>
                                    <ul>
                                        <li><strong>FIFO:</strong> Replace the oldest page. Simple but has Belady's anomaly.</li>
                                        <li><strong>LRU:</strong> Replace least recently used. Good locality exploitation.</li>
                                        <li><strong>Optimal:</strong> Replace page used furthest in future. Theoretical best.</li>
                                        <li><strong>Clock (Second Chance):</strong> FIFO with reference bit check.</li>
                                        <li><strong>LFU:</strong> Replace least frequently used page.</li>
                                        <li><strong>MFU:</strong> Replace most frequently used page.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>💾 TLB (Translation Lookaside Buffer)</h3>
                                    <ul>
                                        <li><strong>TLB Hit:</strong> Page-to-frame mapping found in cache (fast)</li>
                                        <li><strong>TLB Miss:</strong> Must consult page table (slower)</li>
                                        <li>TLB caches recent translations to speed up address conversion</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>📈 Key Metrics</h3>
                                    <ul>
                                        <li><strong>Page Faults:</strong> Page not in memory (expensive disk I/O)</li>
                                        <li><strong>Page Hits:</strong> Page already in memory (fast)</li>
                                        <li><strong>Hit Ratio:</strong> Percentage of accesses satisfied from memory</li>
                                        <li><strong>Dirty Pages:</strong> Modified pages that need write-back</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>⚠️ Thrashing Detection</h3>
                                    <p>When too many processes compete for limited frames, the system spends more time paging than executing. CPU utilization drops dramatically.</p>
                                </section>

                                <section>
                                    <h3>🔄 Working Set</h3>
                                    <p>The set of pages actively used by a process within a time window. Keeping the working set in memory minimizes page faults.</p>
                                </section>

                                <section>
                                    <h3>⌨️ Keyboard Shortcuts</h3>
                                    <div className="vm-shortcuts">
                                        <div><kbd>Space</kbd> Play/Pause</div>
                                        <div><kbd>←</kbd> Previous Step</div>
                                        <div><kbd>→</kbd> Next Step</div>
                                        <div><kbd>R</kbd> Reset Simulation</div>
                                        <div><kbd>H</kbd> Toggle Help</div>
                                        <div><kbd>Esc</kbd> Close Help</div>
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

export default VirtualMemory;
