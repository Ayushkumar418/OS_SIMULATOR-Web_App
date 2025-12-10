import { useState, useEffect } from 'react';
import './ProcessInput.css';

const ProcessInput = ({ onAddProcess, existingPids = [] }) => {
    const [pid, setPid] = useState(1);
    const [arrivalTime, setArrivalTime] = useState(0);
    const [burstTime, setBurstTime] = useState('');
    const [priority, setPriority] = useState('0');
    const [isDuplicatePid, setIsDuplicatePid] = useState(false);
    const [arrivalWarning, setArrivalWarning] = useState(false);

    // Check if PID is already taken
    useEffect(() => {
        if (pid && existingPids.includes(parseInt(pid))) {
            setIsDuplicatePid(true);
        } else {
            setIsDuplicatePid(false);
        }
    }, [pid, existingPids]);

    // Check if arrival time is too far in future
    useEffect(() => {
        const arrival = parseInt(arrivalTime);
        if (arrivalTime && !isNaN(arrival) && arrival > 100) {
            setArrivalWarning(true);
        } else {
            setArrivalWarning(false);
        }
    }, [arrivalTime]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const process = {
            pid: parseInt(pid),
            arrival_time: parseInt(arrivalTime),
            burst_time: parseInt(burstTime),
            priority: parseInt(priority),
            memory_required: 0
        };

        onAddProcess(process);

        // Increment PID for next process (skip if already exists)
        let nextPid = pid + 1;
        while (existingPids.includes(nextPid)) {
            nextPid++;
        }
        setPid(nextPid);
    };

    const isPidTaken = existingPids.includes(parseInt(pid));

    return (
        <div className="card">
            <h3>Add Process</h3>
            <form onSubmit={handleSubmit} className="process-form">
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="pid">
                            Process ID
                            {existingPids.length > 0 && (
                                <span className="pid-helper">
                                    {isPidTaken ? ' ⚠️ Already taken' : ' ✓ Available'}
                                </span>
                            )}
                        </label>
                        <input
                            id="pid"
                            type="number"
                            value={pid}
                            onChange={(e) => setPid(parseInt(e.target.value))}
                            min="1"
                            required
                            className={isPidTaken ? 'input-warning' : ''}
                        />
                        {existingPids.length > 0 && (
                            <small className="helper-text">
                                In use: {existingPids.join(', ')}
                            </small>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="arrivalTime">Arrival Time</label>
                        <input
                            id="arrivalTime"
                            type="number"
                            value={arrivalTime}
                            onChange={(e) => setArrivalTime(parseInt(e.target.value))}
                            min="0"
                            required
                        />
                        {arrivalWarning && (
                            <small className="arrival-warning">
                                ⚠️ Arrival time is far in future ({arrivalTime}ms). Consider using smaller values (&lt;100ms) for better visualization.
                            </small>
                        )}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="burstTime">Burst Time</label>
                        <input
                            id="burstTime"
                            type="number"
                            value={burstTime}
                            onChange={(e) => setBurstTime(parseInt(e.target.value))}
                            min="1"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="priority">Priority</label>
                        <input
                            id="priority"
                            type="number"
                            value={priority}
                            onChange={(e) => setPriority(parseInt(e.target.value))}
                            min="0"
                            required
                        />
                    </div>
                </div>

                <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                    + Add Process
                </button>
            </form>
        </div>
    );
};

export default ProcessInput;
