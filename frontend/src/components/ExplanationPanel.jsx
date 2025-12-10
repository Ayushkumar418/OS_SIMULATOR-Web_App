import { motion } from 'framer-motion';
import './ExplanationPanel.css';

const ExplanationPanel = ({ explanations }) => {
    if (!explanations || explanations.length === 0) {
        return null;
    }

    return (
        <div className="card">
            <h2>Step-by-Step Explanation</h2>
            <div className="explanation-list">
                {explanations.map((explanation, index) => (
                    <motion.div
                        key={index}
                        className="explanation-item"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                    >
                        <div className="explanation-number">{index + 1}</div>
                        <div className="explanation-text">{explanation}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ExplanationPanel;
