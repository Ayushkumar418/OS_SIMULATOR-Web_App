import './SimulationControls.css';

const SimulationControls = ({ onRun, onReset, loading, disabled }) => {
    return (
        <div className="simulation-controls">
            <button
                className="btn btn-primary btn-lg"
                onClick={onRun}
                disabled={disabled || loading}
                style={{ width: '100%' }}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Running...
                    </>
                ) : (
                    <>▶ Run Simulation</>
                )}
            </button>

            <button
                className="btn btn-secondary"
                onClick={onReset}
                disabled={loading}
                style={{ width: '100%' }}
            >
                🔄 Reset
            </button>
        </div>
    );
};

export default SimulationControls;
