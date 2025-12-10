import { motion } from 'framer-motion';
import './ProcessTimeline.css';

const ProcessTimeline = ({ ganttChart }) => {
    if (!ganttChart || ganttChart.length === 0) {
        return <div className="no-data">No timeline data available</div>;
    }

    // Dynamic color generation for unlimited processes
    const generateProcessColor = (pid) => {
        const predefinedColors = {
            1: 'hsl(210, 90%, 55%)',   // Blue
            2: 'hsl(145, 70%, 50%)',   // Green
            3: 'hsl(280, 80%, 60%)',   // Purple
            4: 'hsl(25, 90%, 60%)',    // Orange
            5: 'hsl(330, 80%, 65%)',   // Pink
            6: 'hsl(180, 75%, 50%)',   // Cyan
        };

        // Use predefined colors for first 6 processes
        if (predefinedColors[pid]) {
            return predefinedColors[pid];
        }

        // Generate unique colors for additional processes using HSL
        // Distribute hue evenly across color wheel (0-360 degrees)
        const hue = ((pid - 1) * 137.5) % 360; // Golden angle for better distribution
        const saturation = 70 + (pid % 3) * 10; // Vary saturation 70-90%
        const lightness = 50 + (pid % 2) * 10;  // Vary lightness 50-60%

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const maxTime = Math.max(...ganttChart.map(item => item.end));

    // Calculate dynamic width: minimum 800px or 40px per time unit (whichever is larger)
    const dynamicWidth = Math.max(800, maxTime * 40);
    const containerStyle = {
        width: `${dynamicWidth}px`
    };

    return (
        <div className="process-timeline">
            <div className="timeline-container" style={containerStyle}>
                {ganttChart.map((item, index) => {
                    const width = ((item.end - item.start) / maxTime) * 100;
                    const left = (item.start / maxTime) * 100;
                    const color = generateProcessColor(item.pid);

                    return (
                        <motion.div
                            key={index}
                            className="timeline-block"
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                background: color,
                            }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                        >
                            <div className="block-label">
                                <span className="block-pid">P{item.pid}</span>
                                <span className="block-time">{item.start}-{item.end}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="timeline-axis" style={containerStyle}>
                {Array.from({ length: maxTime + 1 }, (_, i) => (
                    <div key={i} className="axis-tick" style={{ flex: '0 0 auto' }}>
                        <span>{i}</span>
                    </div>
                ))}
            </div>

            <div className="timeline-legend">
                {Array.from(new Set(ganttChart.map(item => item.pid)))
                    .sort((a, b) => a - b)
                    .map((pid) => (
                        <div key={pid} className="legend-item">
                            <div className="legend-color" style={{ background: generateProcessColor(pid) }}></div>
                            <span>Process {pid}</span>
                        </div>
                    ))}
            </div>
        </div>
    );
};

export default ProcessTimeline;
