import './MetricsPanel.css';

const MetricsPanel = ({ metrics }) => {
    if (!metrics) return null;

    const metricItems = [
        {
            label: 'Average Waiting Time',
            value: metrics.average_waiting_time,
            unit: 'ms',
            color: 'var(--clr-accent-blue)'
        },
        {
            label: 'Average Turnaround Time',
            value: metrics.average_turnaround_time,
            unit: 'ms',
            color: 'var(--clr-accent-green)'
        },
        {
            label: 'Average Response Time',
            value: metrics.average_response_time,
            unit: 'ms',
            color: 'var(--clr-accent-purple)'
        },
        {
            label: 'CPU Utilization',
            value: metrics.cpu_utilization,
            unit: '%',
            color: 'var(--clr-accent-orange)'
        },
        {
            label: 'Throughput',
            value: metrics.throughput,
            unit: 'processes/ms',
            color: 'var(--clr-accent-cyan)'
        },
        {
            label: 'Context Switches',
            value: metrics.total_context_switches,
            unit: '',
            color: 'var(--clr-accent-pink)'
        }
    ];

    return (
        <div className="metrics-panel">
            <h2>Performance Metrics</h2>
            <div className="metrics-grid">
                {metricItems.map((metric, index) => (
                    <div key={index} className="metric-card" style={{ borderColor: metric.color }}>
                        <div className="metric-label">{metric.label}</div>
                        <div className="metric-value" style={{ color: metric.color }}>
                            {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
                            {metric.unit && <span className="metric-unit">{metric.unit}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MetricsPanel;
