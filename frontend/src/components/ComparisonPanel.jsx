import { motion } from 'framer-motion';
import './ComparisonPanel.css';

const ComparisonPanel = ({ comparisonResults, recommendation }) => {
    if (!comparisonResults || comparisonResults.length === 0) {
        return (
            <div className="comparison-panel">
                <div className="no-comparison-data">
                    <p>No comparison data available. Run a comparison to see results.</p>
                </div>
            </div>
        );
    }

    const getAlgorithmDisplayName = (algorithm, preemptive) => {
        const names = {
            fcfs: 'FCFS',
            sjf: preemptive ? 'SRTF' : 'SJF',
            priority: preemptive ? 'Priority (Preemptive)' : 'Priority (Non-Preemptive)',
            round_robin: 'Round Robin'
        };
        return names[algorithm] || algorithm.toUpperCase();
    };

    const isBest = (algorithm, preemptive, metric) => {
        if (!recommendation || !recommendation.bestWorst) return false;
        const best = recommendation.bestWorst[metric]?.best;
        return best && best.algorithm === algorithm && best.preemptive === preemptive;
    };

    const isWorst = (algorithm, preemptive, metric) => {
        if (!recommendation || !recommendation.bestWorst) return false;
        const worst = recommendation.bestWorst[metric]?.worst;
        return worst && worst.algorithm === algorithm && worst.preemptive === preemptive;
    };

    return (
        <motion.div
            className="comparison-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h2>Algorithm Comparison Results</h2>

            {/* Recommendation Section */}
            {recommendation && recommendation.overall && (
                <div className="recommendation-section">
                    <div className="recommendation-header">
                        <span className="trophy-icon">🏆</span>
                        <h3>Recommended: {recommendation.overall.displayName}</h3>
                    </div>
                    <div className="recommendation-stats">
                        <div className="stat-badge">
                            <span className="stat-label">Overall Score</span>
                            <span className="stat-value">{(100 - recommendation.overall.score).toFixed(1)}/100</span>
                        </div>
                        <div className="stat-badge">
                            <span className="stat-label">Avg Wait Time</span>
                            <span className="stat-value">{recommendation.overall.metrics.avgWaitingTime.toFixed(2)} ms</span>
                        </div>
                        <div className="stat-badge">
                            <span className="stat-label">Avg TAT</span>
                            <span className="stat-value">{recommendation.overall.metrics.avgTurnaroundTime.toFixed(2)} ms</span>
                        </div>
                    </div>
                    {recommendation.insights && recommendation.insights.length > 0 && (
                        <div className="insights-box">
                            <h4>💡 Insights:</h4>
                            <ul>
                                {recommendation.insights.map((insight, idx) => (
                                    <li key={idx}>{insight}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Comparison Table */}
            <div className="comparison-table-wrapper">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th>Algorithm</th>
                            <th>Avg Waiting Time (ms)</th>
                            <th>Avg Turnaround Time (ms)</th>
                            <th>Avg Response Time (ms)</th>
                            <th>CPU Utilization (%)</th>
                            <th>Throughput (p/ms)</th>
                            <th>Context Switches</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparisonResults.map((result, index) => (
                            <motion.tr
                                key={`${result.algorithm}-${result.preemptive}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <td className="algorithm-name">
                                    {getAlgorithmDisplayName(result.algorithm, result.preemptive)}
                                    {recommendation?.overall?.algorithm === result.algorithm &&
                                        recommendation?.overall?.preemptive === result.preemptive && (
                                            <span className="winner-badge">🏆</span>
                                        )}
                                </td>
                                <td className={
                                    isBest(result.algorithm, result.preemptive, 'avgWaitingTime') ? 'metric-best' :
                                        isWorst(result.algorithm, result.preemptive, 'avgWaitingTime') ? 'metric-worst' : ''
                                }>
                                    {parseFloat(result.metrics.average_waiting_time).toFixed(2)}
                                </td>
                                <td className={
                                    isBest(result.algorithm, result.preemptive, 'avgTurnaroundTime') ? 'metric-best' :
                                        isWorst(result.algorithm, result.preemptive, 'avgTurnaroundTime') ? 'metric-worst' : ''
                                }>
                                    {parseFloat(result.metrics.average_turnaround_time).toFixed(2)}
                                </td>
                                <td className={
                                    isBest(result.algorithm, result.preemptive, 'avgResponseTime') ? 'metric-best' :
                                        isWorst(result.algorithm, result.preemptive, 'avgResponseTime') ? 'metric-worst' : ''
                                }>
                                    {parseFloat(result.metrics.average_response_time).toFixed(2)}
                                </td>
                                <td className={
                                    isBest(result.algorithm, result.preemptive, 'cpuUtilization') ? 'metric-best' :
                                        isWorst(result.algorithm, result.preemptive, 'cpuUtilization') ? 'metric-worst' : ''
                                }>
                                    {parseFloat(result.metrics.cpu_utilization).toFixed(2)}
                                </td>
                                <td className={
                                    isBest(result.algorithm, result.preemptive, 'throughput') ? 'metric-best' :
                                        isWorst(result.algorithm, result.preemptive, 'throughput') ? 'metric-worst' : ''
                                }>
                                    {parseFloat(result.metrics.throughput).toFixed(4)}
                                </td>
                                <td>{result.metrics.context_switches}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Algorithm Ranking */}
            {recommendation && recommendation.ranking && (
                <div className="ranking-section">
                    <h3>Algorithm Ranking</h3>
                    <div className="ranking-list">
                        {recommendation.ranking.map((algo, index) => (
                            <div key={`rank-${index}`} className={`rank-item ${index === 0 ? 'rank-first' : ''}`}>
                                <span className="rank-number">#{index + 1}</span>
                                <span className="rank-name">{algo.displayName}</span>
                                <span className="rank-score">Score: {(100 - algo.score).toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ComparisonPanel;
