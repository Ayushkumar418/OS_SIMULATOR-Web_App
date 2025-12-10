/**
 * Algorithm Recommendation Engine
 * Analyzes simulation results and recommends the best algorithm
 */

export const recommendBestAlgorithm = (results) => {
    if (!results || results.length === 0) {
        return null;
    }

    // Extract metrics for each algorithm
    const algorithmScores = results.map(result => {
        const metrics = result.metrics;
        return {
            algorithm: result.algorithm,
            preemptive: result.preemptive,
            displayName: getAlgorithmDisplayName(result.algorithm, result.preemptive),
            metrics: {
                avgWaitingTime: parseFloat(metrics.average_waiting_time) || 0,
                avgTurnaroundTime: parseFloat(metrics.average_turnaround_time) || 0,
                avgResponseTime: parseFloat(metrics.average_response_time) || 0,
                cpuUtilization: parseFloat(metrics.cpu_utilization) || 0,
                throughput: parseFloat(metrics.throughput) || 0,
                contextSwitches: parseInt(metrics.context_switches) || 0
            }
        };
    });

    // Find best and worst for each metric
    const bestWorst = {
        avgWaitingTime: {
            best: findBest(algorithmScores, 'avgWaitingTime', 'min'),
            worst: findBest(algorithmScores, 'avgWaitingTime', 'max')
        },
        avgTurnaroundTime: {
            best: findBest(algorithmScores, 'avgTurnaroundTime', 'min'),
            worst: findBest(algorithmScores, 'avgTurnaroundTime', 'max')
        },
        avgResponseTime: {
            best: findBest(algorithmScores, 'avgResponseTime', 'min'),
            worst: findBest(algorithmScores, 'avgResponseTime', 'max')
        },
        cpuUtilization: {
            best: findBest(algorithmScores, 'cpuUtilization', 'max'),
            worst: findBest(algorithmScores, 'cpuUtilization', 'min')
        },
        throughput: {
            best: findBest(algorithmScores, 'throughput', 'max'),
            worst: findBest(algorithmScores, 'throughput', 'min')
        }
    };

    // Calculate weighted overall score
    // Lower is better (we normalize and invert CPU utilization and throughput)
    const weights = {
        avgWaitingTime: 0.35,      // 35% - Most important for user experience
        avgTurnaroundTime: 0.30,   // 30% - Overall completion time
        avgResponseTime: 0.20,     // 20% - Interactive responsiveness
        cpuUtilization: 0.10,      // 10% - Resource efficiency
        throughput: 0.05           // 5% - Process completion rate
    };

    const scoredAlgorithms = algorithmScores.map(algo => {
        // Normalize metrics to 0-100 scale
        const normalizedWT = normalize(algo.metrics.avgWaitingTime, bestWorst.avgWaitingTime, 'min');
        const normalizedTAT = normalize(algo.metrics.avgTurnaroundTime, bestWorst.avgTurnaroundTime, 'min');
        const normalizedRT = normalize(algo.metrics.avgResponseTime, bestWorst.avgResponseTime, 'min');
        const normalizedCPU = normalize(algo.metrics.cpuUtilization, bestWorst.cpuUtilization, 'max');
        const normalizedTP = normalize(algo.metrics.throughput, bestWorst.throughput, 'max');

        const totalScore =
            (normalizedWT * weights.avgWaitingTime) +
            (normalizedTAT * weights.avgTurnaroundTime) +
            (normalizedRT * weights.avgResponseTime) +
            (normalizedCPU * weights.cpuUtilization) +
            (normalizedTP * weights.throughput);

        return {
            ...algo,
            score: totalScore
        };
    });

    // Sort by score (higher is better - best algorithms have highest normalized scores)
    scoredAlgorithms.sort((a, b) => b.score - a.score);

    // Generate insights
    const insights = generateInsights(scoredAlgorithms, bestWorst);

    return {
        overall: scoredAlgorithms[0],
        ranking: scoredAlgorithms,
        bestByMetric: {
            waitingTime: bestWorst.avgWaitingTime.best,
            turnaroundTime: bestWorst.avgTurnaroundTime.best,
            responseTime: bestWorst.avgResponseTime.best,
            cpuUtilization: bestWorst.cpuUtilization.best,
            throughput: bestWorst.throughput.best
        },
        insights,
        bestWorst
    };
};

// Helper: Find best algorithm for a specific metric
const findBest = (algorithms, metric, mode) => {
    if (algorithms.length === 0) return null;

    const sorted = [...algorithms].sort((a, b) => {
        if (mode === 'min') {
            return a.metrics[metric] - b.metrics[metric];
        } else {
            return b.metrics[metric] - a.metrics[metric];
        }
    });

    return sorted[0];
};

// Helper: Normalize metric value to 0-100 scale
const normalize = (value, bestWorst, mode) => {
    // Get the actual best and worst values for this metric
    const bestValue = mode === 'min' ? bestWorst.best.metrics[Object.keys(bestWorst.best.metrics).find(key =>
        Math.abs(bestWorst.best.metrics[key] - Math.min(...Object.values(bestWorst.best.metrics))) < 0.001
    )] : bestWorst.best.metrics[Object.keys(bestWorst.best.metrics).find(key =>
        Math.abs(bestWorst.best.metrics[key] - Math.max(...Object.values(bestWorst.best.metrics))) < 0.001
    )];

    const worstValue = mode === 'min' ? bestWorst.worst.metrics[Object.keys(bestWorst.worst.metrics).find(key =>
        Math.abs(bestWorst.worst.metrics[key] - Math.max(...Object.values(bestWorst.worst.metrics))) < 0.001
    )] : bestWorst.worst.metrics[Object.keys(bestWorst.worst.metrics).find(key =>
        Math.abs(bestWorst.worst.metrics[key] - Math.min(...Object.values(bestWorst.worst.metrics))) < 0.001
    )];

    // Handle case where all values are the same
    if (Math.abs(bestValue - worstValue) < 0.001) return 0;

    // Normalize (for min metrics, lower is better = higher score)
    if (mode === 'min') {
        return ((worstValue - value) / (worstValue - bestValue)) * 100;
    } else {
        return ((value - worstValue) / (bestValue - worstValue)) * 100;
    }
};

// Helper: Get display name for algorithm
const getAlgorithmDisplayName = (algorithm, preemptive) => {
    const names = {
        fcfs: 'FCFS',
        sjf: preemptive ? 'SRTF' : 'SJF',
        priority: preemptive ? 'Priority (P)' : 'Priority (NP)',
        round_robin: 'Round Robin'
    };
    return names[algorithm] || algorithm.toUpperCase();
};

// Helper: Generate insights based on results
const generateInsights = (rankedAlgorithms, bestWorst) => {
    const insights = [];
    const best = rankedAlgorithms[0];

    // Overall winner insight
    insights.push(`${best.displayName} provides the best overall performance for this workload.`);

    // Specific metric insights
    if (bestWorst.avgWaitingTime.best.displayName === best.displayName) {
        insights.push(`Minimizes average waiting time (${bestWorst.avgWaitingTime.best.metrics.avgWaitingTime.toFixed(2)} ms).`);
    }

    if (bestWorst.avgResponseTime.best.displayName === best.displayName) {
        insights.push(`Provides fastest response time (${bestWorst.avgResponseTime.best.metrics.avgResponseTime.toFixed(2)} ms).`);
    }

    // Round Robin specific
    const rrResult = rankedAlgorithms.find(a => a.algorithm === 'round_robin');
    if (rrResult && rrResult.metrics.avgResponseTime < best.metrics.avgResponseTime * 1.2) {
        insights.push(`Round Robin offers fair CPU sharing with good response times.`);
    }

    // Context switches insight
    const highSwitches = rankedAlgorithms.filter(a => a.metrics.contextSwitches > 10);
    if (highSwitches.length > 0) {
        insights.push(`${highSwitches[0].displayName} has high context switching overhead (${highSwitches[0].metrics.contextSwitches} switches).`);
    }

    // SJF/SRTF insight
    const sjfResult = rankedAlgorithms.find(a => a.algorithm === 'sjf');
    if (sjfResult && sjfResult === best) {
        insights.push(`Optimal for minimizing average metrics with known burst times.`);
    }

    return insights;
};
