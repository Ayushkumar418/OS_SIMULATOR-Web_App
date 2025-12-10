/**
 * API Service for OS Simulator Backend
 */

import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// CPU Scheduler APIs
export const schedulerAPI = {
    runSimulation: (algorithm, processes, timeQuantum = 4, preemptive = false) =>
        api.post('/scheduler/run', { algorithm, processes, time_quantum: timeQuantum, preemptive }),

    compareAlgorithms: (processes) =>
        api.post('/scheduler/compare', processes),

    getAlgorithms: () =>
        api.get('/scheduler/algorithms'),
};

// Memory Management APIs
export const memoryAPI = {
    createPageTable: (pid, numPages, numFrames = 64, pageSize = 4) =>
        api.post('/memory/create-page-table', { pid, num_pages: numPages, num_frames: numFrames, page_size: pageSize }),

    allocatePage: (pid, pageNumber) =>
        api.post('/memory/allocate-page', { pid, page_number: pageNumber }),

    accessPage: (pid, pageNumber) =>
        api.post('/memory/access-page', { pid, page_number: pageNumber }),

    translateAddress: (pid, virtualAddress) =>
        api.post('/memory/translate-address', { pid, virtual_address: virtualAddress }),

    runPageReplacement: (algorithm, numFrames, referenceString) =>
        api.post('/memory/page-replacement', { algorithm, num_frames: numFrames, reference_string: referenceString }),

    getState: () =>
        api.get('/memory/state'),

    reset: () =>
        api.post('/memory/reset'),
};

// File System APIs
export const filesystemAPI = {
    createFile: (path, size = 0) =>
        api.post('/filesystem/create-file', { path, size }),

    createDirectory: (path) =>
        api.post('/filesystem/create-directory', { path }),

    readFile: (path) =>
        api.post('/filesystem/read-file', { path }),

    writeFile: (path, newSize) =>
        api.post('/filesystem/write-file', { path, new_size: newSize }),

    delete: (path) =>
        api.post('/filesystem/delete', { path }),

    list: (path = '/') =>
        api.get(`/filesystem/list/${path}`),

    getState: () =>
        api.get('/filesystem/state'),

    reset: () =>
        api.post('/filesystem/reset'),
};

// Scenario APIs
export const scenarioAPI = {
    list: () =>
        api.get('/scenarios/list'),

    load: (scenarioId) =>
        api.get(`/scenarios/load/${scenarioId}`),

    save: (scenarioData) =>
        api.post('/scenarios/save', scenarioData),
};

export default api;
