/* Prediction Handler - Manages prediction form and results */

class PredictionHandler {
    constructor() {
        this.form = DOM.id('prediction-form');
        this.formData = {};
        this.predictionResult = null;
        this.init();
    }

    /**
     * Initialize prediction handler
     */
    init() {
        if (this.form) {
            DOM.on(this.form, 'submit', (e) => this.handleSubmit(e));
            this.setupSliders();
        }
    }

    /**
     * Setup slider value displays
     */
    setupSliders() {
        const sliders = {
            'age': { displayId: 'age-value', manualId: null },
            'trestbps': { displayId: 'trestbps-value', manualId: 'trestbps-manual' },
            'chol': { displayId: 'chol-value', manualId: 'chol-manual' },
            'thalach': { displayId: 'thalach-value', manualId: 'thalach-manual' },
            'oldpeak': { displayId: 'oldpeak-value', manualId: null }
        };

        Object.keys(sliders).forEach(sliderId => {
            const slider = DOM.id(sliderId);
            if (!slider) {
                return;
            }

            const config = sliders[sliderId];
            const valueDisplay = DOM.id(config.displayId);
            const manualInput = config.manualId ? DOM.id(config.manualId) : null;

            const renderValue = (value) => {
                if (valueDisplay) {
                    valueDisplay.textContent = value;
                }
                if (manualInput && manualInput.value !== String(value)) {
                    manualInput.value = value;
                }
            };

            slider.addEventListener('input', (e) => {
                renderValue(e.target.value);
            });
            renderValue(slider.value);

            if (manualInput) {
                const syncManualToSlider = () => {
                    let value = parseInt(manualInput.value, 10);
                    if (Number.isNaN(value)) {
                        return;
                    }

                    const min = Number(slider.min);
                    const max = Number(slider.max);
                    value = Math.max(min, Math.min(max, value));

                    slider.value = value;
                    manualInput.value = value;
                    renderValue(value);
                };

                manualInput.addEventListener('input', syncManualToSlider);
                manualInput.addEventListener('change', syncManualToSlider);
            }
        });
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();

        // Validate form
        if (!Form.validate(this.form)) {
            Alert.error('Please fill all required fields');
            return;
        }

        // Get form data
        this.formData = Form.getData(this.form);

        // Show processing page
        pageManager.show('processing');

        try {
            // Make prediction
            this.predictionResult = await apiService.predict(this.formData);

            // Update results page
            await Time.sleep(2000); // Additional delay for effect
            this.updateResults();

            // Show results page
            pageManager.show('results');
        } catch (error) {
            console.error('Prediction error:', error);
            Alert.error('Failed to make prediction. Please try again.');
            pageManager.show('input');
        }
    }

    /**
     * Update results page with prediction data
     */
    updateResults() {
        const result = this.predictionResult;

        // Update risk gauge
        DOM.id('risk-percentage').textContent = result.riskPercentage;

        // Update risk badge
        const riskBadge = DOM.id('risk-badge');
        if (result.riskPercentage > 60) {
            riskBadge.className = 'risk-label risk-high';
            riskBadge.textContent = 'High Risk';
        } else if (result.riskPercentage > 40) {
            riskBadge.className = 'risk-label risk-medium';
            riskBadge.textContent = 'Moderate Risk';
        } else {
            riskBadge.className = 'risk-label risk-low';
            riskBadge.textContent = 'Low Risk';
        }

        this.updateRoadmap(result.riskPercentage);

        // Update confidence score
        DOM.id('confidence-score').textContent = result.confidence;

        // Update probability chart
        if (window.probabilityChart) {
            window.probabilityChart.data.datasets[0].data = [
                result.probDisease,
                result.probNoDisease
            ];
            window.probabilityChart.update();
        }

        // Update feature importance
        const features = result.features;
        ['chol', 'age', 'bp', 'hr', 'st', 'other'].forEach(key => {
            const element = DOM.id('feature-' + key);
            if (element) {
                const value = features[key];
                element.textContent = value + '%';
                
                const barFill = element.closest('.feature-name')
                    .parentElement.querySelector('.bar-fill');
                if (barFill) {
                    const maxChartValue = 30;
                    const normalizedHeight = Math.max(0, Math.min(100, (Number(value) / maxChartValue) * 100));
                    barFill.style.height = normalizedHeight + '%';
                    barFill.textContent = '';
                }
            }
        });

        // Update comparison table
        DOM.id('comp-bp').textContent = this.formData.trestbps;
        DOM.id('comp-chol').textContent = this.formData.chol;
        DOM.id('comp-hr').textContent = this.formData.thalach;
        DOM.id('comp-age').textContent = this.formData.age;

        // Reset simulator
        DOM.id('sim-chol').value = this.formData.chol;
        DOM.id('sim-bp').value = this.formData.trestbps;
        DOM.id('sim-hr').value = this.formData.thalach;
        this.updateSimulator();
    }

    /**
     * Get roadmap content based on risk percentage
     */
    getRoadmapByRisk(riskPercentage) {
        const risk = Math.max(0, Math.min(100, Number(riskPercentage) || 0));

        if (risk <= 40) {
            return {
                label: 'Safe',
                rangeLabel: '0-40%',
                summary: 'Maintain healthy habits and preventive screening.',
                steps: [
                    {
                        title: '✅ Preventive Care (This Month)',
                        points: [
                            'Do a routine health check and keep your baseline reports.',
                            'Track blood pressure and resting heart rate twice a week.',
                            'Continue annual doctor follow-up even with low risk.'
                        ]
                    },
                    {
                        title: '🥗 Lifestyle Maintenance (Ongoing)',
                        points: [
                            'Follow a balanced diet rich in vegetables, fruits, and whole grains.',
                            'Exercise at least 150 minutes per week.',
                            'Sleep 7-8 hours and stay hydrated daily.'
                        ]
                    },
                    {
                        title: '📈 Monitoring Plan (Quarterly)',
                        points: [
                            'Recheck cholesterol and blood pressure every 3-6 months.',
                            'Maintain body weight in a healthy range.',
                            'Repeat prediction after major lifestyle or health changes.'
                        ]
                    }
                ]
            };
        }

        if (risk <= 60) {
            return {
                label: 'Caution',
                rangeLabel: '41-60%',
                summary: 'Take early action to reduce progression and control risk factors.',
                steps: [
                    {
                        title: '⚠ Early Medical Review (1-2 Weeks)',
                        points: [
                            'Book an appointment with a physician or cardiology clinic.',
                            'Review blood pressure, cholesterol, and blood sugar trends.',
                            'Discuss need for ECG or additional diagnostic tests.'
                        ]
                    },
                    {
                        title: '🧭 Risk Reduction Plan (Next 30 Days)',
                        points: [
                            'Cut down sodium, fried foods, and high-sugar intake.',
                            'Begin supervised exercise 30 minutes per day, 5 days per week.',
                            'Stop smoking/alcohol and use stress reduction routines.'
                        ]
                    },
                    {
                        title: '📋 Follow-up Monitoring (Monthly)',
                        points: [
                            'Keep a weekly log of BP, heart rate, and symptoms.',
                            'Repeat lab tests in 6-8 weeks to verify improvement.',
                            'Reassess risk score monthly and adjust plan with your doctor.'
                        ]
                    }
                ]
            };
        }

        return {
            label: 'High Risk',
            rangeLabel: '61-100%',
            summary: 'Prioritize urgent medical evaluation and strict risk control.',
            steps: [
                {
                    title: '🚨 Immediate Action (Within 24-72 Hours)',
                    points: [
                        'Arrange urgent consultation with a cardiologist.',
                        'Seek emergency care immediately for chest pain, breathlessness, or dizziness.',
                        'Do not delay evaluation if symptoms suddenly worsen.'
                    ]
                },
                {
                    title: '💊 Intensive Management (This Week)',
                    points: [
                        'Follow prescribed medications exactly as instructed.',
                        'Complete recommended tests such as ECG, echo, or stress test.',
                        'Create a treatment checklist with your healthcare provider.'
                    ]
                },
                {
                    title: '🩺 Close Supervision (Weekly)',
                    points: [
                        'Monitor blood pressure and pulse daily at home.',
                        'Attend weekly or bi-weekly follow-up appointments initially.',
                        'Track warning signs and share updates with your care team.'
                    ]
                }
            ]
        };
    }

    /**
     * Update roadmap on results page based on risk score
     */
    updateRoadmap(riskPercentage) {
        const timeline = DOM.id('roadmap-timeline');
        if (!timeline) {
            return;
        }

        const description = DOM.id('roadmap-description');
        const roadmap = this.getRoadmapByRisk(riskPercentage);

        if (description) {
            description.textContent = `Risk Band: ${roadmap.label} (${roadmap.rangeLabel}). ${roadmap.summary}`;
        }

        timeline.innerHTML = roadmap.steps.map(step => `
            <li class="roadmap-item">
                <div class="roadmap-item-content">
                    <div class="roadmap-item-title">${step.title}</div>
                    <div class="roadmap-item-desc">${step.points.map(point => `• ${point}`).join('<br>')}</div>
                </div>
            </li>
        `).join('');
    }

    /**
     * Update what-if simulator
     */
    updateSimulator() {
        const chol = parseInt(DOM.id('sim-chol').value);
        const bp = parseInt(DOM.id('sim-bp').value);
        const hr = parseInt(DOM.id('sim-hr').value);

        DOM.id('sim-chol-value').textContent = chol;
        DOM.id('sim-bp-value').textContent = bp;
        DOM.id('sim-hr-value').textContent = hr;

        // Calculate adjusted risk
        let adjustedRisk = 50;
        adjustedRisk += (chol > 240) ? 20 : (chol > 200) ? 10 : 0;
        adjustedRisk += (bp > 140) ? 15 : (bp > 120) ? 8 : 0;
        adjustedRisk += (hr > 180) ? 12 : (hr < 60) ? 10 : 0;
        adjustedRisk = Math.max(20, Math.min(95, adjustedRisk));

        DOM.id('sim-risk').textContent = Math.round(adjustedRisk) + '%';
    }

    /**
     * Reset form
     */
    reset() {
        Form.reset(this.form);
        this.formData = {};
        this.predictionResult = null;
    }

    /**
     * Download report
     */
    downloadReport() {
        if (!this.predictionResult) {
            Alert.error('No prediction to download');
            return;
        }

        const riskPercentage = parseFloat(this.predictionResult.riskPercentage) || 0;
        const confidence = parseFloat(this.predictionResult.confidence) || 0;

        const reportText = `
HEART DISEASE PREDICTION REPORT
Generated: ${new Date().toLocaleString()}

═══════════════════════════════════════
PREDICTION SUMMARY
═══════════════════════════════════════
Risk Level: ${riskPercentage}%
Model Confidence: ${confidence}%
Status: ${riskPercentage > 60 ? 'HIGH RISK' : riskPercentage > 40 ? 'MODERATE RISK' : 'LOW RISK'}

═══════════════════════════════════════
PATIENT DATA
═══════════════════════════════════════
Age: ${this.formData.age} years
Gender: ${this.formData.gender === '1' ? 'Male' : 'Female'}
Blood Pressure: ${this.formData.trestbps} mmHg
Cholesterol: ${this.formData.chol} mg/dl
Heart Rate: ${this.formData.thalach} bpm

═══════════════════════════════════════
IMPORTANT DISCLAIMER
═══════════════════════════════════════
This prediction is based on an ANN model for educational purposes.
It is NOT a medical diagnosis and should NOT replace professional medical advice.
Please consult with a qualified healthcare professional for proper evaluation.

═══════════════════════════════════════
NEXT STEPS
═══════════════════════════════════════
1. Schedule an appointment with a cardiologist
2. Discuss results with your primary care physician
3. Follow the personalized health roadmap provided
4. Monitor vital signs regularly
5. Maintain a healthy lifestyle

═══════════════════════════════════════
For more information, visit your healthcare provider.
        `;

        if (window.jspdf && window.jspdf.jsPDF) {
            const pdf = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const margin = 40;
            const maxWidth = 515;
            const lineHeight = 16;
            const lines = pdf.splitTextToSize(reportText.trim(), maxWidth);

            let y = margin;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.setFont('courier', 'normal');
            pdf.setFontSize(11);

            lines.forEach((line) => {
                if (y > pageHeight - margin) {
                    pdf.addPage();
                    y = margin;
                }
                pdf.text(line, margin, y);
                y += lineHeight;
            });

            pdf.save('heart_disease_report_' + new Date().getTime() + '.pdf');
            Alert.success('PDF report downloaded successfully');
            return;
        }

        // Fallback to text download when PDF library is unavailable.
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'heart_disease_report_' + new Date().getTime() + '.txt';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Alert.success('Report downloaded successfully');
    }
}

// Create singleton instance
const predictionHandler = new PredictionHandler();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PredictionHandler, predictionHandler };
}
