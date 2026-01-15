import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './FileSystem.css';

// File System Simulator Component
// Provides interactive block-level file operations and visualization with:
// - Directory tree management
// - Block allocation visualization
// - File operations (create, read, write, delete)
// - Inode table display
// - Activity logging
// - Demo scenarios

const FileSystem = () => {
    const navigate = useNavigate();

    // File System Configuration
    const [config, setConfig] = useState({
        totalBlocks: 100,
        blockSize: 4, // KB
        allocationMethod: 'linked', // 'contiguous', 'linked', 'indexed'
        journalingEnabled: false,
    });

    // File System State
    const [blocks, setBlocks] = useState(Array(100).fill(null)); // null = free, or {fileId, fileName, nextBlock}
    const [files, setFiles] = useState({
        '/': { name: '/', type: 'directory', size: 0, blocks: [], indexBlock: null, createdAt: 0, modifiedAt: 0, parent: null, inode: 0, permissions: { read: true, write: true, execute: true }, owner: 'root' }
    });
    const [nextInode, setNextInode] = useState(1);

    // Defragmentation State
    const [isDefragmenting, setIsDefragmenting] = useState(false);
    const [defragProgress, setDefragProgress] = useState(0);

    // Journaling State
    const [journal, setJournal] = useState([]);
    const [showJournal, setShowJournal] = useState(false);

    // User/Quota State
    const [users] = useState([
        { id: 'root', name: 'Root', color: '#ff00ff', quota: 200, used: 0 },
        { id: 'user1', name: 'User 1', color: '#00f5ff', quota: 100, used: 0 },
        { id: 'user2', name: 'User 2', color: '#39ff14', quota: 100, used: 0 },
    ]);
    const [currentUser, setCurrentUser] = useState('root');

    // Disk Scheduling State
    const [diskHead, setDiskHead] = useState(0);
    const [seekSequence, setSeekSequence] = useState([]);
    const [schedulingAlgorithm, setSchedulingAlgorithm] = useState('fcfs');

    // UI State
    const [selectedFile, setSelectedFile] = useState(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createType, setCreateType] = useState('file'); // 'file' or 'directory'
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showContentEditor, setShowContentEditor] = useState(false);

    // File Content Storage (simulated)
    const [fileContents, setFileContents] = useState({});

    // Form State
    const [newFileName, setNewFileName] = useState('');
    const [newFileSize, setNewFileSize] = useState('4');
    const [newFileParent, setNewFileParent] = useState('/');
    const [writeSize, setWriteSize] = useState('');
    const [editingContent, setEditingContent] = useState('');
    const [newFileContent, setNewFileContent] = useState('');

    // Validation State
    const [formErrors, setFormErrors] = useState({});

    // Notification State
    const [notification, setNotification] = useState(null);

    // Animation State
    const [animatingBlocks, setAnimatingBlocks] = useState(new Set());
    const [blockAnimation, setBlockAnimation] = useState(null); // 'reading', 'writing', 'allocating', 'deallocating'

    // Activity Log
    const [activityLog, setActivityLog] = useState([]);
    const logRef = useRef(null);

    // Colors for files - highly distinct vibrant neon colors
    const fileColors = [
        '#00f5ff', // Electric Cyan
        '#ff00ff', // Magenta
        '#39ff14', // Neon Green
        '#ff1493', // Deep Pink
        '#ffd700', // Gold
        '#00ff7f', // Spring Green
        '#ff4500', // Orange Red
        '#9400d3', // Dark Violet
        '#00bfff', // Deep Sky Blue
        '#ff69b4', // Hot Pink
        '#7fff00', // Chartreuse
        '#dc143c', // Crimson
        '#00ced1', // Dark Turquoise
        '#ff8c00', // Dark Orange
        '#8a2be2', // Blue Violet
        '#adff2f', // Green Yellow
        '#ff6347', // Tomato
        '#48d1cc', // Medium Turquoise
        '#da70d6', // Orchid
        '#32cd32', // Lime Green
        '#ff6b00', // Orange
        '#ff1744', // Pink
        '#00ffcc', // Turquoise
        '#ff4500', // Orange Red
    ];

    // Get color for file - uses hash for better distribution
    const getFileColor = useCallback((filePath) => {
        if (!filePath || !files[filePath]) return '#666';
        // Use a simple hash of the file path for more varied color assignment
        let hash = 0;
        for (let i = 0; i < filePath.length; i++) {
            hash = ((hash << 5) - hash) + filePath.charCodeAt(i);
            hash = hash & hash;
        }
        return fileColors[Math.abs(hash) % fileColors.length];
    }, [files]);

    // Show notification
    const showNotification = useCallback((message, type = 'info', duration = 3000) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), duration);
    }, []);

    // Add to activity log
    const addLog = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setActivityLog(prev => [{
            id: Date.now(),
            time: timestamp,
            message,
            type
        }, ...prev].slice(0, 50)); // Keep last 50 entries
    }, []);

    // Validate file/directory name
    const validateName = useCallback((name, type = 'file') => {
        const errors = {};

        if (!name.trim()) {
            errors.name = `${type === 'file' ? 'File' : 'Directory'} name is required`;
        } else if (name.includes('/')) {
            errors.name = 'Name cannot contain "/"';
        } else if (name.includes(' ')) {
            errors.name = 'Name cannot contain spaces';
        } else if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
            errors.name = 'Name can only contain letters, numbers, dots, underscores, and hyphens';
        } else if (name.length > 50) {
            errors.name = 'Name is too long (max 50 characters)';
        }

        // Check if file already exists
        const fullPath = newFileParent === '/' ? `/${name}` : `${newFileParent}/${name}`;
        if (files[fullPath]) {
            errors.name = `"${name}" already exists in this directory`;
        }

        return errors;
    }, [files, newFileParent]);

    // Validate file size
    const validateSize = useCallback((size) => {
        const errors = {};
        const sizeNum = parseInt(size);

        if (isNaN(sizeNum)) {
            errors.size = 'Size must be a number';
        } else if (sizeNum < 0) {
            errors.size = 'Size cannot be negative';
        } else if (sizeNum > 200) {
            errors.size = 'Size cannot exceed 200 KB';
        } else {
            const blocksNeeded = Math.ceil(sizeNum / config.blockSize);
            const freeBlocks = blocks.filter(b => b === null).length;
            if (blocksNeeded > freeBlocks) {
                errors.size = `Not enough space. Need ${blocksNeeded} blocks, only ${freeBlocks} available`;
            }
        }

        return errors;
    }, [blocks, config.blockSize]);

    // Allocate blocks for a file based on allocation method
    const allocateBlocks = useCallback((count, filePath, fileName) => {
        const newBlocks = [...blocks];
        const allocatedIndices = [];
        let indexBlock = null;

        if (count === 0) {
            return { newBlocks, allocatedIndices, indexBlock, success: true };
        }

        const method = config.allocationMethod;

        if (method === 'contiguous') {
            // Contiguous allocation: find a sequence of adjacent free blocks
            let startIndex = -1;
            let consecutive = 0;

            for (let i = 0; i < newBlocks.length; i++) {
                if (newBlocks[i] === null) {
                    if (startIndex === -1) startIndex = i;
                    consecutive++;
                    if (consecutive >= count) break;
                } else {
                    startIndex = -1;
                    consecutive = 0;
                }
            }

            if (consecutive >= count) {
                for (let i = startIndex; i < startIndex + count; i++) {
                    newBlocks[i] = { fileId: filePath, fileName, allocType: 'contiguous' };
                    allocatedIndices.push(i);
                }
                return { newBlocks, allocatedIndices, indexBlock, success: true };
            } else {
                return { newBlocks: blocks, allocatedIndices: [], indexBlock: null, success: false, error: `No contiguous space for ${count} blocks` };
            }

        } else if (method === 'linked') {
            // Linked allocation: blocks can be scattered, each points to next
            let prevIndex = null;
            for (let i = 0; i < newBlocks.length && allocatedIndices.length < count; i++) {
                if (newBlocks[i] === null) {
                    newBlocks[i] = { fileId: filePath, fileName, allocType: 'linked', nextBlock: null };
                    if (prevIndex !== null) {
                        newBlocks[prevIndex].nextBlock = i;
                    }
                    prevIndex = i;
                    allocatedIndices.push(i);
                }
            }
            return { newBlocks, allocatedIndices, indexBlock, success: allocatedIndices.length >= count };

        } else if (method === 'indexed') {
            // Indexed allocation: first free block is index block, rest are data blocks
            const totalNeeded = count + 1; // +1 for index block
            const freeBlocks = [];

            for (let i = 0; i < newBlocks.length && freeBlocks.length < totalNeeded; i++) {
                if (newBlocks[i] === null) {
                    freeBlocks.push(i);
                }
            }

            if (freeBlocks.length < totalNeeded) {
                return { newBlocks: blocks, allocatedIndices: [], indexBlock: null, success: false, error: `Need ${totalNeeded} blocks (1 index + ${count} data)` };
            }

            indexBlock = freeBlocks[0];
            const dataBlocks = freeBlocks.slice(1, totalNeeded);

            // Allocate index block
            newBlocks[indexBlock] = { fileId: filePath, fileName, allocType: 'index', isIndexBlock: true, dataBlocks: dataBlocks };

            // Allocate data blocks
            dataBlocks.forEach(i => {
                newBlocks[i] = { fileId: filePath, fileName, allocType: 'indexed', indexBlock: indexBlock };
                allocatedIndices.push(i);
            });

            return { newBlocks, allocatedIndices, indexBlock, success: true };
        }

        return { newBlocks, allocatedIndices, indexBlock, success: false };
    }, [blocks, config.allocationMethod]);

    // Deallocate blocks
    const deallocateBlocks = useCallback((blockIndices) => {
        const newBlocks = [...blocks];
        blockIndices.forEach(i => {
            newBlocks[i] = null;
        });
        return newBlocks;
    }, [blocks]);

    // Create file
    const handleCreateFile = useCallback(() => {
        // Validate
        const nameErrors = validateName(newFileName, createType);
        const sizeErrors = createType === 'file' ? validateSize(newFileSize) : {};
        const allErrors = { ...nameErrors, ...sizeErrors };

        if (Object.keys(allErrors).length > 0) {
            setFormErrors(allErrors);
            showNotification(Object.values(allErrors)[0], 'error');
            return;
        }

        setFormErrors({});

        const fullPath = newFileParent === '/' ? `/${newFileName}` : `${newFileParent}/${newFileName}`;
        const size = createType === 'file' ? parseInt(newFileSize) : 0;
        const blocksNeeded = createType === 'file' ? Math.ceil(size / config.blockSize) : 0;

        // Allocate blocks
        const result = allocateBlocks(blocksNeeded, fullPath, newFileName);

        if (!result.success) {
            showNotification(result.error || 'Allocation failed!', 'error');
            return;
        }

        const { newBlocks, allocatedIndices, indexBlock } = result;

        // Animate block allocation
        if (allocatedIndices.length > 0) {
            setBlockAnimation('allocating');
            // Also animate index block if exists
            const allBlocks = indexBlock !== null ? [indexBlock, ...allocatedIndices] : allocatedIndices;
            allBlocks.forEach((idx, i) => {
                setTimeout(() => {
                    setAnimatingBlocks(prev => new Set(prev).add(idx));
                }, i * 50);
            });
            setTimeout(() => {
                setAnimatingBlocks(new Set());
                setBlockAnimation(null);
            }, allBlocks.length * 50 + 500);
        }

        // Create file entry
        const newFile = {
            name: newFileName,
            type: createType,
            size: size,
            blocks: allocatedIndices,
            indexBlock: indexBlock,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            parent: newFileParent,
            inode: nextInode,
            permissions: { read: true, write: true, execute: false },
            owner: currentUser
        };

        setBlocks(newBlocks);
        setFiles(prev => ({ ...prev, [fullPath]: newFile }));
        setNextInode(prev => prev + 1);

        // Reset form and close dialog
        setNewFileName('');
        setNewFileSize('4');
        setShowCreateDialog(false);

        const message = createType === 'file'
            ? `Created file "${newFileName}" (${size}KB) using ${allocatedIndices.length} blocks`
            : `Created directory "${newFileName}"`;

        showNotification(message, 'success');
        addLog(message, 'create');

    }, [newFileName, newFileSize, newFileParent, createType, config.blockSize, allocateBlocks, validateName, validateSize, nextInode, showNotification, addLog]);

    // Read file (highlight blocks)
    const handleReadFile = useCallback((filePath) => {
        const file = files[filePath];
        if (!file || file.type !== 'file') {
            showNotification('Cannot read: not a file', 'error');
            return;
        }

        // Check read permission
        if (file.permissions && !file.permissions.read) {
            showNotification('Permission denied: no read access', 'error');
            addLog(`Access denied: cannot read "${file.name}" (no read permission)`, 'delete');
            return;
        }

        setBlockAnimation('reading');
        file.blocks.forEach((idx, i) => {
            setTimeout(() => {
                setAnimatingBlocks(prev => new Set(prev).add(idx));
            }, i * 100);
        });

        setTimeout(() => {
            setAnimatingBlocks(new Set());
            setBlockAnimation(null);
        }, file.blocks.length * 100 + 1000);

        showNotification(`Reading "${file.name}" from blocks [${file.blocks.join(', ')}]`, 'info');
        addLog(`Read file "${file.name}" (${file.size}KB) from blocks [${file.blocks.join(', ')}]`, 'read');
    }, [files, showNotification, addLog]);

    // Write file (resize)
    const handleWriteFile = useCallback((filePath) => {
        const file = files[filePath];
        if (!file || file.type !== 'file') {
            showNotification('Cannot write: not a file', 'error');
            return;
        }

        const newSize = parseInt(writeSize);
        const sizeErrors = validateSize(writeSize);

        // Account for current file's blocks being freed
        if (sizeErrors.size && sizeErrors.size.includes('Not enough space')) {
            const currentBlocks = file.blocks.length;
            const blocksNeeded = Math.ceil(newSize / config.blockSize);
            const freeBlocks = blocks.filter(b => b === null).length + currentBlocks;
            if (blocksNeeded <= freeBlocks) {
                delete sizeErrors.size;
            }
        }

        if (Object.keys(sizeErrors).length > 0) {
            showNotification(sizeErrors.size, 'error');
            return;
        }

        const blocksNeeded = Math.ceil(newSize / config.blockSize);
        const oldBlocks = file.blocks;
        const oldSize = file.size;

        // Free old blocks
        let newBlocksState = deallocateBlocks(oldBlocks);
        setBlocks(newBlocksState);

        // Allocate new blocks
        const { newBlocks, allocatedIndices } = allocateBlocks(blocksNeeded, filePath, file.name);

        // Animate
        setBlockAnimation('writing');
        allocatedIndices.forEach((idx, i) => {
            setTimeout(() => {
                setAnimatingBlocks(prev => new Set(prev).add(idx));
            }, i * 50);
        });
        setTimeout(() => {
            setAnimatingBlocks(new Set());
            setBlockAnimation(null);
        }, allocatedIndices.length * 50 + 500);

        // Update file
        setBlocks(newBlocks);
        setFiles(prev => ({
            ...prev,
            [filePath]: {
                ...prev[filePath],
                size: newSize,
                blocks: allocatedIndices,
                modifiedAt: Date.now()
            }
        }));

        setWriteSize('');
        showNotification(`Updated "${file.name}": ${oldSize}KB → ${newSize}KB`, 'success');
        addLog(`Wrote to file "${file.name}": ${oldSize}KB → ${newSize}KB (blocks: [${allocatedIndices.join(', ')}])`, 'write');
    }, [files, writeSize, blocks, config.blockSize, deallocateBlocks, allocateBlocks, validateSize, showNotification, addLog]);

    // Delete file/directory
    const handleDelete = useCallback((filePath) => {
        if (filePath === '/') {
            showNotification('Cannot delete root directory', 'error');
            return;
        }

        const file = files[filePath];
        if (!file) {
            showNotification('File not found', 'error');
            return;
        }

        // Check if directory is empty
        if (file.type === 'directory') {
            const hasChildren = Object.keys(files).some(path =>
                path !== filePath && files[path].parent === filePath
            );
            if (hasChildren) {
                showNotification('Cannot delete: directory is not empty', 'error');
                return;
            }
        }

        // Animate block deallocation
        if (file.blocks.length > 0) {
            setBlockAnimation('deallocating');
            file.blocks.forEach((idx, i) => {
                setTimeout(() => {
                    setAnimatingBlocks(prev => new Set(prev).add(idx));
                }, i * 50);
            });
            setTimeout(() => {
                setAnimatingBlocks(new Set());
                setBlockAnimation(null);
            }, file.blocks.length * 50 + 500);
        }

        // Free blocks
        const newBlocks = deallocateBlocks(file.blocks);
        setBlocks(newBlocks);

        // Remove file from files
        setFiles(prev => {
            const newFiles = { ...prev };
            delete newFiles[filePath];
            return newFiles;
        });

        setShowConfirmDelete(null);
        setSelectedFile(null);

        const message = file.type === 'file'
            ? `Deleted file "${file.name}", freed ${file.blocks.length} blocks`
            : `Deleted directory "${file.name}"`;

        showNotification(message, 'success');
        addLog(message, 'delete');
    }, [files, deallocateBlocks, showNotification, addLog]);

    // Reset file system
    const handleReset = useCallback(() => {
        setBlocks(Array(config.totalBlocks).fill(null));
        setFiles({
            '/': { name: '/', type: 'directory', size: 0, blocks: [], indexBlock: null, createdAt: 0, modifiedAt: 0, parent: null, inode: 0, permissions: { read: true, write: true, execute: true }, owner: 'root' }
        });
        setNextInode(1);
        setSelectedFile(null);
        setActivityLog([]);
        setJournal([]);
        setDefragProgress(0);
        showNotification('File system reset to initial state', 'info');
        addLog('File system reset', 'info');
    }, [config.totalBlocks, showNotification, addLog]);

    // Defragment disk - consolidate all files to beginning
    const handleDefragment = useCallback(async () => {
        if (isDefragmenting) return;

        setIsDefragmenting(true);
        setDefragProgress(0);
        addLog('Starting defragmentation...', 'info');

        // Get all files sorted by inode
        const fileEntries = Object.entries(files)
            .filter(([path, file]) => file.type === 'file' && file.blocks.length > 0)
            .sort((a, b) => a[1].inode - b[1].inode);

        if (fileEntries.length === 0) {
            setIsDefragmenting(false);
            showNotification('No files to defragment', 'info');
            return;
        }

        let newBlocks = Array(config.totalBlocks).fill(null);
        let newFiles = { ...files };
        let nextFreeBlock = 0;
        const totalFiles = fileEntries.length;

        for (let fileIndex = 0; fileIndex < fileEntries.length; fileIndex++) {
            const [path, file] = fileEntries[fileIndex];
            const newFileBlocks = [];

            // Allocate contiguous blocks for this file
            for (let i = 0; i < file.blocks.length; i++) {
                newBlocks[nextFreeBlock] = {
                    fileId: path,
                    fileName: file.name,
                    allocType: 'contiguous'
                };
                newFileBlocks.push(nextFreeBlock);
                nextFreeBlock++;
            }

            // Update file entry
            newFiles[path] = {
                ...file,
                blocks: newFileBlocks,
                indexBlock: null  // Remove index blocks after defrag
            };

            // Animate progress
            setDefragProgress(Math.round(((fileIndex + 1) / totalFiles) * 100));

            // Show blocks being consolidated
            setAnimatingBlocks(new Set(newFileBlocks));
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        setAnimatingBlocks(new Set());
        setBlocks(newBlocks);
        setFiles(newFiles);
        setIsDefragmenting(false);
        setDefragProgress(100);

        // Change allocation method to contiguous since disk is now defragged
        if (config.allocationMethod !== 'contiguous') {
            showNotification('Defragmentation complete! Files are now contiguous.', 'success');
        } else {
            showNotification('Defragmentation complete!', 'success');
        }
        addLog(`Defragmentation complete. ${fileEntries.length} files consolidated.`, 'info');
    }, [files, config.totalBlocks, config.allocationMethod, isDefragmenting, showNotification, addLog]);

    // Copy file
    const handleCopyFile = useCallback((sourcePath, destParent) => {
        const sourceFile = files[sourcePath];
        if (!sourceFile || sourceFile.type !== 'file') {
            showNotification('Cannot copy: source is not a file', 'error');
            return;
        }

        const newName = `${sourceFile.name}_copy`;
        const destPath = destParent === '/' ? `/${newName}` : `${destParent}/${newName}`;

        if (files[destPath]) {
            showNotification('File with this name already exists', 'error');
            return;
        }

        // Allocate new blocks for copy
        const result = allocateBlocks(sourceFile.blocks.length, destPath, newName);
        if (!result.success) {
            showNotification(result.error || 'Not enough space for copy', 'error');
            return;
        }

        const newFile = {
            ...sourceFile,
            name: newName,
            blocks: result.allocatedIndices,
            indexBlock: result.indexBlock,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            parent: destParent,
            inode: nextInode
        };

        setBlocks(result.newBlocks);
        setFiles(prev => ({ ...prev, [destPath]: newFile }));
        setNextInode(prev => prev + 1);

        showNotification(`Copied "${sourceFile.name}" to "${newName}"`, 'success');
        addLog(`Copied file "${sourceFile.name}" to "${newName}"`, 'create');
    }, [files, allocateBlocks, nextInode, showNotification, addLog]);

    // Rename file
    const handleRenameFile = useCallback((filePath, newName) => {
        const file = files[filePath];
        if (!file || filePath === '/') {
            showNotification('Cannot rename this item', 'error');
            return;
        }

        const newPath = file.parent === '/' ? `/${newName}` : `${file.parent}/${newName}`;

        if (files[newPath]) {
            showNotification('A file with this name already exists', 'error');
            return;
        }

        // Update blocks to reference new path
        const newBlocks = blocks.map(block =>
            block && block.fileId === filePath
                ? { ...block, fileId: newPath, fileName: newName }
                : block
        );

        // Update files
        const newFiles = { ...files };
        delete newFiles[filePath];
        newFiles[newPath] = { ...file, name: newName };

        // Update children if it's a directory
        if (file.type === 'directory') {
            Object.keys(newFiles).forEach(path => {
                if (newFiles[path].parent === filePath) {
                    newFiles[path] = { ...newFiles[path], parent: newPath };
                }
            });
        }

        setBlocks(newBlocks);
        setFiles(newFiles);
        setSelectedFile(newPath);

        showNotification(`Renamed to "${newName}"`, 'success');
        addLog(`Renamed "${file.name}" to "${newName}"`, 'write');
    }, [files, blocks, showNotification, addLog]);

    // Save file content
    const handleSaveContent = useCallback((filePath, content) => {
        const file = files[filePath];
        if (!file || file.type !== 'file') {
            showNotification('Cannot save: not a file', 'error');
            return;
        }

        // Calculate new size based on content (1 char = 1 byte for simplicity)
        const newSize = Math.max(1, Math.ceil(content.length / 1024)); // KB
        const blocksNeeded = Math.ceil(newSize / config.blockSize);
        const currentBlocks = file.blocks.length;

        // Save content
        setFileContents(prev => ({ ...prev, [filePath]: content }));

        // Resize if needed
        if (blocksNeeded !== currentBlocks) {
            // Free old blocks
            let newBlocksState = deallocateBlocks(file.blocks);

            // Allocate new blocks based on current blocksState
            const tempBlocks = [...newBlocksState];
            const allocatedIndices = [];
            let indexBlock = null;

            if (config.allocationMethod === 'indexed' && blocksNeeded > 0) {
                // Need index block + data blocks
                const totalNeeded = blocksNeeded + 1;
                const freeBlocks = [];
                for (let i = 0; i < tempBlocks.length && freeBlocks.length < totalNeeded; i++) {
                    if (tempBlocks[i] === null) freeBlocks.push(i);
                }
                if (freeBlocks.length >= totalNeeded) {
                    indexBlock = freeBlocks[0];
                    tempBlocks[indexBlock] = { fileId: filePath, fileName: file.name, allocType: 'index', isIndexBlock: true, dataBlocks: freeBlocks.slice(1, totalNeeded) };
                    freeBlocks.slice(1, totalNeeded).forEach(i => {
                        tempBlocks[i] = { fileId: filePath, fileName: file.name, allocType: 'indexed' };
                        allocatedIndices.push(i);
                    });
                }
            } else {
                for (let i = 0; i < tempBlocks.length && allocatedIndices.length < blocksNeeded; i++) {
                    if (tempBlocks[i] === null) {
                        tempBlocks[i] = { fileId: filePath, fileName: file.name, allocType: config.allocationMethod };
                        allocatedIndices.push(i);
                    }
                }
            }

            setBlocks(tempBlocks);
            setFiles(prev => ({
                ...prev,
                [filePath]: {
                    ...prev[filePath],
                    size: newSize,
                    blocks: allocatedIndices,
                    indexBlock: indexBlock,
                    modifiedAt: Date.now()
                }
            }));

            showNotification(`Saved content (${newSize}KB, ${allocatedIndices.length} blocks)`, 'success');
        } else {
            setFiles(prev => ({
                ...prev,
                [filePath]: {
                    ...prev[filePath],
                    modifiedAt: Date.now()
                }
            }));
            showNotification('Content saved', 'success');
        }

        addLog(`Edited content of "${file.name}"`, 'write');
        setShowContentEditor(false);
    }, [files, config.blockSize, config.allocationMethod, deallocateBlocks, showNotification, addLog]);

    // Toggle file permission
    const togglePermission = useCallback((filePath, permission) => {
        const file = files[filePath];
        if (!file) return;

        const currentPerms = file.permissions || { read: true, write: true, execute: false };
        const newPerms = { ...currentPerms, [permission]: !currentPerms[permission] };

        setFiles(prev => ({
            ...prev,
            [filePath]: {
                ...prev[filePath],
                permissions: newPerms
            }
        }));

        const permChar = permission === 'read' ? 'r' : permission === 'write' ? 'w' : 'x';
        const status = newPerms[permission] ? 'granted' : 'revoked';
        showNotification(`${permission} permission ${status} for "${file.name}"`, 'info');
        addLog(`Changed permissions on "${file.name}": ${permChar}${newPerms[permission] ? '+' : '-'}`, 'write');
    }, [files, showNotification, addLog]);

    // Get permission string (rwx format)
    const getPermissionString = useCallback((file) => {
        if (!file || !file.permissions) return 'rwx';
        const p = file.permissions;
        return `${p.read ? 'r' : '-'}${p.write ? 'w' : '-'}${p.execute ? 'x' : '-'}`;
    }, []);

    // Demo scenarios
    const demoScenarios = [
        {
            name: 'Sample Files',
            desc: 'Basic file structure',
            action: () => {
                handleReset();
                setTimeout(() => {
                    // Create some sample files and directories
                    const sampleFiles = [
                        { path: '/documents', type: 'directory' },
                        { path: '/documents/readme.txt', type: 'file', size: 8 },
                        { path: '/documents/notes.md', type: 'file', size: 12 },
                        { path: '/images', type: 'directory' },
                        { path: '/images/photo.jpg', type: 'file', size: 24 },
                        { path: '/system.log', type: 'file', size: 16 },
                    ];

                    let newBlocks = Array(config.totalBlocks).fill(null);
                    let newFiles = { ...files };
                    let inode = nextInode;

                    sampleFiles.forEach(item => {
                        const blocksNeeded = item.type === 'file' ? Math.ceil(item.size / config.blockSize) : 0;
                        const allocatedIndices = [];

                        for (let i = 0; i < newBlocks.length && allocatedIndices.length < blocksNeeded; i++) {
                            if (newBlocks[i] === null) {
                                const name = item.path.split('/').pop();
                                newBlocks[i] = { fileId: item.path, fileName: name };
                                allocatedIndices.push(i);
                            }
                        }

                        const parts = item.path.split('/');
                        const name = parts.pop();
                        const parent = parts.join('/') || '/';

                        newFiles[item.path] = {
                            name,
                            type: item.type,
                            size: item.size || 0,
                            blocks: allocatedIndices,
                            createdAt: Date.now(),
                            modifiedAt: Date.now(),
                            parent,
                            inode: inode++
                        };
                    });

                    setBlocks(newBlocks);
                    setFiles(newFiles);
                    setNextInode(inode);
                    addLog('Loaded sample files demo', 'info');
                }, 100);
            }
        },
        {
            name: 'Fragmented',
            desc: 'Show disk fragmentation',
            action: () => {
                handleReset();
                setTimeout(() => {
                    let newBlocks = Array(config.totalBlocks).fill(null);
                    let newFiles = { '/': files['/'] };
                    let inode = 1;

                    // Create fragmented pattern
                    const fragmentedFiles = [
                        { name: 'file1.dat', blocks: [0, 2, 4, 6, 8], size: 20 },
                        { name: 'file2.dat', blocks: [10, 12, 14, 16], size: 16 },
                        { name: 'file3.dat', blocks: [20, 22, 24], size: 12 },
                        { name: 'file4.dat', blocks: [1, 3, 5, 7, 9, 11], size: 24 },
                        { name: 'file5.dat', blocks: [30, 35, 40, 45, 50], size: 20 },
                    ];

                    fragmentedFiles.forEach(file => {
                        const path = `/${file.name}`;
                        file.blocks.forEach(idx => {
                            newBlocks[idx] = { fileId: path, fileName: file.name };
                        });
                        newFiles[path] = {
                            name: file.name,
                            type: 'file',
                            size: file.size,
                            blocks: file.blocks,
                            createdAt: Date.now(),
                            modifiedAt: Date.now(),
                            parent: '/',
                            inode: inode++
                        };
                    });

                    setBlocks(newBlocks);
                    setFiles(newFiles);
                    setNextInode(inode);
                    addLog('Loaded fragmented disk demo', 'info');
                }, 100);
            }
        },
        {
            name: 'Near Full',
            desc: '90% disk usage',
            action: () => {
                handleReset();
                setTimeout(() => {
                    let newBlocks = Array(config.totalBlocks).fill(null);
                    let newFiles = { '/': files['/'] };
                    let inode = 1;
                    let blockIdx = 0;

                    // Fill 90% of disk
                    for (let i = 0; i < 10; i++) {
                        const name = `bigfile${i}.bin`;
                        const path = `/${name}`;
                        const blocksForFile = [];

                        for (let j = 0; j < 9 && blockIdx < 90; j++) {
                            newBlocks[blockIdx] = { fileId: path, fileName: name };
                            blocksForFile.push(blockIdx);
                            blockIdx++;
                        }

                        newFiles[path] = {
                            name,
                            type: 'file',
                            size: blocksForFile.length * config.blockSize,
                            blocks: blocksForFile,
                            createdAt: Date.now(),
                            modifiedAt: Date.now(),
                            parent: '/',
                            inode: inode++
                        };
                    }

                    setBlocks(newBlocks);
                    setFiles(newFiles);
                    setNextInode(inode);
                    addLog('Loaded near-full disk demo (90% used)', 'info');
                }, 100);
            }
        }
    ];

    // Export state
    const handleExport = useCallback(() => {
        const state = {
            config,
            blocks,
            files,
            nextInode,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'filesystem-state.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('File system state exported', 'success');
        addLog('Exported file system state', 'info');
    }, [config, blocks, files, nextInode, showNotification, addLog]);

    // Import state
    const handleImport = useCallback((event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const state = JSON.parse(e.target.result);
                if (state.blocks && state.files) {
                    setBlocks(state.blocks);
                    setFiles(state.files);
                    setNextInode(state.nextInode || 1);
                    if (state.config) setConfig(state.config);
                    showNotification('File system state imported', 'success');
                    addLog('Imported file system state', 'info');
                } else {
                    showNotification('Invalid file format', 'error');
                }
            } catch (err) {
                showNotification('Failed to parse file', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }, [showNotification, addLog]);

    // Get directories for parent selection
    const getDirectories = useCallback(() => {
        return Object.keys(files).filter(path => files[path].type === 'directory').sort();
    }, [files]);

    // Get tree structure
    const getTreeItems = useCallback(() => {
        const items = [];
        const sortedPaths = Object.keys(files).sort();

        const searchLower = searchTerm.toLowerCase();
        const filteredPaths = searchTerm
            ? sortedPaths.filter(path => path.toLowerCase().includes(searchLower))
            : sortedPaths;

        filteredPaths.forEach(path => {
            if (path === '/') return; // Skip root
            const file = files[path];
            const depth = path.split('/').length - 1;
            items.push({
                path,
                ...file,
                depth
            });
        });

        return items;
    }, [files, searchTerm]);

    // Statistics
    const stats = {
        totalBlocks: config.totalBlocks,
        usedBlocks: blocks.filter(b => b !== null).length,
        freeBlocks: blocks.filter(b => b === null).length,
        totalSize: config.totalBlocks * config.blockSize,
        usedSize: blocks.filter(b => b !== null).length * config.blockSize,
        freeSize: blocks.filter(b => b === null).length * config.blockSize,
        fileCount: Object.values(files).filter(f => f.type === 'file').length,
        directoryCount: Object.values(files).filter(f => f.type === 'directory').length - 1, // Exclude root
        fragmentationLevel: calculateFragmentation()
    };

    // Calculate fragmentation
    function calculateFragmentation() {
        let fragments = 0;
        let currentFile = null;

        blocks.forEach((block, i) => {
            if (block && block.fileId !== currentFile) {
                if (currentFile !== null) fragments++;
                currentFile = block.fileId;
            } else if (!block && currentFile !== null) {
                currentFile = null;
            }
        });

        const fileCount = Object.values(files).filter(f => f.type === 'file').length;
        if (fileCount === 0) return 0;

        return Math.min(100, Math.round((fragments / fileCount) * 20));
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'h':
                    e.preventDefault();
                    setShowHelp(prev => !prev);
                    break;
                case 'n':
                    if (!showCreateDialog) {
                        e.preventDefault();
                        setCreateType('file');
                        setShowCreateDialog(true);
                    }
                    break;
                case 'd':
                    if (!showCreateDialog) {
                        e.preventDefault();
                        setCreateType('directory');
                        setShowCreateDialog(true);
                    }
                    break;
                case 'escape':
                    setShowHelp(false);
                    setShowCreateDialog(false);
                    setShowConfirmDelete(null);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showCreateDialog]);

    return (
        <div className="file-system">
            {/* Back Button */}
            <button className="fs-back-btn" onClick={() => navigate('/')}>
                ← Back to Memory Management
            </button>

            {/* Header */}
            <header className="fs-header">
                <div className="fs-header-content">
                    <h1 className="fs-title">
                        <span className="fs-icon">💾</span>
                        File System Simulator
                        <span className="fs-cursor">_</span>
                    </h1>
                    <p className="fs-subtitle">Block-Level File Operations & Visualization</p>
                </div>
                <button className="fs-help-btn" onClick={() => setShowHelp(true)}>
                    ❓ Help
                </button>
            </header>

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        className={`fs-notification ${notification.type}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <span>
                            {notification.type === 'success' && '✅ '}
                            {notification.type === 'error' && '❌ '}
                            {notification.type === 'warning' && '⚠️ '}
                            {notification.type === 'info' && 'ℹ️ '}
                            {notification.message}
                        </span>
                        <button onClick={() => setNotification(null)}>×</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Layout */}
            <div className="fs-layout">
                {/* Left Panel - Controls */}
                <div className="fs-controls">
                    {/* Create File/Directory */}
                    <div className="fs-card">
                        <h3>📁 File Operations</h3>
                        <div className="fs-btn-group">
                            <button
                                className="fs-btn fs-btn-primary"
                                onClick={() => { setCreateType('file'); setShowCreateDialog(true); }}
                            >
                                ➕ New File
                            </button>
                            <button
                                className="fs-btn fs-btn-secondary"
                                onClick={() => { setCreateType('directory'); setShowCreateDialog(true); }}
                            >
                                📂 New Folder
                            </button>
                        </div>

                        {/* Selected File Actions */}
                        {selectedFile && files[selectedFile] && files[selectedFile].type === 'file' && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--fs-border)' }}>
                                <h4>Selected: {files[selectedFile].name}</h4>
                                <div className="fs-btn-group" style={{ marginTop: '0.5rem' }}>
                                    <button
                                        className="fs-btn fs-btn-outline"
                                        onClick={() => handleReadFile(selectedFile)}
                                    >
                                        📖 Read
                                    </button>
                                    <button
                                        className="fs-btn fs-btn-danger"
                                        onClick={() => setShowConfirmDelete(selectedFile)}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>

                                <div className="fs-form-group" style={{ marginTop: '0.75rem' }}>
                                    <label>Write/Resize (KB)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            className="fs-input"
                                            value={writeSize}
                                            onChange={(e) => setWriteSize(e.target.value)}
                                            placeholder={files[selectedFile].size.toString()}
                                        />
                                        <button
                                            className="fs-btn fs-btn-secondary"
                                            onClick={() => handleWriteFile(selectedFile)}
                                            disabled={!writeSize}
                                        >
                                            ✏️
                                        </button>
                                    </div>
                                </div>

                                {/* Copy and Rename buttons */}
                                <div className="fs-btn-group" style={{ marginTop: '0.75rem' }}>
                                    <button
                                        className="fs-btn fs-btn-outline"
                                        onClick={() => handleCopyFile(selectedFile, files[selectedFile].parent)}
                                        title="Create a copy"
                                    >
                                        📋 Copy
                                    </button>
                                    <button
                                        className="fs-btn fs-btn-outline"
                                        onClick={() => {
                                            const newName = prompt('Enter new name:', files[selectedFile].name);
                                            if (newName && newName !== files[selectedFile].name) {
                                                handleRenameFile(selectedFile, newName);
                                            }
                                        }}
                                        title="Rename file"
                                    >
                                        ✏️ Rename
                                    </button>
                                    <button
                                        className="fs-btn fs-btn-outline"
                                        onClick={() => {
                                            setEditingContent(fileContents[selectedFile] || '');
                                            setShowContentEditor(true);
                                        }}
                                        title="Edit file content"
                                    >
                                        📝 Edit
                                    </button>
                                </div>

                                {/* Permissions */}
                                <div className="fs-permissions-section" style={{ marginTop: '0.75rem' }}>
                                    <label>Permissions</label>
                                    <div className="fs-permissions-row">
                                        <button
                                            className={`fs-perm-btn ${files[selectedFile].permissions?.read ? 'active' : ''}`}
                                            onClick={() => togglePermission(selectedFile, 'read')}
                                            title="Read permission"
                                        >
                                            R
                                        </button>
                                        <button
                                            className={`fs-perm-btn ${files[selectedFile].permissions?.write ? 'active' : ''}`}
                                            onClick={() => togglePermission(selectedFile, 'write')}
                                            title="Write permission"
                                        >
                                            W
                                        </button>
                                        <button
                                            className={`fs-perm-btn ${files[selectedFile].permissions?.execute ? 'active' : ''}`}
                                            onClick={() => togglePermission(selectedFile, 'execute')}
                                            title="Execute permission"
                                        >
                                            X
                                        </button>
                                        <span className="fs-perm-string">
                                            {getPermissionString(files[selectedFile])}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedFile && files[selectedFile] && files[selectedFile].type === 'directory' && selectedFile !== '/' && (
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--fs-border)' }}>
                                <h4>Selected: {files[selectedFile].name}/</h4>
                                <button
                                    className="fs-btn fs-btn-danger fs-btn-full"
                                    onClick={() => setShowConfirmDelete(selectedFile)}
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    🗑️ Delete Directory
                                </button>
                            </div>
                        )}

                        {/* Allocation Settings */}
                        <div className="fs-settings-section">
                            <h4>⚙️ Allocation Method</h4>
                            <select
                                className="fs-select"
                                value={config.allocationMethod}
                                onChange={(e) => setConfig(prev => ({ ...prev, allocationMethod: e.target.value }))}
                            >
                                <option value="contiguous">Contiguous (Adjacent blocks)</option>
                                <option value="linked">Linked (Scattered + pointers)</option>
                                <option value="indexed">Indexed (Index block)</option>
                            </select>
                            <div className="fs-input-hint">
                                {config.allocationMethod === 'contiguous' && 'Files need consecutive free blocks'}
                                {config.allocationMethod === 'linked' && 'Blocks can be scattered, each points to next'}
                                {config.allocationMethod === 'indexed' && 'Uses one block as index for data blocks'}
                            </div>
                        </div>

                        {/* Defragmentation */}
                        <div className="fs-defrag-section">
                            <h4>🔧 Disk Maintenance</h4>
                            <button
                                className="fs-btn fs-btn-defrag fs-btn-full"
                                onClick={handleDefragment}
                                disabled={isDefragmenting || stats.usedBlocks === 0}
                            >
                                {isDefragmenting ? `Defragmenting... ${defragProgress}%` : '🔄 Defragment Disk'}
                            </button>
                            {isDefragmenting && (
                                <div className="fs-defrag-progress">
                                    <div
                                        className="fs-defrag-bar"
                                        style={{ width: `${defragProgress}%` }}
                                    />
                                </div>
                            )}
                            <div className="fs-input-hint">
                                Current fragmentation: {stats.fragmentationLevel}%
                            </div>
                        </div>

                        {/* Journaling */}
                        <div className="fs-journaling-section">
                            <h4>📓 Journaling</h4>
                            <div className="fs-toggle-row">
                                <label className="fs-toggle">
                                    <input
                                        type="checkbox"
                                        checked={config.journalingEnabled}
                                        onChange={(e) => {
                                            setConfig(prev => ({ ...prev, journalingEnabled: e.target.checked }));
                                            addLog(`Journaling ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                                        }}
                                    />
                                    <span className="fs-toggle-slider"></span>
                                </label>
                                <span>Enable Journaling</span>
                            </div>
                            <div className="fs-input-hint">
                                {config.journalingEnabled
                                    ? 'Operations are logged before commit (crash-safe)'
                                    : 'No journal - data may be lost on power failure'}
                            </div>
                            {journal.length > 0 && (
                                <div className="fs-journal-preview">
                                    <div className="fs-journal-count">
                                        📋 {journal.length} pending operation(s)
                                    </div>
                                </div>
                            )}
                            <button
                                className="fs-btn fs-btn-danger fs-btn-full"
                                onClick={() => {
                                    // Simulate power failure
                                    if (!config.journalingEnabled && stats.usedBlocks > 0) {
                                        // Without journaling - randomly corrupt some blocks
                                        const usedBlockIndices = blocks
                                            .map((b, i) => b ? i : null)
                                            .filter(i => i !== null);
                                        const corruptCount = Math.min(3, Math.ceil(usedBlockIndices.length * 0.1));
                                        const corruptedBlocks = usedBlockIndices
                                            .sort(() => Math.random() - 0.5)
                                            .slice(0, corruptCount);

                                        const newBlocks = [...blocks];
                                        corruptedBlocks.forEach(i => {
                                            newBlocks[i] = null;
                                        });
                                        setBlocks(newBlocks);

                                        showNotification(`⚡ Power failure! ${corruptCount} blocks corrupted (no journal)`, 'error');
                                        addLog(`Power failure simulation: ${corruptCount} blocks lost`, 'delete');
                                    } else if (config.journalingEnabled) {
                                        showNotification('⚡ Power failure! Journal preserved - no data loss', 'success');
                                        addLog('Power failure simulation: journal recovered, no data loss', 'info');
                                    } else {
                                        showNotification('No files to corrupt', 'info');
                                    }
                                }}
                                style={{ marginTop: '0.5rem' }}
                                disabled={stats.usedBlocks === 0}
                            >
                                ⚡ Simulate Power Failure
                            </button>
                        </div>

                        {/* User Quota */}
                        <div className="fs-quota-section">
                            <h4>👤 User Quota</h4>
                            <select
                                className="fs-select"
                                value={currentUser}
                                onChange={(e) => {
                                    setCurrentUser(e.target.value);
                                    addLog(`Switched to user: ${users.find(u => u.id === e.target.value)?.name}`, 'info');
                                }}
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.quota}KB quota)
                                    </option>
                                ))}
                            </select>
                            {(() => {
                                const user = users.find(u => u.id === currentUser);
                                const userFiles = Object.values(files).filter(f => f.owner === currentUser && f.type === 'file');
                                const usedKB = userFiles.reduce((sum, f) => sum + f.size, 0);
                                const quota = user?.quota || 100;
                                const percent = Math.min(100, Math.round((usedKB / quota) * 100));
                                return (
                                    <div className="fs-quota-info">
                                        <div className="fs-quota-bar">
                                            <div
                                                className={`fs-quota-fill ${percent > 90 ? 'danger' : percent > 70 ? 'warning' : ''}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="fs-quota-text">
                                            <span style={{ color: user?.color }}>{usedKB}KB</span>
                                            <span>/ {quota}KB ({percent}%)</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Demo Scenarios */}
                        <div className="fs-scenarios">
                            <h4>🎮 Demo Scenarios</h4>
                            <div className="fs-scenario-list">
                                {demoScenarios.map((scenario, i) => (
                                    <button
                                        key={i}
                                        className="fs-scenario-btn"
                                        onClick={scenario.action}
                                        title={scenario.desc}
                                    >
                                        {scenario.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Export/Import */}
                        <div className="fs-io-btns">
                            <button className="fs-btn fs-btn-export" onClick={handleExport}>
                                📤 Export
                            </button>
                            <label className="fs-btn fs-btn-import">
                                📥 Import
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        </div>

                        {/* Reset Button */}
                        <button
                            className="fs-btn fs-btn-outline fs-btn-full"
                            onClick={handleReset}
                            style={{ marginTop: '0.75rem' }}
                        >
                            🔄 Reset File System
                        </button>
                    </div>

                    {/* Directory Tree */}
                    <div className="fs-card fs-tree-card">
                        <h3>🌲 Directory Tree</h3>

                        <div className="fs-tree-search">
                            <span className="fs-tree-search-icon">🔍</span>
                            <input
                                type="text"
                                className="fs-input"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                        </div>

                        <div className="fs-tree">
                            {/* Root */}
                            <div
                                className={`fs-tree-item directory ${selectedFile === '/' ? 'selected' : ''}`}
                                onClick={() => setSelectedFile('/')}
                            >
                                <span className="fs-tree-icon">📁</span>
                                <span className="fs-tree-name">/</span>
                            </div>

                            {/* Tree Items */}
                            {getTreeItems().length === 0 && (
                                <div className="fs-tree-empty">
                                    {searchTerm ? 'No matching files' : 'No files yet. Create one!'}
                                </div>
                            )}

                            {getTreeItems().map(item => (
                                <div
                                    key={item.path}
                                    className={`fs-tree-item ${item.type} ${selectedFile === item.path ? 'selected' : ''}`}
                                    onClick={() => setSelectedFile(item.path)}
                                    style={{ paddingLeft: `${item.depth * 1 + 0.75}rem` }}
                                >
                                    <span className="fs-tree-icon">
                                        {item.type === 'directory' ? '📂' : '📄'}
                                    </span>
                                    <span className="fs-tree-name">{item.name}</span>
                                    {item.type === 'file' && (
                                        <span className="fs-tree-size">{item.size}KB</span>
                                    )}
                                    <div className="fs-tree-actions">
                                        {item.type === 'file' && (
                                            <button
                                                className="fs-tree-action-btn"
                                                onClick={(e) => { e.stopPropagation(); handleReadFile(item.path); }}
                                                title="Read"
                                            >
                                                📖
                                            </button>
                                        )}
                                        <button
                                            className="fs-tree-action-btn delete"
                                            onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(item.path); }}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Main View */}
                <div className="fs-main">
                    {/* Statistics */}
                    <div className="fs-stats-grid">
                        <div className="fs-stat-card total">
                            <div className="fs-stat-icon">💿</div>
                            <div className="fs-stat-value">{stats.totalSize}</div>
                            <div className="fs-stat-label">Total KB</div>
                        </div>
                        <div className="fs-stat-card used">
                            <div className="fs-stat-icon">📊</div>
                            <div className="fs-stat-value">{stats.usedSize}</div>
                            <div className="fs-stat-label">Used KB</div>
                        </div>
                        <div className="fs-stat-card free">
                            <div className="fs-stat-icon">💚</div>
                            <div className="fs-stat-value">{stats.freeSize}</div>
                            <div className="fs-stat-label">Free KB</div>
                        </div>
                        <div className="fs-stat-card files">
                            <div className="fs-stat-icon">📄</div>
                            <div className="fs-stat-value">{stats.fileCount}</div>
                            <div className="fs-stat-label">Files</div>
                        </div>
                        <div className="fs-stat-card dirs">
                            <div className="fs-stat-icon">📂</div>
                            <div className="fs-stat-value">{stats.directoryCount}</div>
                            <div className="fs-stat-label">Directories</div>
                        </div>
                        <div className="fs-stat-card frag">
                            <div className="fs-stat-icon">🧩</div>
                            <div className="fs-stat-value">{stats.fragmentationLevel}%</div>
                            <div className="fs-stat-label">Fragmentation</div>
                        </div>
                    </div>

                    {/* Disk Usage Bar */}
                    <div className="fs-card">
                        <h3>📈 Disk Usage</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--fs-text-dim)' }}>
                            <span>{stats.usedBlocks} / {stats.totalBlocks} blocks used</span>
                            <span>{Math.round((stats.usedBlocks / stats.totalBlocks) * 100)}%</span>
                        </div>
                        <div className="fs-progress">
                            <div
                                className="fs-progress-bar"
                                style={{ width: `${(stats.usedBlocks / stats.totalBlocks) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Disk Block Visualization */}
                    <div className="fs-card fs-disk-card">
                        <div className="fs-disk-header">
                            <h3>💽 Disk Blocks</h3>
                            <div className="fs-disk-legend">
                                <div className="fs-legend-item">
                                    <div className="fs-legend-color free"></div>
                                    <span>Free</span>
                                </div>
                                <div className="fs-legend-item">
                                    <div className="fs-legend-color" style={{ background: 'var(--fs-primary)' }}></div>
                                    <span>Allocated</span>
                                </div>
                            </div>
                        </div>

                        <div className="fs-disk-grid">
                            {blocks.map((block, index) => {
                                const isAnimating = animatingBlocks.has(index);
                                const animationClass = isAnimating ? blockAnimation : '';
                                const fileColor = block ? getFileColor(block.fileId) : null;

                                return (
                                    <div
                                        key={index}
                                        className={`fs-block ${block ? 'occupied' : ''} ${animationClass}`}
                                        style={block ? {
                                            backgroundColor: fileColor,
                                            borderColor: fileColor,
                                            boxShadow: isAnimating ? `0 0 15px ${fileColor}` : 'none'
                                        } : {}}
                                        data-tooltip={block ? `Block ${index}: ${block.fileName}` : `Block ${index}: Free`}
                                        onClick={() => {
                                            if (block) {
                                                setSelectedFile(block.fileId);
                                            }
                                        }}
                                    >
                                        {index}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Inode Table */}
                    <div className="fs-card fs-inode-card">
                        <h3>📋 Inode Table</h3>
                        <div className="fs-inode-wrapper">
                            <table className="fs-inode-table">
                                <thead>
                                    <tr>
                                        <th>Inode</th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Blocks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(files)
                                        .filter(([path]) => path !== '/')
                                        .sort((a, b) => a[1].inode - b[1].inode)
                                        .map(([path, file]) => (
                                            <tr
                                                key={path}
                                                onClick={() => setSelectedFile(path)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td style={{ color: getFileColor(path), fontWeight: 700 }}>
                                                    {file.inode}
                                                </td>
                                                <td>{file.name}</td>
                                                <td>{file.type === 'file' ? '📄 File' : '📂 Dir'}</td>
                                                <td>{file.size}KB</td>
                                                <td>
                                                    {file.blocks.length > 0 ? (
                                                        <div className="fs-inode-blocks">
                                                            {file.blocks.slice(0, 8).map(b => (
                                                                <span
                                                                    key={b}
                                                                    className="fs-inode-block"
                                                                    style={{ backgroundColor: getFileColor(path) }}
                                                                >
                                                                    {b}
                                                                </span>
                                                            ))}
                                                            {file.blocks.length > 8 && (
                                                                <span className="fs-inode-block" style={{ background: 'var(--fs-text-muted)' }}>
                                                                    +{file.blocks.length - 8}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    {Object.keys(files).length <= 1 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--fs-text-dim)', padding: '2rem' }}>
                                                No files created yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Activity Log */}
                    <div className="fs-card fs-log-card" ref={logRef}>
                        <h3>📜 Activity Log</h3>
                        <div className="fs-log">
                            {activityLog.length === 0 ? (
                                <div className="fs-log-empty">No activity yet</div>
                            ) : (
                                activityLog.map(entry => (
                                    <div key={entry.id} className={`fs-log-entry ${entry.type}`}>
                                        <span className="fs-log-time">[{entry.time}]</span>
                                        <span className="fs-log-message">{entry.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create File/Directory Dialog */}
            <AnimatePresence>
                {showCreateDialog && (
                    <motion.div
                        className="fs-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowCreateDialog(false)}
                    >
                        <motion.div
                            className="fs-file-dialog"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="fs-file-dialog-title">
                                {createType === 'file' ? '📄 Create New File' : '📂 Create New Directory'}
                            </h2>

                            <div className="fs-form-group">
                                <label>Parent Directory</label>
                                <select
                                    className="fs-select"
                                    value={newFileParent}
                                    onChange={(e) => setNewFileParent(e.target.value)}
                                >
                                    {getDirectories().map(dir => (
                                        <option key={dir} value={dir}>{dir}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="fs-form-group">
                                <label>{createType === 'file' ? 'File Name' : 'Directory Name'}</label>
                                <input
                                    type="text"
                                    className={`fs-input ${formErrors.name ? 'error' : ''}`}
                                    value={newFileName}
                                    onChange={(e) => {
                                        setNewFileName(e.target.value);
                                        setFormErrors({});
                                    }}
                                    placeholder={createType === 'file' ? 'example.txt' : 'my-folder'}
                                    autoFocus
                                />
                                {formErrors.name && (
                                    <div className="fs-input-hint" style={{ color: 'var(--fs-error)' }}>
                                        {formErrors.name}
                                    </div>
                                )}
                            </div>

                            {createType === 'file' && (
                                <div className="fs-form-group">
                                    <label>File Size (KB)</label>
                                    <input
                                        type="number"
                                        className={`fs-input ${formErrors.size ? 'error' : ''}`}
                                        value={newFileSize}
                                        onChange={(e) => {
                                            setNewFileSize(e.target.value);
                                            setFormErrors({});
                                        }}
                                        min="0"
                                        max="200"
                                    />
                                    {formErrors.size ? (
                                        <div className="fs-input-hint" style={{ color: 'var(--fs-error)' }}>
                                            {formErrors.size}
                                        </div>
                                    ) : (
                                        <div className="fs-input-hint">
                                            Requires {Math.ceil(parseInt(newFileSize || 0) / config.blockSize)} blocks
                                            ({stats.freeBlocks} available)
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="fs-btn-group" style={{ marginTop: '1.5rem' }}>
                                <button
                                    className="fs-btn fs-btn-outline"
                                    onClick={() => {
                                        setShowCreateDialog(false);
                                        setFormErrors({});
                                        setNewFileName('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="fs-btn fs-btn-primary"
                                    onClick={handleCreateFile}
                                >
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirm Delete Dialog */}
            <AnimatePresence>
                {showConfirmDelete && (
                    <motion.div
                        className="fs-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowConfirmDelete(null)}
                    >
                        <motion.div
                            className="fs-confirm-dialog"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="fs-confirm-icon">⚠️</div>
                            <div className="fs-confirm-message">
                                Are you sure you want to delete<br />
                                <span className="fs-confirm-path">{showConfirmDelete}</span>?
                            </div>
                            <div className="fs-confirm-buttons">
                                <button
                                    className="fs-btn fs-btn-outline"
                                    onClick={() => setShowConfirmDelete(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="fs-btn fs-btn-danger"
                                    onClick={() => handleDelete(showConfirmDelete)}
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Help Modal */}
            <AnimatePresence>
                {showHelp && (
                    <motion.div
                        className="fs-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowHelp(false)}
                    >
                        <motion.div
                            className="fs-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="fs-modal-header">
                                <h2 className="fs-modal-title">📚 File System Help</h2>
                                <button className="fs-modal-close" onClick={() => setShowHelp(false)}>
                                    ×
                                </button>
                            </div>

                            <div className="fs-modal-section">
                                <h3>🎯 What is this?</h3>
                                <p>
                                    This simulator demonstrates how file systems manage disk storage at the block level.
                                    Each file occupies one or more blocks, and the file system tracks which blocks belong to which files.
                                </p>
                            </div>

                            <div className="fs-modal-section">
                                <h3>📁 File Operations</h3>
                                <ul>
                                    <li><strong>Create File:</strong> Allocates blocks based on file size (size ÷ block size)</li>
                                    <li><strong>Create Directory:</strong> Creates a folder (uses no blocks)</li>
                                    <li><strong>Read File:</strong> Shows which blocks are accessed (animated)</li>
                                    <li><strong>Write/Resize:</strong> Changes file size, reallocating blocks as needed</li>
                                    <li><strong>Copy:</strong> Creates a duplicate with new blocks allocated</li>
                                    <li><strong>Rename:</strong> Changes file name without moving blocks</li>
                                    <li><strong>Edit Content:</strong> Open text editor, size auto-calculated from content</li>
                                    <li><strong>Delete:</strong> Frees all blocks used by the file</li>
                                </ul>
                            </div>

                            <div className="fs-modal-section">
                                <h3>⚙️ Allocation Methods</h3>
                                <ul>
                                    <li><strong>Contiguous:</strong> Files need consecutive free blocks. Fast access but causes fragmentation.</li>
                                    <li><strong>Linked:</strong> Blocks can be scattered, each points to next. Flexible but slower sequential access.</li>
                                    <li><strong>Indexed:</strong> Uses one index block to store pointers. Best for random access.</li>
                                </ul>
                            </div>

                            <div className="fs-modal-section">
                                <h3>🔧 Disk Maintenance</h3>
                                <ul>
                                    <li><strong>Defragment:</strong> Consolidates files to remove gaps, reducing fragmentation</li>
                                    <li><strong>Fragmentation %:</strong> Measures how scattered file blocks are across the disk</li>
                                </ul>
                            </div>

                            <div className="fs-modal-section">
                                <h3>🔒 Permissions (rwx)</h3>
                                <ul>
                                    <li><strong>R (Read):</strong> Allow/deny reading the file content</li>
                                    <li><strong>W (Write):</strong> Allow/deny modifying the file</li>
                                    <li><strong>X (Execute):</strong> Allow/deny executing the file (simulated)</li>
                                </ul>
                            </div>

                            <div className="fs-modal-section">
                                <h3>📓 Journaling</h3>
                                <p>
                                    When enabled, operations are logged before commit. On power failure:
                                </p>
                                <ul>
                                    <li><strong>With Journal:</strong> Data preserved, no corruption</li>
                                    <li><strong>Without Journal:</strong> Blocks may be lost/corrupted</li>
                                </ul>
                            </div>

                            <div className="fs-modal-section">
                                <h3>👤 User Quotas</h3>
                                <p>
                                    Each user has a storage quota. Files are owned by the current user.
                                    The progress bar shows usage vs quota limit (warning at 70%, danger at 90%).
                                </p>
                            </div>

                            <div className="fs-modal-section">
                                <h3>💽 Disk Blocks</h3>
                                <p>
                                    The disk is divided into {config.totalBlocks} blocks of {config.blockSize}KB each.
                                    Colors indicate which file owns each block. Hover over blocks to see details.
                                </p>
                            </div>

                            <div className="fs-modal-section">
                                <h3>⌨️ Keyboard Shortcuts</h3>
                                <ul>
                                    <li><span className="fs-kbd">N</span> Create new file</li>
                                    <li><span className="fs-kbd">D</span> Create new directory</li>
                                    <li><span className="fs-kbd">H</span> Toggle this help</li>
                                    <li><span className="fs-kbd">Esc</span> Close dialogs</li>
                                </ul>
                            </div>

                            <div className="fs-modal-section">
                                <h3>🎮 Demo Scenarios</h3>
                                <ul>
                                    <li><strong>Sample Files:</strong> Creates a typical file structure</li>
                                    <li><strong>Fragmented:</strong> Shows how files can become scattered across the disk</li>
                                    <li><strong>Near Full:</strong> Demonstrates a nearly-full disk (90% used)</li>
                                </ul>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Editor Modal */}
            <AnimatePresence>
                {showContentEditor && selectedFile && files[selectedFile] && (
                    <motion.div
                        className="fs-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowContentEditor(false)}
                    >
                        <motion.div
                            className="fs-content-editor"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="fs-modal-header">
                                <h2 className="fs-modal-title">📝 Edit: {files[selectedFile].name}</h2>
                                <button className="fs-modal-close" onClick={() => setShowContentEditor(false)}>
                                    ×
                                </button>
                            </div>

                            <div className="fs-content-area">
                                <textarea
                                    className="fs-content-textarea"
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    placeholder="Enter file content here..."
                                    spellCheck={false}
                                />
                            </div>

                            <div className="fs-content-footer">
                                <div className="fs-content-stats">
                                    <span>{editingContent.length} characters</span>
                                    <span>≈ {Math.max(1, Math.ceil(editingContent.length / 1024))} KB</span>
                                    <span>{Math.ceil(Math.max(1, Math.ceil(editingContent.length / 1024)) / config.blockSize)} blocks</span>
                                </div>
                                <div className="fs-btn-group">
                                    <button
                                        className="fs-btn fs-btn-outline"
                                        onClick={() => setShowContentEditor(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="fs-btn fs-btn-primary"
                                        onClick={() => handleSaveContent(selectedFile, editingContent)}
                                    >
                                        💾 Save
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FileSystem;
