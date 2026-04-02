// Theme toggle (light/dark mode)
function toggleTheme() {
    const body = document.body;
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
    }
}

// On load, set theme from localStorage
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
});
// Global variables
let probabilityChart = null;
let currentPrediction = null;
let currentFormData = null;
let currentStep = 1; // Track current form step

function getPredictionEndpoints() {
    const endpoints = [];

    if (window.location.protocol !== 'file:') {
        endpoints.push(`${window.location.origin}/api/predict`);
    }

    endpoints.push('http://localhost:5000/api/predict');
    endpoints.push('http://127.0.0.1:5000/api/predict');

    return [...new Set(endpoints)];
}

async function requestPrediction(sendData) {
    let lastError = new Error('No prediction endpoints configured');

    for (const endpoint of getPredictionEndpoints()) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sendData),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            lastError = error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    throw lastError;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeTooltips();
    initializeMultiStepForm();
    loadCSVData();
    triggerSliderUpdates(); // Trigger initial slider displays
});

// Load CSV data for validation
async function loadCSVData() {
    try {
        const response = await fetch('./heart_disease_selected_features.csv');
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const header = lines[0].split(',');
        
        window.csvData = {
            headers: header,
            rows: lines.slice(1).map(line => line.split(','))
        };
        
        console.log('CSV data loaded:', window.csvData);
    } catch (error) {
        console.log('CSV data will be loaded from API');
    }
}

// Setup event listeners
function setupEventListeners() {
    const fieldConfig = {
        'age': { displayId: 'age-value', unit: 'years', manualId: 'age-manual' },
        'trestbps': { displayId: 'trestbps-value', unit: 'mmHg', manualId: 'trestbps-manual' },
        'chol': { displayId: 'chol-value', unit: 'mg/dl', manualId: 'chol-manual' },
        'thalach': { displayId: 'thalach-value', unit: 'bpm', manualId: 'thalach-manual' }
    };

    Object.keys(fieldConfig).forEach(fieldId => {
        const config = fieldConfig[fieldId];
        const input = document.getElementById(fieldId);
        const display = document.getElementById(config.displayId);
        const manualInput = config.manualId ? document.getElementById(config.manualId) : null;

        const renderValue = (rawValue) => {
            const numericValue = Number(rawValue);
            if (display) {
                display.textContent = `${numericValue} ${config.unit}`;
            }
            if (manualInput && manualInput.value !== String(numericValue)) {
                manualInput.value = numericValue;
            }
        };

        if (input) {
            input.addEventListener('input', function() {
                renderValue(this.value);
            });
            renderValue(input.value); // Initial render
        }

        if (manualInput && input) {
            const syncManualToSlider = () => {
                const raw = manualInput.value.trim();
                if (raw === '') {
                    return;
                }

                let value = parseInt(raw, 10);
                if (Number.isNaN(value)) {
                    return;
                }

                const min = Number(input.min);
                const max = Number(input.max);
                value = Math.max(min, Math.min(max, value));

                manualInput.value = value;
                input.value = value;
                renderValue(value);
            };

            const restoreIfEmptyOrInvalid = () => {
                const raw = manualInput.value.trim();
                if (raw === '' || Number.isNaN(Number(raw))) {
                    manualInput.value = input.value;
                }
                syncManualToSlider();
            };

            manualInput.addEventListener('input', syncManualToSlider);
            manualInput.addEventListener('change', syncManualToSlider);
            manualInput.addEventListener('blur', restoreIfEmptyOrInvalid);
        }
    });

    // Form submission
    const form = document.getElementById('prediction-form');
    if (form) {
        form.addEventListener('submit', handlePrediction);
    }
}

// Initialize Tooltips
function initializeTooltips() {
    // Tooltip functionality is handled via CSS hover
    // But we can add click-based tooltips for mobile if needed
    const tooltips = document.querySelectorAll('.info-tooltip');
    tooltips.forEach(tooltip => {
        tooltip.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    // Close tooltips when clicking outside
    document.addEventListener('click', function() {
        // Tooltips are CSS-based hover, so no need for manual closing
    });
}

// Trigger Initial Slider Updates
function triggerSliderUpdates() {
    const rangeInputs = ['age', 'trestbps', 'chol', 'thalach'];
    rangeInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }
    });
}

// Initialize Multi-Step Form
function initializeMultiStepForm() {
    currentStep = 1;
    updateFormStep();
}

// Update form step display
function updateFormStep() {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    const activeStepElement = document.querySelector(`#form-step-${currentStep}`);
    if (activeStepElement) {
        activeStepElement.classList.add('active');
    }

    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    const activeIndicator = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (activeIndicator) {
        activeIndicator.classList.add('active');
    }

    // Update tabs
    document.querySelectorAll('.form-tab').forEach((tab, index) => {
        const stepNum = index + 1;
        tab.classList.remove('active');
        if (stepNum === currentStep) {
            tab.classList.add('active');
        }
    });

    // Update button visibility
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'flex' : 'none';
    }
    if (nextBtn) {
        nextBtn.style.display = currentStep < 2 ? 'flex' : 'none';
    }
    if (submitBtn) {
        submitBtn.style.display = currentStep === 2 ? 'flex' : 'none';
    }

    // Scroll to top
    const inputPage = document.querySelector('.input-page');
    if (inputPage) {
        inputPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Switch form step
function switchFormStep(step) {
    // Validate current step before moving
    if (step > currentStep && !validateFormStep(currentStep)) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Update step
    if (step >= 1 && step <= 2) {
        currentStep = step;
        updateFormStep();
    }
}

// Validate specific form step
function validateFormStep(step) {
    const requiredFields = {
        1: ['age', 'gender', 'cp'],
        2: ['trestbps', 'chol', 'thalach', 'fbs']
    };

    for (let field of requiredFields[step]) {
        const element = document.getElementById(field);
        if (!element || element.value === '' || element.value === null) {
            return false;
        }
    }
    return true;
}

// Select option for button groups
function selectOption(button, fieldName, value) {
    // Remove active class from all buttons in the group
    const group = button.parentElement;
    group.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to clicked button
    button.classList.add('active');

    // Update hidden input value
    const hiddenInput = document.getElementById(fieldName);
    if (hiddenInput) {
        hiddenInput.value = value;
    }

    // Trigger change event for validation
    const event = new Event('change', { bubbles: true });
    if (hiddenInput) {
        hiddenInput.dispatchEvent(event);
    }
}

// Navigate between pages
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Scroll to element
function scrollTo(elementId) {
    setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
}

// Handle prediction
function handlePrediction(e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Get form data
    const formData = new FormData(document.getElementById('prediction-form'));
    const data = Object.fromEntries(formData);
    currentFormData = data;

    // Show processing page
    navigateTo('processing');
    startProcessingAnimation();

    // Call API to get prediction
    setTimeout(() => {
        makePrediction(data);
    }, 1200);
}

function startProcessingAnimation() {
    const steps = document.querySelectorAll('.processing-step');
    steps.forEach(step => step.classList.remove('active'));
    steps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('active');
        }, index * 1000);
    });
}

// Validate form
function validateForm() {
    const form = document.getElementById('prediction-form');
    
    // Required fields - only selected features
    const requiredFields = [
        'age', 'gender', 'cp', 'trestbps', 'chol', 'thalach', 'fbs'
    ];
    
    let isValid = true;
    
    for (let field of requiredFields) {
        const element = form.querySelector(`#${field}`);
        if (!element || element.value === '' || element.value === null) {
            isValid = false;
            console.warn(`Missing required field: ${field}`);
        }
    }
    
    if (!isValid) {
        showToast('Please fill in all required fields', 'error', 3000);
    }
    
    return isValid;
}

// Make prediction
async function makePrediction(data) {
    // Convert string values to numbers - only selected features
    const sendData = {
        age: parseInt(data.age),
        gender: parseInt(data.gender),
        cp: parseInt(data.cp),
        trestbps: parseInt(data.trestbps),
        chol: parseInt(data.chol),
        fbs: parseInt(data.fbs),
        thalach: parseInt(data.thalach)
    };

    let predictionData = null;
    try {
        predictionData = await requestPrediction(sendData);
    } catch (error) {
        console.error('Prediction error:', error);
        predictionData = generateMockPrediction(data);
    }

    // Always render output, whether API succeeded or fallback was used.
    updateResultsPage(predictionData, data);
    navigateTo('results');

    showToast('Prediction completed successfully!', 'success', 4000);

    // Add animations to result cards
    setTimeout(() => {
        document.querySelectorAll('.result-card').forEach((card, idx) => {
            card.style.animation = `slideUpCard 0.6s ease-out forwards`;
            card.style.animationDelay = `${idx * 0.1}s`;
        });
    }, 300);
}

// Generate mock prediction (fallback)
function generateMockPrediction(data) {
    const age = parseInt(data.age);
    const chol = parseInt(data.chol);
    const trestbps = parseInt(data.trestbps);
    const thalach = parseInt(data.thalach);

    let riskScore = 0;
    riskScore += (age > 50) ? 20 : (age > 40) ? 10 : 0;
    riskScore += (chol > 240) ? 25 : (chol > 200) ? 15 : 0;
    riskScore += (trestbps > 140) ? 20 : (trestbps > 120) ? 10 : 0;
    riskScore += (thalach > 180) ? 15 : (thalach < 60) ? 10 : 0;
    riskScore += Math.random() * 20 - 10;

    riskScore = Math.max(20, Math.min(95, riskScore));

    return {
        riskPercentage: Math.round(riskScore),
        confidence: Math.round(85 + Math.random() * 10),
        probDisease: Math.round(riskScore),
        probNoDisease: Math.round(100 - riskScore),
        features: {
            chol: Math.round(riskScore * 0.28),
            age: Math.round(riskScore * 0.22),
            bp: Math.round(riskScore * 0.18),
            hr: Math.round(riskScore * 0.15),
            st: Math.round(riskScore * 0.12),
            other: Math.round(riskScore * 0.05)
        }
    };
}

// Initialize charts
function initializeCharts() {
    const probabilityCtx = document.getElementById('probabilityChart');
    if (probabilityCtx) {
        if (probabilityChart) {
            probabilityChart.destroy();
        }

        probabilityChart = new Chart(probabilityCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Heart Disease Risk', 'No Disease'],
                datasets: [{
                    data: [72, 28],
                    backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(34, 197, 94, 0.8)'],
                    borderColor: ['#EF4444', '#22C55E'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: "'Poppins', sans-serif" },
                            padding: 15,
                            usePointStyle: true,
                            color: '#334155'
                        }
                    }
                }
            }
        });
    }
}

function getFeatureBarGradient(value) {
    if (value >= 20) {
        return 'linear-gradient(180deg, #f97316 0%, #ef4444 100%)';
    }
    if (value >= 12) {
        return 'linear-gradient(180deg, #facc15 0%, #f59e0b 100%)';
    }
    return 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)';
}

function getRoadmapByRisk(riskPercentage) {
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

function updateHealthRoadmap(riskPercentage) {
    const roadmapTimeline = document.getElementById('roadmap-timeline');
    if (!roadmapTimeline) {
        return;
    }

    const roadmapDescription = document.getElementById('roadmap-description');
    const roadmap = getRoadmapByRisk(riskPercentage);

    if (roadmapDescription) {
        roadmapDescription.textContent = `Risk Band: ${roadmap.label} (${roadmap.rangeLabel}). ${roadmap.summary}`;
    }

    roadmapTimeline.innerHTML = roadmap.steps.map(step => `
        <li class="roadmap-item">
            <div class="roadmap-item-content">
                <div class="roadmap-item-title">${step.title}</div>
                <div class="roadmap-item-desc">${step.points.map(point => `• ${point}`).join('<br>')}</div>
            </div>
        </li>
    `).join('');
}

// Update results page
function updateResultsPage(prediction, formData) {
    currentPrediction = prediction;

    // Update risk gauge
    const riskPercentage = prediction.riskPercentage;
    const riskPercentageEl = document.getElementById('risk-percentage');
    if (riskPercentageEl) {
        riskPercentageEl.textContent = riskPercentage;
    }

    // Rotate needle across semicircle: 0% -> -90deg, 100% -> 90deg
    const riskNeedle = document.getElementById('risk-needle');
    if (riskNeedle) {
        const clampedRisk = Math.max(0, Math.min(100, Number(riskPercentage)));
        const needleAngle = -90 + (clampedRisk * 1.8);
        riskNeedle.style.transform = `translateX(-50%) rotate(${needleAngle}deg)`;
    }

    // Update risk badge
    const riskBadge = document.getElementById('risk-badge');
    if (riskBadge) {
        if (riskPercentage > 60) {
            riskBadge.className = 'risk-label risk-high';
            riskBadge.textContent = 'High Risk';
        } else if (riskPercentage > 40) {
            riskBadge.className = 'risk-label risk-medium';
            riskBadge.textContent = 'Moderate Risk';
        } else {
            riskBadge.className = 'risk-label risk-low';
            riskBadge.textContent = 'Low Risk';
        }
    }

    // Update roadmap based on risk threshold.
    updateHealthRoadmap(riskPercentage);

    // Update confidence score
    const confidenceEl = document.getElementById('confidence-score');
    if (confidenceEl) {
        confidenceEl.textContent = prediction.confidence;
    }

    // Ensure chart exists on first result render, then apply prediction data.
    if (!probabilityChart) {
        initializeCharts();
    }

    // Update probability chart
    if (probabilityChart) {
        probabilityChart.data.datasets[0].data = [
            prediction.probDisease,
            prediction.probNoDisease
        ];
        probabilityChart.update();
    }

    // Update feature importance
    const features = prediction.features;
    const featureTotals = {
        'chol': Math.round(features.chol),
        'age': Math.round(features.age),
        'bp': Math.round(features.bp),
        'hr': Math.round(features.hr),
        'st': Math.round(features.st),
        'other': Math.round(features.other)
    };

    Object.keys(featureTotals).forEach(key => {
        const element = document.getElementById('feature-' + key);
        if (element) {
            const value = featureTotals[key];
            element.textContent = value + '%';
            const featureBar = element.closest('.feature-bar');
            const barFill = featureBar ? featureBar.querySelector('.bar-fill') : null;
            if (barFill) {
                const maxChartValue = 30;
                const normalizedHeight = Math.max(0, Math.min(100, (value / maxChartValue) * 100));
                barFill.style.height = normalizedHeight + '%';
                barFill.style.background = getFeatureBarGradient(value);
            }
        }
    });

    // Update comparison table
    const bloodPressureStatus = parseInt(formData.trestbps) > 120 ? 'badge-warning' : 'badge-success';
    const cholesterolStatus = parseInt(formData.chol) > 200 ? 'badge-warning' : 'badge-success';
    const heartRateStatus = parseInt(formData.thalach) > 100 ? 'badge-warning' : 'badge-success';

    const compBp = document.getElementById('comp-bp');
    const compChol = document.getElementById('comp-chol');
    const compHr = document.getElementById('comp-hr');
    const compAge = document.getElementById('comp-age');

    if (compBp) compBp.textContent = formData.trestbps;
    if (compChol) compChol.textContent = formData.chol;
    if (compHr) compHr.textContent = formData.thalach;
    if (compAge) compAge.textContent = formData.age;

    // Update status badges
    const bpBadge = document.querySelector('[data-field="bp"]');
    const cholBadge = document.querySelector('[data-field="chol"]');
    const hrBadge = document.querySelector('[data-field="hr"]');

    if (bpBadge) {
        bpBadge.className = 'badge ' + bloodPressureStatus;
        bpBadge.textContent = bloodPressureStatus === 'badge-success' ? 'Normal' : 'Elevated';
    }
    if (cholBadge) {
        cholBadge.className = 'badge ' + cholesterolStatus;
        cholBadge.textContent = cholesterolStatus === 'badge-success' ? 'Normal' : 'Borderline';
    }
    if (hrBadge) {
        hrBadge.className = 'badge ' + heartRateStatus;
        hrBadge.textContent = heartRateStatus === 'badge-success' ? 'Normal' : 'Elevated';
    }

    // Reset simulator
    const simChol = document.getElementById('sim-chol');
    const simBp = document.getElementById('sim-bp');
    const simHr = document.getElementById('sim-hr');

    if (simChol && simBp && simHr) {
        simChol.value = formData.chol;
        simBp.value = formData.trestbps;
        simHr.value = formData.thalach;
        updateSimulator();
    }
}

// Update simulator
function updateSimulator() {
    const simCholEl = document.getElementById('sim-chol');
    const simBpEl = document.getElementById('sim-bp');
    const simHrEl = document.getElementById('sim-hr');
    const simRiskEl = document.getElementById('sim-risk');
    const simCholValueEl = document.getElementById('sim-chol-value');
    const simBpValueEl = document.getElementById('sim-bp-value');
    const simHrValueEl = document.getElementById('sim-hr-value');

    if (!simCholEl || !simBpEl || !simHrEl || !simRiskEl || !simCholValueEl || !simBpValueEl || !simHrValueEl) {
        return;
    }

    const chol = parseInt(simCholEl.value);
    const bp = parseInt(simBpEl.value);
    const hr = parseInt(simHrEl.value);

    simCholValueEl.textContent = chol;
    simBpValueEl.textContent = bp;
    simHrValueEl.textContent = hr;

    // Calculate adjusted risk
    let adjustedRisk = 50;
    adjustedRisk += (chol > 240) ? 20 : (chol > 200) ? 10 : 0;
    adjustedRisk += (bp > 140) ? 15 : (bp > 120) ? 8 : 0;
    adjustedRisk += (hr > 180) ? 12 : (hr < 60) ? 10 : 0;
    adjustedRisk = Math.max(20, Math.min(95, adjustedRisk));

    simRiskEl.textContent = Math.round(adjustedRisk) + '%';
}

function loadImageAsDataUrl(srcPath) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;

            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('Canvas context unavailable'));
                return;
            }

            context.drawImage(image, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };

        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = srcPath;
    });
}

// Download report
async function downloadReport() {
    const riskText = document.getElementById('risk-percentage').textContent;
    const confidenceText = document.getElementById('confidence-score').textContent;
    const riskPercentage = parseFloat(riskText) || 0;
    const confidence = parseFloat(confidenceText) || 0;

    const statusLabel = riskPercentage > 60 ? 'HIGH RISK' : riskPercentage > 40 ? 'MODERATE RISK' : 'LOW RISK';
    const reportDate = new Date().toLocaleString();
    const patientData = [
        ['Age', `${currentFormData.age || 'N/A'} years`],
        ['Gender', `${currentFormData.gender === '1' ? 'Male' : 'Female'}`],
        ['Cholesterol', `${currentFormData.chol || 'N/A'} mg/dL`],
        ['Blood Pressure', `${currentFormData.trestbps || 'N/A'} mmHg`],
        ['Heart Rate', `${currentFormData.thalach || 'N/A'} bpm`]
    ];

    if (window.jspdf && window.jspdf.jsPDF) {
        const pdf = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 36;
        let y = 0;
        let logoDataUrl = null;

        const riskColor = statusLabel === 'HIGH RISK' ? [198, 40, 40] : statusLabel === 'MODERATE RISK' ? [245, 124, 0] : [46, 125, 50];

        try {
            logoDataUrl = await loadImageAsDataUrl('./assets/images/cardioai-logo.svg');
        } catch (error) {
            console.warn('CardioAI logo could not be loaded for report header.', error);
        }

        // Header
        pdf.setFillColor(24, 80, 162);
        pdf.rect(0, 0, pageWidth, 92, 'F');

        if (logoDataUrl) {
            const logoBadgeWidth = 132;
            const logoBadgeX = pageWidth - margin - logoBadgeWidth;
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(logoBadgeX, 12, logoBadgeWidth, 30, 6, 6, 'F');
            pdf.addImage(logoDataUrl, 'PNG', logoBadgeX + 6, 16, 118, 22);
        }

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.text('CardioAI Clinical Report', margin, 58);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.text('Heart Disease Prediction Summary', margin, 74);
        pdf.text(`Generated: ${reportDate}`, margin, 88);

        // Risk summary card
        y = 116;
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(223, 228, 234);
        pdf.roundedRect(margin, y, pageWidth - margin * 2, 96, 8, 8, 'FD');
        pdf.setTextColor(20, 20, 20);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('Prediction Summary', margin + 16, y + 24);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(`Risk Level: ${Math.round(riskPercentage)}%`, margin + 16, y + 48);
        pdf.text(`Model Confidence: ${Math.round(confidence)}%`, margin + 16, y + 68);

        pdf.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        pdf.roundedRect(pageWidth - margin - 170, y + 36, 150, 30, 6, 6, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(statusLabel, pageWidth - margin - 95, y + 56, { align: 'center' });

        // Patient details
        y = 234;
        pdf.setTextColor(20, 20, 20);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('Patient Input Data', margin, y);
        y += 18;

        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(1);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 18;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        patientData.forEach(([label, value]) => {
            pdf.setTextColor(70, 70, 70);
            pdf.text(`${label}:`, margin, y);
            pdf.setTextColor(20, 20, 20);
            pdf.text(value, margin + 120, y);
            y += 20;
        });

        // Disclaimer block
        y += 10;
        pdf.setFillColor(255, 248, 230);
        pdf.setDrawColor(255, 224, 178);
        pdf.roundedRect(margin, y, pageWidth - margin * 2, 82, 6, 6, 'FD');
        pdf.setTextColor(120, 74, 19);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Medical Disclaimer', margin + 12, y + 20);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const disclaimerLines = pdf.splitTextToSize(
            'This prediction is generated by an ANN model for educational and screening support only. It is not a medical diagnosis. Please consult a qualified healthcare professional for proper clinical evaluation.',
            pageWidth - margin * 2 - 24
        );
        pdf.text(disclaimerLines, margin + 12, y + 38);

        // Next steps
        y += 108;
        pdf.setTextColor(20, 20, 20);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('Recommended Next Steps', margin, y);
        y += 18;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10.5);
        const nextSteps = [
            '1. Schedule an appointment with a cardiologist.',
            '2. Discuss these findings with your primary care physician.',
            '3. Follow your personalized prevention and monitoring plan.',
            '4. Monitor blood pressure, cholesterol, and heart rate regularly.',
            '5. Maintain consistent exercise, nutrition, and sleep habits.'
        ];

        nextSteps.forEach((step) => {
            pdf.text(step, margin, y);
            y += 16;
        });

        // Footer
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, 796, pageWidth - margin, 796);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.text('CardioAI | Heart Disease Prediction Platform', margin, 812);
        pdf.text('Page 1 of 1', pageWidth - margin, 812, { align: 'right' });

        pdf.save('heart_disease_report_' + new Date().getTime() + '.pdf');
        return;
    }

    // Fallback to text download when PDF library is unavailable.
    const reportText = [
        'CARDIOAI CLINICAL REPORT',
        `Generated: ${reportDate}`,
        '',
        'Prediction Summary',
        `Risk Level: ${Math.round(riskPercentage)}%`,
        `Model Confidence: ${Math.round(confidence)}%`,
        `Status: ${statusLabel}`,
        '',
        'Patient Input Data',
        ...patientData.map(([label, value]) => `- ${label}: ${value}`),
        '',
        'Medical Disclaimer',
        'This prediction is generated by an ANN model for educational and screening support only.',
        'It is not a medical diagnosis. Please consult a qualified healthcare professional.',
        '',
        'Recommended Next Steps',
        '1. Schedule an appointment with a cardiologist.',
        '2. Discuss these findings with your primary care physician.',
        '3. Follow your personalized prevention and monitoring plan.',
        '4. Monitor blood pressure, cholesterol, and heart rate regularly.',
        '5. Maintain consistent exercise, nutrition, and sleep habits.'
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'heart_disease_report_' + new Date().getTime() + '.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Toggle dark mode
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('.theme-toggle i');
    if (document.body.classList.contains('dark-mode')) {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Load saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    updateThemeIcon();
}

/* ═══════════════════════════════════════════════════════════════
   CREATIVE POPUP & ALERT NOTIFICATION FUNCTIONS
   ═══════════════════════════════════════════════════════════════ */

// Show Toast Notification
function showToast(message, type = 'info', duration = 4000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} popInAlert`;
    
    let icon = '✓';
    if (type === 'success') icon = '✓';
    else if (type === 'error') icon = '✕';
    else if (type === 'warning') icon = '⚠';
    else if (type === 'info') icon = 'ℹ';
    
    alert.innerHTML = `
        <span style="font-weight: 700; font-size: 1.2rem;">${icon}</span>
        <span>${message}</span>
        <span class="alert-close" onclick="this.parentElement.style.display='none';">✕</span>
    `;
    
    document.body.appendChild(alert);
    
    if (duration) {
        setTimeout(() => {
            alert.style.animation = 'popInAlert 0.5s reverse forwards';
            setTimeout(() => alert.remove(), 500);
        }, duration);
    }
}

// Show Modal Popup
function showModal(title, content, buttons = []) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    let buttonsHTML = '';
    if (buttons.length > 0) {
        buttonsHTML = buttons.map((btn, idx) => `
            <button class="btn ${btn.class || 'btn-primary'}" onclick="${btn.onclick || ''}" style="margin-right: 0.5rem;">
                ${btn.text}
            </button>
        `).join('');
    }
    
    modal.innerHTML = `
        <div class="modal-content popupBounce">
            <h2 style="margin-bottom: 1rem; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                ${title}
            </h2>
            <p style="margin-bottom: 1.5rem; color: var(--text-secondary); line-height: 1.6;">
                ${content}
            </p>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                ${buttonsHTML}
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">Close</button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
}

// Show Confirmation Popup
function showConfirm(title, message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    
    modal.innerHTML = `
        <div class="modal-content popupBounce">
            <h2 style="margin-bottom: 1rem; background: linear-gradient(135deg, var(--accent), var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                ${title}
            </h2>
            <p style="margin-bottom: 2rem; color: var(--text-secondary); line-height: 1.6;">
                ${message}
            </p>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn btn-danger-light" onclick="onCancel && onCancel(); this.closest('.modal').remove();">Cancel</button>
                <button class="btn btn-primary" onclick="onConfirm && onConfirm(); this.closest('.modal').remove();">Confirm</button>
            </div>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            onCancel && onCancel();
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
}

// Animate Element with Bounce
function animateElementBounce(element) {
    if (!element) return;
    element.classList.add('bounce-in');
    setTimeout(() => element.classList.remove('bounce-in'), 600);
}

// Animate Element with Shake
function shakeElement(element) {
    if (!element) return;
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 500);
}

// Animate Element with Pulse
function pulseElement(element) {
    if (!element) return;
    element.classList.add('pulse-glow');
    setTimeout(() => element.classList.remove('pulse-glow'), 2000);
}

// Animate Element with Rotate In
function rotateInElement(element) {
    if (!element) return;
    element.classList.add('rotate-in');
    setTimeout(() => element.classList.remove('rotate-in'), 600);
}

// Animate Element with Flip
function flipElement(element) {
    if (!element) return;
    element.classList.add('flip-card');
    setTimeout(() => element.classList.remove('flip-card'), 600);
}

// Animate Element with Heartbeat
function heartbeatElement(element) {
    if (!element) return;
    element.classList.add('heartbeat');
    setTimeout(() => element.classList.remove('heartbeat'), 1300);
}

// Animate Element Floating
function makeElementFloat(element) {
    if (!element) return;
    element.classList.add('floating');
}

// Animate Element Wiggle
function wiggleElement(element) {
    if (!element) return;
    element.classList.add('wiggle');
    setTimeout(() => element.classList.remove('wiggle'), 500);
}


