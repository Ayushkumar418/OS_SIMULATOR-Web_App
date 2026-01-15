import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './SegmentationSimulator.css';

/**
 * Segmentation Simulator Component
 * 
 * Provides an interactive visualization of segmented memory management with:
 * - Segment table creation with protection bits
 * - First Fit memory allocation
 * - Address translation (segment:offset -> physical)
 * - Protection violation detection
 * - External fragmentation visualization
 */
const SegmentationSimulator = () => {
    const navigate = useNavigate();

    // ========== STATE MANAGEMENT ==========

    // Configuration
    const [totalMemory, setTotalMemory] = useState(1024);
    const [currentPid, setCurrentPid] = useState(1);

    // Segments for creating new process
    const [newSegments, setNewSegments] = useState([
        { name: 'Code', size: 150, read: true, write: false, execute: true },
        { name: 'Data', size: 100, read: true, write: true, execute: false },
        { name: 'Stack', size: 80, read: true, write: true, execute: false }
    ]);

    // Memory state
    const [memoryMap, setMemoryMap] = useState([]);
    const [segmentTables, setSegmentTables] = useState({});
    const [processes, setProcesses] = useState([]);
    const [fragmentation, setFragmentation] = useState({
        fragmentation_percent: 0,
        num_holes: 1,
        free_memory: 1024,
        used_memory: 0
    });

    // Address translation
    const [translatePid, setTranslatePid] = useState('');
    const [translateSegment, setTranslateSegment] = useState('');
    const [translateOffset, setTranslateOffset] = useState('');
    const [translationResult, setTranslationResult] = useState(null);

    // UI State
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [activeTab, setActiveTab] = useState('allocate');
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [explanations, setExplanations] = useState([]);

    // Animation states
    const [animatingSegment, setAnimatingSegment] = useState(null);
    const [highlightedAddress, setHighlightedAddress] = useState(null);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);

    // NEW FEATURE STATES
    // Allocation algorithm
    const [allocationAlgorithm, setAllocationAlgorithm] = useState('firstFit');
    const [lastAllocatedAddress, setLastAllocatedAddress] = useState(0);

    // Visual
    const [hoveredBlock, setHoveredBlock] = useState(null);

    // Protection test
    const [testPid, setTestPid] = useState('');
    const [testSegment, setTestSegment] = useState('');
    const [testAccessType, setTestAccessType] = useState('read');
    const [protectionResult, setProtectionResult] = useState(null);

    // Metrics
    const [metrics, setMetrics] = useState({
        allocSuccess: 0,
        allocFail: 0,
        totalAllocations: 0,
        avgHoleSize: 0
    });

    // Resize modal
    const [showResizeModal, setShowResizeModal] = useState(false);
    const [resizeTarget, setResizeTarget] = useState(null); // {pid, segmentNum, currentSize}
    const [resizeNewSize, setResizeNewSize] = useState('');

    // Share modal
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareSource, setShareSource] = useState(null); // {pid, segmentNum, name}
    const [shareTargetPid, setShareTargetPid] = useState('');

    // Comparison mode
    const [showComparison, setShowComparison] = useState(false);
    const [comparisonResults, setComparisonResults] = useState(null);

    // Segment sharing
    const [sharedSegments, setSharedSegments] = useState({}); // {segmentKey: [pid1, pid2]}

    // ========== INITIALIZATION ==========

    useEffect(() => {
        initializeMemory();
    }, [totalMemory]);

    const initializeMemory = () => {
        setMemoryMap([{ type: 'hole', start: 0, size: totalMemory, end: totalMemory }]);
        setSegmentTables({});
        setProcesses([]);
        setCurrentPid(1); // Reset process ID to start from P1
        setFragmentation({
            fragmentation_percent: 0,
            num_holes: 1,
            free_memory: totalMemory,
            used_memory: 0,
            largest_hole: totalMemory
        });
        setExplanations([`Initialized ${totalMemory} bytes of memory`]);
    };

    // ========== HELPER FUNCTIONS ==========

    const addExplanation = useCallback((text) => {
        setExplanations(prev => [...prev.slice(-9), text]);
    }, []);

    const findHoles = useCallback(() => {
        return memoryMap.filter(block => block.type === 'hole');
    }, [memoryMap]);

    // ALLOCATION ALGORITHMS
    const firstFitAllocate = useCallback((size) => {
        const holes = findHoles();
        for (const hole of holes) {
            if (hole.size >= size) return hole.start;
        }
        return null;
    }, [findHoles]);

    const bestFitAllocate = useCallback((size) => {
        const holes = findHoles().filter(h => h.size >= size);
        if (holes.length === 0) return null;
        const best = holes.reduce((min, h) => h.size < min.size ? h : min);
        return best.start;
    }, [findHoles]);

    const worstFitAllocate = useCallback((size) => {
        const holes = findHoles().filter(h => h.size >= size);
        if (holes.length === 0) return null;
        const worst = holes.reduce((max, h) => h.size > max.size ? h : max);
        return worst.start;
    }, [findHoles]);

    const nextFitAllocate = useCallback((size) => {
        const holes = findHoles();
        // Start from last allocated position
        const sortedHoles = [...holes].sort((a, b) => a.start - b.start);
        for (const hole of sortedHoles) {
            if (hole.start >= lastAllocatedAddress && hole.size >= size) {
                return hole.start;
            }
        }
        // Wrap around
        for (const hole of sortedHoles) {
            if (hole.size >= size) return hole.start;
        }
        return null;
    }, [findHoles, lastAllocatedAddress]);

    const allocateWithAlgorithm = useCallback((size) => {
        switch (allocationAlgorithm) {
            case 'bestFit': return bestFitAllocate(size);
            case 'worstFit': return worstFitAllocate(size);
            case 'nextFit': return nextFitAllocate(size);
            default: return firstFitAllocate(size);
        }
    }, [allocationAlgorithm, firstFitAllocate, bestFitAllocate, worstFitAllocate, nextFitAllocate]);

    const updateFragmentation = useCallback((newMemoryMap) => {
        const holes = newMemoryMap.filter(b => b.type === 'hole');
        const totalFree = holes.reduce((sum, h) => sum + h.size, 0);
        const largestHole = holes.length > 0 ? Math.max(...holes.map(h => h.size)) : 0;
        const fragRatio = totalFree > 0 ? 1 - (largestHole / totalFree) : 0;
        const avgHole = holes.length > 0 ? totalFree / holes.length : 0;

        setFragmentation({
            fragmentation_percent: (fragRatio * 100).toFixed(1),
            num_holes: holes.length,
            free_memory: totalFree,
            used_memory: totalMemory - totalFree,
            largest_hole: largestHole
        });
        setMetrics(prev => ({ ...prev, avgHoleSize: avgHole.toFixed(0) }));
    }, [totalMemory]);

    // MEMORY COMPACTION
    const compactMemory = () => {
        const segments = memoryMap.filter(b => b.type === 'segment').sort((a, b) => a.start - b.start);
        let currentAddress = 0;
        const newMap = [];
        const tableUpdates = {};

        for (const seg of segments) {
            newMap.push({ ...seg, start: currentAddress, end: currentAddress + seg.size });
            // Track table updates
            if (!tableUpdates[seg.pid]) tableUpdates[seg.pid] = {};
            tableUpdates[seg.pid][seg.segment_number] = currentAddress;
            currentAddress += seg.size;
        }

        // Add remaining hole
        if (currentAddress < totalMemory) {
            newMap.push({ type: 'hole', start: currentAddress, size: totalMemory - currentAddress, end: totalMemory });
        }

        // Update segment tables
        const newTables = { ...segmentTables };
        for (const pid of Object.keys(tableUpdates)) {
            const table = [...newTables[pid]];
            for (const segNum of Object.keys(tableUpdates[pid])) {
                table[segNum] = { ...table[segNum], base_address: tableUpdates[pid][segNum] };
            }
            newTables[pid] = table;
        }

        setMemoryMap(newMap);
        setSegmentTables(newTables);
        updateFragmentation(newMap);
        addExplanation('🔧 Memory compacted - all holes merged');
        setSuccess('Memory compacted successfully');
        setTimeout(() => setSuccess(null), 2000);
    };

    // PROTECTION TEST
    const testProtection = () => {
        const pid = parseInt(testPid);
        const segNum = parseInt(testSegment);
        const table = segmentTables[pid];

        if (!table || !table[segNum]) {
            setProtectionResult({ allowed: false, error: 'Segment not found' });
            return;
        }

        const seg = table[segNum];
        const prot = seg.protection;
        let allowed = false;

        if (testAccessType === 'read') allowed = prot.read;
        else if (testAccessType === 'write') allowed = prot.write;
        else if (testAccessType === 'execute') allowed = prot.execute;

        setProtectionResult({
            allowed,
            segment: seg.name,
            protection: seg.protection_string,
            accessType: testAccessType
        });
        addExplanation(allowed ? `✅ ${testAccessType.toUpperCase()} allowed on ${seg.name}` : `❌ ${testAccessType.toUpperCase()} denied on ${seg.name}`);
    };

    // EXPORT/IMPORT
    const exportState = () => {
        const state = { totalMemory, memoryMap, segmentTables, processes, currentPid, allocationAlgorithm };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'segmentation_state.json';
        a.click();
        addExplanation('💾 State exported');
    };

    const importState = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const state = JSON.parse(ev.target.result);
                setTotalMemory(state.totalMemory);
                setMemoryMap(state.memoryMap);
                setSegmentTables(state.segmentTables);
                setProcesses(state.processes);
                setCurrentPid(state.currentPid);
                setAllocationAlgorithm(state.allocationAlgorithm || 'firstFit');
                updateFragmentation(state.memoryMap);
                addExplanation('📂 State imported');
                setSuccess('State imported');
                setTimeout(() => setSuccess(null), 2000);
            } catch { setError('Invalid file format'); }
        };
        reader.readAsText(file);
    };

    // ALGORITHM COMPARISON
    const runComparison = () => {
        // More realistic test: allocate, deallocate to create holes, then allocate more
        // This creates multiple holes so algorithms behave differently
        const results = {};

        for (const algo of ['firstFit', 'bestFit', 'worstFit']) {
            let simMap = [{ type: 'hole', start: 0, size: totalMemory, end: totalMemory }];
            let success = 0, fail = 0;
            let allocations = []; // Track allocations for deallocation

            // Helper to find hole based on algorithm
            const findHole = (size, holes) => {
                if (algo === 'firstFit') {
                    return holes.find(h => h.size >= size);
                } else if (algo === 'bestFit') {
                    const valid = holes.filter(h => h.size >= size);
                    return valid.length ? valid.reduce((m, h) => h.size < m.size ? h : m) : null;
                } else { // worstFit
                    const valid = holes.filter(h => h.size >= size);
                    return valid.length ? valid.reduce((m, h) => h.size > m.size ? h : m) : null;
                }
            };

            // Helper to allocate
            const allocate = (size) => {
                const holes = simMap.filter(b => b.type === 'hole');
                const chosen = findHole(size, holes);

                if (chosen) {
                    success++;
                    simMap = simMap.filter(b => b !== chosen);
                    const newBlock = { type: 'segment', start: chosen.start, size, end: chosen.start + size };
                    simMap.push(newBlock);
                    allocations.push(newBlock);
                    if (chosen.size > size) {
                        simMap.push({ type: 'hole', start: chosen.start + size, size: chosen.size - size, end: chosen.end });
                    }
                    simMap.sort((a, b) => a.start - b.start);
                    return true;
                }
                fail++;
                return false;
            };

            // Helper to deallocate by index
            const deallocate = (index) => {
                if (index < allocations.length) {
                    const block = allocations[index];
                    simMap = simMap.filter(b => b !== block);
                    simMap.push({ type: 'hole', start: block.start, size: block.size, end: block.end });
                    simMap.sort((a, b) => a.start - b.start);

                    // Merge adjacent holes
                    const merged = [];
                    for (const block of simMap) {
                        if (merged.length > 0 && merged[merged.length - 1].type === 'hole' && block.type === 'hole' &&
                            merged[merged.length - 1].end === block.start) {
                            merged[merged.length - 1].size += block.size;
                            merged[merged.length - 1].end = block.end;
                        } else {
                            merged.push({ ...block });
                        }
                    }
                    simMap = merged;
                }
            };

            // Phase 1: Initial allocations to fill memory with different sized blocks
            allocate(80);   // Block 0
            allocate(120);  // Block 1
            allocate(60);   // Block 2
            allocate(100);  // Block 3
            allocate(50);   // Block 4

            // Phase 2: Deallocate some to create multiple holes (fragmentation!)
            deallocate(1);  // Free the 120 block -> creates hole
            deallocate(3);  // Free the 100 block -> creates another hole

            // Phase 3: New allocations - algorithms will make different choices!
            allocate(70);   // Will pick which hole?
            allocate(90);   // Will pick which hole?
            allocate(110);  // Might fail depending on holes
            allocate(40);   // Small allocation

            // Calculate final statistics
            const holes = simMap.filter(b => b.type === 'hole');
            const segments = simMap.filter(b => b.type === 'segment');
            const free = holes.reduce((s, h) => s + h.size, 0);
            const used = segments.reduce((s, seg) => s + seg.size, 0);
            const largest = holes.length ? Math.max(...holes.map(h => h.size)) : 0;
            const frag = free > 0 ? ((1 - largest / free) * 100).toFixed(1) : 0;

            results[algo] = {
                success,
                fail,
                holes: holes.length,
                fragmentation: frag,
                used,
                free
            };
        }

        setComparisonResults(results);
        setShowComparison(true);
    };

    // SEGMENT RESIZE
    const resizeSegment = (pid, segmentNum, newSize) => {
        const table = segmentTables[pid];
        if (!table || !table[segmentNum]) return;

        const segment = table[segmentNum];
        if (!segment.is_allocated) {
            setError('Segment must be allocated first');
            return;
        }

        const oldSize = segment.limit;
        const diff = newSize - oldSize;

        if (diff === 0) return;

        if (diff > 0) {
            // Growing - check if space after segment is available
            const segBlock = memoryMap.find(b =>
                b.type === 'segment' && b.pid === pid && b.segment_number === segmentNum
            );
            const nextBlock = memoryMap.find(b => b.start === segBlock.end);

            if (!nextBlock || nextBlock.type !== 'hole' || nextBlock.size < diff) {
                setError(`Cannot grow: need ${diff} adjacent bytes, not available`);
                return;
            }

            // Expand segment, shrink hole
            const newMap = memoryMap.map(b => {
                if (b === segBlock) {
                    return { ...b, size: newSize, end: b.start + newSize };
                }
                if (b === nextBlock) {
                    return nextBlock.size > diff
                        ? { ...b, start: b.start + diff, size: b.size - diff }
                        : null;
                }
                return b;
            }).filter(Boolean);

            newMap.sort((a, b) => a.start - b.start);
            setMemoryMap(newMap);
            updateFragmentation(newMap);
        } else {
            // Shrinking - release end portion as hole
            const shrinkAmount = Math.abs(diff);
            const segBlock = memoryMap.find(b =>
                b.type === 'segment' && b.pid === pid && b.segment_number === segmentNum
            );

            let newMap = memoryMap.map(b => {
                if (b === segBlock) {
                    return { ...b, size: newSize, end: b.start + newSize };
                }
                return b;
            });

            newMap.push({ type: 'hole', start: segBlock.start + newSize, size: shrinkAmount, end: segBlock.end });
            newMap.sort((a, b) => a.start - b.start);
            newMap = mergeAdjacentHoles(newMap);
            setMemoryMap(newMap);
            updateFragmentation(newMap);
        }

        // Update segment table
        const newTable = [...table];
        newTable[segmentNum] = { ...segment, limit: newSize };
        setSegmentTables(prev => ({ ...prev, [pid]: newTable }));

        addExplanation(`↔️ Resized P${pid}:${segment.name} from ${oldSize} to ${newSize} bytes`);
        setSuccess(`Segment resized to ${newSize} bytes`);
        setTimeout(() => setSuccess(null), 2000);
    };

    // SEGMENT SHARING
    const shareSegment = (sourcePid, segmentNum, targetPid) => {
        const sourceTable = segmentTables[sourcePid];
        const targetTable = segmentTables[targetPid];

        if (!sourceTable || !targetTable) {
            setError('Both processes must exist');
            return;
        }

        const segment = sourceTable[segmentNum];
        if (!segment || !segment.is_allocated) {
            setError('Segment must be allocated to share');
            return;
        }

        // Add reference to target process
        const newTargetTable = [...targetTable, {
            ...segment,
            segment_number: targetTable.length,
            name: `Shared_${segment.name}`,
            is_shared: true,
            shared_from: { pid: sourcePid, segment: segmentNum }
        }];

        setSegmentTables(prev => ({ ...prev, [targetPid]: newTargetTable }));

        // Update memory map to show the shared segment belongs to target process too
        const updatedMap = memoryMap.map(block => {
            if (block.type === 'segment' && block.pid === sourcePid && block.segment_number === segmentNum) {
                return {
                    ...block,
                    shared_with: [...(block.shared_with || []), targetPid]
                };
            }
            return block;
        });
        setMemoryMap(updatedMap);

        // Track shared segments
        const shareKey = `${sourcePid}-${segmentNum}`;
        setSharedSegments(prev => ({
            ...prev,
            [shareKey]: [...(prev[shareKey] || [sourcePid]), targetPid]
        }));

        addExplanation(`🔗 Shared P${sourcePid}:${segment.name} → P${targetPid}`);
        setSuccess(`Segment shared with P${targetPid}`);
        setTimeout(() => setSuccess(null), 2000);
    };

    // ========== SEGMENT OPERATIONS ==========

    const handleAddSegment = () => {
        if (newSegments.length >= 8) {
            setError('Maximum 8 segments per process');
            return;
        }
        setNewSegments([...newSegments, {
            name: `Segment_${newSegments.length}`,
            size: 50,
            read: true,
            write: false,
            execute: false
        }]);
    };

    const handleRemoveSegment = (index) => {
        if (newSegments.length <= 1) {
            setError('Must have at least one segment');
            return;
        }
        setNewSegments(newSegments.filter((_, i) => i !== index));
    };

    const handleSegmentChange = (index, field, value) => {
        const updated = [...newSegments];
        updated[index] = { ...updated[index], [field]: value };
        setNewSegments(updated);
    };

    const createProcess = () => {
        // Validate segments
        const totalSize = newSegments.reduce((sum, s) => sum + s.size, 0);
        if (totalSize > fragmentation.largest_hole) {
            setError(`Total size (${totalSize}) exceeds largest available block (${fragmentation.largest_hole})`);
            return;
        }

        // Check if PID already exists
        if (segmentTables[currentPid]) {
            setError(`Process ${currentPid} already exists`);
            return;
        }

        setLoading(true);

        // Create segment table
        const segments = newSegments.map((seg, i) => ({
            segment_number: i,
            name: seg.name,
            limit: seg.size,
            protection: { read: seg.read, write: seg.write, execute: seg.execute },
            protection_string: `${seg.read ? 'R' : '-'}${seg.write ? 'W' : '-'}${seg.execute ? 'X' : '-'}`,
            is_allocated: false,
            base_address: null
        }));

        // Update state
        setSegmentTables(prev => ({
            ...prev,
            [currentPid]: segments
        }));
        setProcesses(prev => [...prev, currentPid]);

        addExplanation(`Created segment table for P${currentPid} with ${segments.length} segments`);
        setSuccess(`Process P${currentPid} created with ${segments.length} segments`);
        setCurrentPid(prev => prev + 1);
        setLoading(false);

        setTimeout(() => setSuccess(null), 3000);
    };

    const allocateSegment = (pid, segmentNum) => {
        const table = segmentTables[pid];
        if (!table) return;

        const segment = table[segmentNum];
        if (!segment || segment.is_allocated) return;

        // Find space using selected algorithm
        const baseAddr = allocateWithAlgorithm(segment.limit);
        if (baseAddr === null) {
            setError(`No contiguous block of ${segment.limit} bytes available (${allocationAlgorithm})`);
            setMetrics(prev => ({ ...prev, allocFail: prev.allocFail + 1, totalAllocations: prev.totalAllocations + 1 }));
            return;
        }

        setLastAllocatedAddress(baseAddr + segment.limit);
        setMetrics(prev => ({ ...prev, allocSuccess: prev.allocSuccess + 1, totalAllocations: prev.totalAllocations + 1 }));

        setAnimatingSegment({ pid, segmentNum });

        // Update memory map
        const newMap = [];
        for (const block of memoryMap) {
            if (block.type === 'hole' && block.start === baseAddr) {
                // Add the new segment
                newMap.push({
                    type: 'segment',
                    start: baseAddr,
                    size: segment.limit,
                    end: baseAddr + segment.limit,
                    pid: pid,
                    segment_number: segmentNum,
                    segment_name: segment.name,
                    protection: segment.protection_string
                });
                // Add remaining hole if any
                if (block.size > segment.limit) {
                    newMap.push({
                        type: 'hole',
                        start: baseAddr + segment.limit,
                        size: block.size - segment.limit,
                        end: block.end
                    });
                }
            } else {
                newMap.push(block);
            }
        }
        newMap.sort((a, b) => a.start - b.start);

        // Update segment table
        const updatedTable = [...table];
        updatedTable[segmentNum] = {
            ...segment,
            is_allocated: true,
            base_address: baseAddr
        };

        setMemoryMap(newMap);
        setSegmentTables(prev => ({ ...prev, [pid]: updatedTable }));
        updateFragmentation(newMap);

        addExplanation(`✅ Allocated '${segment.name}' (P${pid}) at address ${baseAddr}-${baseAddr + segment.limit - 1}`);

        setTimeout(() => setAnimatingSegment(null), 600);
    };

    const deallocateSegment = (pid, segmentNum) => {
        const table = segmentTables[pid];
        if (!table) return;

        const segment = table[segmentNum];
        if (!segment || !segment.is_allocated) return;

        const baseAddr = segment.base_address;

        // Remove segment and add hole
        let newMap = memoryMap.filter(
            block => !(block.type === 'segment' && block.pid === pid && block.segment_number === segmentNum)
        );

        // Add hole at the freed location
        newMap.push({
            type: 'hole',
            start: baseAddr,
            size: segment.limit,
            end: baseAddr + segment.limit
        });

        // Sort and merge adjacent holes
        newMap.sort((a, b) => a.start - b.start);
        newMap = mergeAdjacentHoles(newMap);

        // Update segment table
        const updatedTable = [...table];
        updatedTable[segmentNum] = {
            ...segment,
            is_allocated: false,
            base_address: null
        };

        setMemoryMap(newMap);
        setSegmentTables(prev => ({ ...prev, [pid]: updatedTable }));
        updateFragmentation(newMap);

        addExplanation(`🗑️ Deallocated '${segment.name}' (P${pid}), freed ${segment.limit} bytes`);
    };

    const mergeAdjacentHoles = (map) => {
        const merged = [];
        for (const block of map) {
            if (block.type !== 'hole') {
                merged.push(block);
                continue;
            }

            const lastHole = merged.length > 0 && merged[merged.length - 1].type === 'hole'
                ? merged[merged.length - 1]
                : null;

            if (lastHole && lastHole.end === block.start) {
                lastHole.size += block.size;
                lastHole.end = block.end;
            } else {
                merged.push(block);
            }
        }
        return merged;
    };

    const terminateProcess = (pid) => {
        // Deallocate all segments
        const table = segmentTables[pid];
        if (!table) return;

        let newMap = [...memoryMap];

        // Remove all segments for this process and add holes
        for (const segment of table) {
            if (segment.is_allocated) {
                newMap = newMap.filter(
                    block => !(block.type === 'segment' && block.pid === pid && block.segment_number === segment.segment_number)
                );
                newMap.push({
                    type: 'hole',
                    start: segment.base_address,
                    size: segment.limit,
                    end: segment.base_address + segment.limit
                });
            }
        }

        newMap.sort((a, b) => a.start - b.start);
        newMap = mergeAdjacentHoles(newMap);

        // Remove from state
        const { [pid]: removed, ...remainingTables } = segmentTables;

        setMemoryMap(newMap);
        setSegmentTables(remainingTables);
        setProcesses(prev => prev.filter(p => p !== pid));
        updateFragmentation(newMap);

        addExplanation(`🧹 Terminated P${pid}, all segments freed`);
    };

    // ========== ADDRESS TRANSLATION ==========

    const translateAddress = () => {
        const pid = parseInt(translatePid);
        const segNum = parseInt(translateSegment);
        const offset = parseInt(translateOffset);

        // Validation
        if (isNaN(pid) || isNaN(segNum) || isNaN(offset)) {
            setError('Please enter valid numbers for PID, segment, and offset');
            return;
        }

        if (offset < 0) {
            setTranslationResult({
                success: false,
                error: 'Negative offset not allowed',
                fault_type: 'invalid_offset'
            });
            return;
        }

        const table = segmentTables[pid];
        if (!table) {
            setTranslationResult({
                success: false,
                error: `No segment table for PID ${pid}`,
                fault_type: 'segment_fault'
            });
            return;
        }

        if (segNum < 0 || segNum >= table.length) {
            setTranslationResult({
                success: false,
                error: `Invalid segment number: ${segNum}`,
                fault_type: 'segment_fault'
            });
            return;
        }

        const segment = table[segNum];

        if (!segment.is_allocated) {
            setTranslationResult({
                success: false,
                error: `Segment ${segNum} (${segment.name}) not allocated`,
                fault_type: 'segment_fault'
            });
            addExplanation(`❌ Segment fault: Segment ${segNum} not in memory`);
            return;
        }

        // Bounds check
        if (offset >= segment.limit) {
            setTranslationResult({
                success: false,
                error: `Offset ${offset} exceeds limit ${segment.limit}`,
                fault_type: 'bounds_violation',
                segment_limit: segment.limit
            });
            addExplanation(`❌ Bounds violation: Offset ${offset} >= limit ${segment.limit}`);
            return;
        }

        // Calculate physical address
        const physicalAddr = segment.base_address + offset;

        setTranslationResult({
            success: true,
            segment_name: segment.name,
            base_address: segment.base_address,
            limit: segment.limit,
            offset: offset,
            physical_address: physicalAddr,
            calculation: `${segment.base_address} + ${offset} = ${physicalAddr}`
        });

        setHighlightedAddress(physicalAddr);
        addExplanation(`📍 P${pid}:S${segNum}+${offset} → ${physicalAddr}`);

        setTimeout(() => setHighlightedAddress(null), 2000);
    };

    // ========== PRESET SCENARIOS ==========

    const presetScenarios = [
        {
            name: "Basic Process",
            desc: "Code, Data, Stack segments",
            segments: [
                { name: 'Code', size: 150, read: true, write: false, execute: true },
                { name: 'Data', size: 100, read: true, write: true, execute: false },
                { name: 'Stack', size: 80, read: true, write: true, execute: false }
            ]
        },
        {
            name: "Large Process",
            desc: "5 segments for complex app",
            segments: [
                { name: 'Code', size: 200, read: true, write: false, execute: true },
                { name: 'Data', size: 150, read: true, write: true, execute: false },
                { name: 'Heap', size: 100, read: true, write: true, execute: false },
                { name: 'Stack', size: 80, read: true, write: true, execute: false },
                { name: 'Shared', size: 50, read: true, write: false, execute: false }
            ]
        },
        {
            name: "Minimal Process",
            desc: "Code only",
            segments: [
                { name: 'Code', size: 100, read: true, write: false, execute: true }
            ]
        }
    ];

    const loadPreset = (preset) => {
        setNewSegments([...preset.segments]);
        setShowPresetDropdown(false);
    };

    // ========== RENDER HELPERS ==========

    const getProcessColor = (pid) => {
        const colors = [
            '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
            '#10b981', '#06b6d4', '#ef4444', '#84cc16'
        ];
        return colors[pid % colors.length];
    };

    const formatBytes = (bytes) => {
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    // ========== RENDER ==========

    return (
        <div className="segmentation-simulator">
            {/* Back Button */}
            <button className="seg-back-button" onClick={() => navigate('/memory')}>
                ← Back to Memory Management
            </button>

            {/* Header */}
            <header className="segmentation-header">
                <div className="header-content">
                    <h1 className="matrix-title">
                        <span className="matrix-bracket">{'>'}</span>
                        Segmentation Simulation
                        <span className="matrix-cursor">_</span>
                    </h1>
                    <p className="header-subtitle">Segment Tables • Address Translation • Protection Bits • Fragmentation</p>
                    <button className="help-button" onClick={() => setShowHelp(true)}>❓ Help</button>
                </div>
            </header>

            {/* Notifications */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        className="notification error-notification"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <span className="notif-icon">⚠️</span>
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        className="notification success-notification"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <span className="notif-icon">✅</span>
                        <span>{success}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Layout */}
            <div className="segmentation-layout">
                {/* Left Panel - Controls */}
                <aside className="control-panel">
                    {/* Memory Config */}
                    <div className="panel-card">
                        <h3>⚙️ Memory Configuration</h3>
                        <div className="config-row">
                            <label>Total Memory</label>
                            <select
                                value={totalMemory}
                                onChange={(e) => setTotalMemory(parseInt(e.target.value))}
                                className="seg-select"
                            >
                                <option value={512}>512 B</option>
                                <option value={1024}>1 KB</option>
                                <option value={2048}>2 KB</option>
                                <option value={4096}>4 KB</option>
                            </select>
                        </div>
                        <div className="config-row">
                            <label>Allocation Algorithm</label>
                            <select
                                value={allocationAlgorithm}
                                onChange={(e) => setAllocationAlgorithm(e.target.value)}
                                className="seg-select"
                            >
                                <option value="firstFit">First Fit</option>
                                <option value="bestFit">Best Fit</option>
                                <option value="worstFit">Worst Fit</option>
                                <option value="nextFit">Next Fit</option>
                            </select>
                        </div>
                        <div className="config-actions">
                            <button className="reset-btn" onClick={initializeMemory}>🔄 Reset</button>
                            <button className="compact-btn" onClick={compactMemory}>📦 Compact</button>
                        </div>
                        <div className="config-actions">
                            <button className="export-btn" onClick={exportState}>💾 Export</button>
                            <label className="import-btn">
                                📂 Import
                                <input type="file" accept=".json" onChange={importState} hidden />
                            </label>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button
                            className={`tab-btn ${activeTab === 'allocate' ? 'active' : ''}`}
                            onClick={() => setActiveTab('allocate')}
                        >
                            📦 Create
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
                            onClick={() => setActiveTab('translate')}
                        >
                            🔢 Translate
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'protect' ? 'active' : ''}`}
                            onClick={() => setActiveTab('protect')}
                        >
                            🛡️ Protect
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
                            onClick={() => setActiveTab('compare')}
                        >
                            ⚖️ Compare
                        </button>
                    </div>

                    {/* Create Process Tab */}
                    {activeTab === 'allocate' && (
                        <div className="panel-card create-process-card">
                            <div className="card-header">
                                <h3>📦 Create Process P{currentPid}</h3>
                                <div className="preset-dropdown">
                                    <button
                                        className={`preset-btn ${showPresetDropdown ? 'open' : ''}`}
                                        onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                    >
                                        📋 Presets
                                        <span className="dropdown-arrow">▼</span>
                                    </button>
                                    <AnimatePresence>
                                        {showPresetDropdown && (
                                            <motion.div
                                                className="preset-menu"
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                {presetScenarios.map((preset, i) => (
                                                    <button key={i} onClick={() => loadPreset(preset)}>
                                                        <strong>{preset.name}</strong>
                                                        <span>{preset.desc}</span>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Segments List */}
                            <div className="segments-list">
                                {newSegments.map((seg, idx) => (
                                    <motion.div
                                        key={idx}
                                        className="segment-edit-row"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                        <input
                                            type="text"
                                            value={seg.name}
                                            onChange={(e) => handleSegmentChange(idx, 'name', e.target.value)}
                                            className="seg-name-input"
                                            placeholder="Name"
                                        />
                                        <input
                                            type="number"
                                            value={seg.size}
                                            onChange={(e) => handleSegmentChange(idx, 'size', parseInt(e.target.value) || 0)}
                                            className="seg-size-input"
                                            min="1"
                                        />
                                        <span className="size-label">bytes</span>

                                        <div className="protection-toggles">
                                            <button
                                                className={`prot-btn ${seg.read ? 'active read' : ''}`}
                                                onClick={() => handleSegmentChange(idx, 'read', !seg.read)}
                                                title="Read"
                                            >R</button>
                                            <button
                                                className={`prot-btn ${seg.write ? 'active write' : ''}`}
                                                onClick={() => handleSegmentChange(idx, 'write', !seg.write)}
                                                title="Write"
                                            >W</button>
                                            <button
                                                className={`prot-btn ${seg.execute ? 'active execute' : ''}`}
                                                onClick={() => handleSegmentChange(idx, 'execute', !seg.execute)}
                                                title="Execute"
                                            >X</button>
                                        </div>

                                        <button
                                            className="remove-seg-btn"
                                            onClick={() => handleRemoveSegment(idx)}
                                        >✕</button>
                                    </motion.div>
                                ))}
                            </div>

                            <button className="add-segment-btn" onClick={handleAddSegment}>
                                + Add Segment
                            </button>

                            <div className="total-size">
                                Total: {newSegments.reduce((sum, s) => sum + s.size, 0)} bytes
                            </div>

                            <button
                                className="create-process-btn"
                                onClick={createProcess}
                                disabled={loading || newSegments.length === 0}
                            >
                                🚀 Create Process
                            </button>
                        </div>
                    )}

                    {/* Address Translation Tab */}
                    {activeTab === 'translate' && (
                        <div className="panel-card translate-card">
                            <h3>🔢 Address Translation</h3>
                            <p className="card-desc">Convert logical (segment:offset) to physical address</p>

                            <div className="translate-inputs">
                                <div className="input-group">
                                    <label>Process ID</label>
                                    <input
                                        type="number"
                                        value={translatePid}
                                        onChange={(e) => setTranslatePid(e.target.value)}
                                        placeholder="PID"
                                        className="seg-input"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Segment #</label>
                                    <input
                                        type="number"
                                        value={translateSegment}
                                        onChange={(e) => setTranslateSegment(e.target.value)}
                                        placeholder="0"
                                        className="seg-input"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Offset</label>
                                    <input
                                        type="number"
                                        value={translateOffset}
                                        onChange={(e) => setTranslateOffset(e.target.value)}
                                        placeholder="0"
                                        className="seg-input"
                                    />
                                </div>
                            </div>

                            <button
                                className="translate-btn"
                                onClick={translateAddress}
                                disabled={!translatePid || translateSegment === '' || translateOffset === ''}
                            >
                                ⚡ Translate Address
                            </button>

                            {/* Translation Result */}
                            {translationResult && (
                                <motion.div
                                    className={`translation-result ${translationResult.success ? 'success' : 'error'}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    {translationResult.success ? (
                                        <>
                                            <div className="result-header">✅ Translation Successful</div>
                                            <div className="result-details">
                                                <div className="result-row">
                                                    <span>Segment:</span>
                                                    <span className="value">{translationResult.segment_name}</span>
                                                </div>
                                                <div className="result-row">
                                                    <span>Base Address:</span>
                                                    <span className="value">{translationResult.base_address}</span>
                                                </div>
                                                <div className="result-row">
                                                    <span>Limit:</span>
                                                    <span className="value">{translationResult.limit}</span>
                                                </div>
                                                <div className="calculation">
                                                    <code>{translationResult.calculation}</code>
                                                </div>
                                                <div className="physical-address">
                                                    Physical Address: <strong>{translationResult.physical_address}</strong>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="result-header">❌ Translation Failed</div>
                                            <div className="fault-type">{translationResult.fault_type?.replace('_', ' ').toUpperCase()}</div>
                                            <div className="error-message">{translationResult.error}</div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Protection Test Tab */}
                    {activeTab === 'protect' && (
                        <div className="panel-card protect-card">
                            <h3>🛡️ Protection Test</h3>
                            <p className="card-desc">Test if memory access is allowed by protection bits</p>

                            <div className="translate-inputs">
                                <div className="input-group">
                                    <label>Process ID</label>
                                    <input
                                        type="number"
                                        value={testPid}
                                        onChange={(e) => setTestPid(e.target.value)}
                                        placeholder="PID"
                                        className="seg-input"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Segment #</label>
                                    <input
                                        type="number"
                                        value={testSegment}
                                        onChange={(e) => setTestSegment(e.target.value)}
                                        placeholder="0"
                                        className="seg-input"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Access Type</label>
                                    <select
                                        value={testAccessType}
                                        onChange={(e) => setTestAccessType(e.target.value)}
                                        className="seg-select"
                                    >
                                        <option value="read">Read</option>
                                        <option value="write">Write</option>
                                        <option value="execute">Execute</option>
                                    </select>
                                </div>
                            </div>

                            <button className="translate-btn" onClick={testProtection}>
                                🔐 Test Access
                            </button>

                            {protectionResult && (
                                <motion.div
                                    className={`translation-result ${protectionResult.allowed ? 'success' : 'error'}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    {protectionResult.allowed ? (
                                        <div className="result-header">✅ Access Allowed</div>
                                    ) : (
                                        <div className="result-header">❌ Access Denied</div>
                                    )}
                                    {protectionResult.segment && (
                                        <div className="result-details">
                                            <div className="result-row">
                                                <span>Segment:</span>
                                                <span className="value">{protectionResult.segment}</span>
                                            </div>
                                            <div className="result-row">
                                                <span>Protection:</span>
                                                <span className="value">{protectionResult.protection}</span>
                                            </div>
                                            <div className="result-row">
                                                <span>Access:</span>
                                                <span className="value">{protectionResult.accessType?.toUpperCase()}</span>
                                            </div>
                                        </div>
                                    )}
                                    {protectionResult.error && (
                                        <div className="error-message">{protectionResult.error}</div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* Algorithm Comparison Tab */}
                    {activeTab === 'compare' && (
                        <div className="panel-card compare-card">
                            <h3>⚖️ Algorithm Comparison</h3>
                            <p className="card-desc">Compare allocation algorithms with test sequence</p>

                            <button className="translate-btn" onClick={runComparison}>
                                🚀 Run Comparison
                            </button>

                            {comparisonResults && (
                                <div className="comparison-results">
                                    {Object.entries(comparisonResults).map(([algo, data]) => (
                                        <div key={algo} className="algo-result">
                                            <div className="algo-name">{algo.replace('Fit', ' Fit')}</div>
                                            <div className="algo-stats">
                                                <span className="stat success">✓ {data.success}</span>
                                                <span className="stat fail">✗ {data.fail}</span>
                                                <span className="stat">Holes: {data.holes}</span>
                                                <span className="stat frag">Frag: {data.fragmentation}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Activity Log */}
                    <div className="panel-card activity-log">
                        <h3>📜 Activity Log</h3>
                        <div className="log-entries">
                            {explanations.slice().reverse().map((exp, i) => (
                                <motion.div
                                    key={i}
                                    className="log-entry"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {exp}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Main Visualization Area */}
                <main className="visualization-area">
                    {/* Statistics Cards */}
                    <div className="stats-row">
                        <div className="stat-card">
                            <div className="stat-icon">💾</div>
                            <div className="stat-value">{formatBytes(fragmentation.used_memory)}</div>
                            <div className="stat-label">Used Memory</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📭</div>
                            <div className="stat-value">{formatBytes(fragmentation.free_memory)}</div>
                            <div className="stat-label">Free Memory</div>
                        </div>
                        <div className="stat-card fragmentation">
                            <div className="stat-icon">🧩</div>
                            <div className="stat-value">{fragmentation.fragmentation_percent}%</div>
                            <div className="stat-label">Fragmentation</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🕳️</div>
                            <div className="stat-value">{fragmentation.num_holes}</div>
                            <div className="stat-label">Holes</div>
                        </div>
                    </div>

                    {/* Memory Map Visualization */}
                    <div className="memory-map-card">
                        <h3>🗺️ Memory Map</h3>
                        <div className="memory-bar-container">
                            <div className="memory-bar">
                                {memoryMap.map((block, idx) => {
                                    const widthPercent = (block.size / totalMemory) * 100;
                                    const isHighlighted = highlightedAddress !== null &&
                                        highlightedAddress >= block.start &&
                                        highlightedAddress < block.end;

                                    return (
                                        <motion.div
                                            key={idx}
                                            className={`memory-block ${block.type} ${isHighlighted ? 'highlighted' : ''}`}
                                            style={{
                                                width: `${widthPercent}%`,
                                                backgroundColor: block.type === 'segment'
                                                    ? getProcessColor(block.pid)
                                                    : undefined
                                            }}
                                            initial={{ scaleX: 0 }}
                                            animate={{
                                                scaleX: 1,
                                                boxShadow: animatingSegment?.pid === block.pid &&
                                                    animatingSegment?.segmentNum === block.segment_number
                                                    ? '0 0 20px rgba(0, 255, 65, 0.8)'
                                                    : undefined
                                            }}
                                            onMouseEnter={() => setHoveredBlock(block)}
                                            onMouseLeave={() => setHoveredBlock(null)}
                                        >
                                            {widthPercent > 8 && (
                                                <span className="block-label">
                                                    {block.type === 'segment'
                                                        ? block.shared_with?.length
                                                            ? `P${block.pid}+${block.shared_with.length}`
                                                            : `P${block.pid}`
                                                        : 'Free'}
                                                </span>
                                            )}
                                            {/* Shared indicator */}
                                            {block.shared_with?.length > 0 && (
                                                <span className="shared-indicator">🔗</span>
                                            )}
                                            {/* Custom Tooltip */}
                                            {hoveredBlock === block && (
                                                <div className="block-tooltip">
                                                    {block.type === 'segment' ? (
                                                        <>
                                                            <div className="tooltip-title">P{block.pid}: {block.segment_name}</div>
                                                            <div className="tooltip-row">Base: <span>{block.start}</span></div>
                                                            <div className="tooltip-row">Size: <span>{block.size} B</span></div>
                                                            <div className="tooltip-row">End: <span>{block.end}</span></div>
                                                            <div className="tooltip-row">Prot: <span>{block.protection}</span></div>
                                                            {block.shared_with?.length > 0 && (
                                                                <div className="tooltip-row shared">
                                                                    Shared: <span>P{block.shared_with.join(', P')}</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="tooltip-title">Free Hole</div>
                                                            <div className="tooltip-row">Start: <span>{block.start}</span></div>
                                                            <div className="tooltip-row">Size: <span>{block.size} B</span></div>
                                                            <div className="tooltip-row">End: <span>{block.end}</span></div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <div className="memory-addresses">
                                <span>0</span>
                                <span>{totalMemory / 4}</span>
                                <span>{totalMemory / 2}</span>
                                <span>{(totalMemory * 3) / 4}</span>
                                <span>{totalMemory}</span>
                            </div>
                        </div>

                        {/* Memory Legend */}
                        <div className="memory-legend">
                            <div className="legend-item">
                                <div className="legend-color hole"></div>
                                <span>Free Space (Hole)</span>
                            </div>
                            {processes.map(pid => (
                                <div key={pid} className="legend-item">
                                    <div
                                        className="legend-color"
                                        style={{ backgroundColor: getProcessColor(pid) }}
                                    ></div>
                                    <span>Process P{pid}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Segment Tables */}
                    <div className="segment-tables-section">
                        <h3>📋 Segment Tables</h3>

                        {processes.length === 0 ? (
                            <div className="no-processes">
                                <div className="no-data-icon">📭</div>
                                <p>No processes created yet</p>
                                <p className="hint">Use the "Create Process" panel to add a process</p>
                            </div>
                        ) : (
                            <div className="tables-grid">
                                {processes.map(pid => (
                                    <motion.div
                                        key={pid}
                                        className="process-table-card"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{ borderColor: getProcessColor(pid) }}
                                    >
                                        <div className="table-header">
                                            <h4>
                                                <span
                                                    className="pid-badge"
                                                    style={{ backgroundColor: getProcessColor(pid) }}
                                                >P{pid}</span>
                                                Segment Table
                                            </h4>
                                            <button
                                                className="terminate-btn"
                                                onClick={() => terminateProcess(pid)}
                                                title="Terminate Process"
                                            >
                                                🗑️
                                            </button>
                                        </div>

                                        <table className="segment-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>Base</th>
                                                    <th>Limit</th>
                                                    <th>Prot</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {segmentTables[pid]?.map(seg => (
                                                    <tr
                                                        key={seg.segment_number}
                                                        className={seg.is_allocated ? 'allocated' : 'not-allocated'}
                                                    >
                                                        <td>{seg.segment_number}</td>
                                                        <td>{seg.name}</td>
                                                        <td>
                                                            {seg.is_allocated
                                                                ? <span className="addr">{seg.base_address}</span>
                                                                : <span className="na">—</span>}
                                                        </td>
                                                        <td>{seg.limit}</td>
                                                        <td>
                                                            <span className="protection-badge">
                                                                {seg.protection_string}
                                                            </span>
                                                        </td>
                                                        <td className="action-cell">
                                                            {seg.is_allocated ? (
                                                                <div className="action-buttons">
                                                                    <button
                                                                        className="action-btn deallocate"
                                                                        onClick={() => deallocateSegment(pid, seg.segment_number)}
                                                                        title="Deallocate"
                                                                    >
                                                                        Free
                                                                    </button>
                                                                    <button
                                                                        className="action-btn resize"
                                                                        onClick={() => {
                                                                            setResizeTarget({ pid, segmentNum: seg.segment_number, currentSize: seg.limit, name: seg.name });
                                                                            setResizeNewSize(seg.limit.toString());
                                                                            setShowResizeModal(true);
                                                                        }}
                                                                        title="Resize"
                                                                    >
                                                                        ↔️
                                                                    </button>
                                                                    {processes.length > 1 && (
                                                                        <button
                                                                            className="action-btn share"
                                                                            onClick={() => {
                                                                                setShareSource({ pid, segmentNum: seg.segment_number, name: seg.name });
                                                                                setShareTargetPid('');
                                                                                setShowShareModal(true);
                                                                            }}
                                                                            title="Share with another process"
                                                                        >
                                                                            🔗
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className="action-btn allocate"
                                                                    onClick={() => allocateSegment(pid, seg.segment_number)}
                                                                >
                                                                    Alloc
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div >

            {/* Help Modal */}
            < AnimatePresence >
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
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="close-modal" onClick={() => setShowHelp(false)}>✕</button>
                            <h2>📚 Segmentation Memory Management</h2>

                            <div className="help-content">
                                <section>
                                    <h3>🎯 What is Segmentation?</h3>
                                    <p>
                                        Segmentation divides a program into logical segments (Code, Data, Stack, Heap, etc.)
                                        of varying sizes. Unlike paging, segments reflect the program's logical structure.
                                    </p>
                                </section>

                                <section>
                                    <h3>🔧 How to Use</h3>
                                    <ol>
                                        <li>Configure <strong>Memory Size</strong> and <strong>Allocation Algorithm</strong></li>
                                        <li>Go to <strong>Create</strong> tab - add segments with name, size, and protection</li>
                                        <li>Click <strong>Create Process</strong> to allocate memory</li>
                                        <li>Use <strong>Translate</strong> tab to convert logical to physical addresses</li>
                                        <li>Use <strong>Protect</strong> tab to test access permissions</li>
                                        <li>Use <strong>Compare</strong> tab to compare allocation algorithms</li>
                                    </ol>
                                </section>

                                <section>
                                    <h3>📊 Allocation Algorithms</h3>
                                    <ul>
                                        <li><strong>First Fit:</strong> Allocates the first hole large enough. Fast but fragments memory at start.</li>
                                        <li><strong>Best Fit:</strong> Allocates the smallest hole that fits. Minimizes leftover space.</li>
                                        <li><strong>Worst Fit:</strong> Allocates the largest hole. Leaves bigger remaining holes.</li>
                                        <li><strong>Next Fit:</strong> Like First Fit but continues from last allocation point.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>📋 Segment Table</h3>
                                    <p>Each process has a segment table mapping logical segments to physical addresses:</p>
                                    <ul>
                                        <li><strong>Base:</strong> Starting physical address of segment</li>
                                        <li><strong>Limit:</strong> Size of the segment in bytes</li>
                                        <li><strong>Protection:</strong> R(ead)/W(rite)/X(ecute) permissions</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>🔢 Address Translation</h3>
                                    <ul>
                                        <li>Logical address = (Segment Number, Offset)</li>
                                        <li>Physical address = Base[Segment] + Offset</li>
                                        <li>Condition: Offset &lt; Limit (bounds check prevents buffer overflow)</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>🛡️ Protection Bits</h3>
                                    <ul>
                                        <li><strong className="prot-r">R</strong> - Read access allowed (e.g., constants)</li>
                                        <li><strong className="prot-w">W</strong> - Write access allowed (e.g., heap/stack)</li>
                                        <li><strong className="prot-x">X</strong> - Execute access allowed (e.g., code)</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3>🔗 Segment Sharing</h3>
                                    <p>Segments can be shared between processes (e.g., shared libraries). Click the 🔗 button on an allocated segment to share it with another process.</p>
                                </section>

                                <section>
                                    <h3>🧩 External Fragmentation</h3>
                                    <p>
                                        Variable-sized segments cause external fragmentation - free memory
                                        becomes scattered into small, unusable holes. Use <strong>Compact</strong> to consolidate.
                                    </p>
                                </section>

                                <section>
                                    <h3>💾 Import / Export</h3>
                                    <p>Save your memory state with <strong>Export</strong> and restore later with <strong>Import</strong>.</p>
                                </section>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* Resize Modal */}
            <AnimatePresence>
                {showResizeModal && resizeTarget && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowResizeModal(false)}
                    >
                        <motion.div
                            className="resize-modal"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button className="modal-close" onClick={() => setShowResizeModal(false)}>✕</button>
                            <h3>↔️ Resize Segment</h3>
                            <p className="modal-subtitle">P{resizeTarget.pid}: {resizeTarget.name}</p>

                            <div className="resize-info">
                                <span>Current Size: <strong>{resizeTarget.currentSize} B</strong></span>
                            </div>

                            <div className="resize-input-group">
                                <label>New Size (bytes)</label>
                                <input
                                    type="number"
                                    value={resizeNewSize}
                                    onChange={(e) => setResizeNewSize(e.target.value)}
                                    min="1"
                                    className="seg-input"
                                />
                            </div>

                            <div className="modal-actions">
                                <button className="action-btn cancel" onClick={() => setShowResizeModal(false)}>Cancel</button>
                                <button
                                    className="action-btn confirm"
                                    onClick={() => {
                                        const newSize = parseInt(resizeNewSize);
                                        if (newSize > 0) {
                                            resizeSegment(resizeTarget.pid, resizeTarget.segmentNum, newSize);
                                            setShowResizeModal(false);
                                        }
                                    }}
                                >Resize</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            <AnimatePresence>
                {showShareModal && shareSource && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowShareModal(false)}
                    >
                        <motion.div
                            className="share-modal"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <button className="modal-close" onClick={() => setShowShareModal(false)}>✕</button>
                            <h3>🔗 Share Segment</h3>
                            <p className="modal-subtitle">P{shareSource.pid}: {shareSource.name}</p>

                            <div className="share-input-group">
                                <label>Share with Process</label>
                                <select
                                    value={shareTargetPid}
                                    onChange={(e) => setShareTargetPid(e.target.value)}
                                    className="seg-select"
                                >
                                    <option value="">Select process...</option>
                                    {processes.filter(p => p !== shareSource.pid).map(pid => (
                                        <option key={pid} value={pid}>P{pid}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button className="action-btn cancel" onClick={() => setShowShareModal(false)}>Cancel</button>
                                <button
                                    className="action-btn confirm"
                                    disabled={!shareTargetPid}
                                    onClick={() => {
                                        shareSegment(shareSource.pid, shareSource.segmentNum, parseInt(shareTargetPid));
                                        setShowShareModal(false);
                                    }}
                                >Share</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default SegmentationSimulator;
