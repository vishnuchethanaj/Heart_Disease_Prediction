/* API Service - Handles all API calls */

class APIService {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.timeout = 30000; // 30 seconds
    }

    /**
     * Make an API request
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            timeout = this.timeout
        } = options;

        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    /**
     * POST request
     */
    post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    /**
     * PUT request
     */
    put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    /**
     * DELETE request
     */
    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    /**
     * Send prediction request
     */
    async predict(data) {
        return this.post('/predict', data);
    }

    /**
     * Get model info
     */
    async getModelInfo() {
        return this.get('/model-info');
    }

    /**
     * Get sample predictions
     */
    async getSamples() {
        return this.get('/samples');
    }

    /**
     * Get statistics
     */
    async getStats() {
        return this.get('/stats');
    }
}

/**
 * Mock API Service - For development/testing
 */
class MockAPIService extends APIService {
    async predict(data) {
        // Simulate processing delay
        await this.delay(2000);

        const age = parseInt(data.age);
        const chol = parseInt(data.chol);
        const trestbps = parseInt(data.trestbps);
        const thalach = parseInt(data.thalach);

        // Simple risk calculation
        let riskScore = 0;
        riskScore += (age > 50) ? 20 : (age > 40) ? 10 : 0;
        riskScore += (chol > 240) ? 25 : (chol > 200) ? 15 : 0;
        riskScore += (trestbps > 140) ? 20 : (trestbps > 120) ? 10 : 0;
        riskScore += (thalach > 180) ? 15 : (thalach < 60) ? 10 : 0;
        riskScore += Math.random() * 20 - 10;

        riskScore = Math.max(20, Math.min(95, riskScore));

        return {
            success: true,
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

    async getModelInfo() {
        return {
            name: 'Heart Disease Prediction ANN',
            version: '1.0.0',
            accuracy: 94.5,
            f1Score: 0.92,
            auc: 0.96
        };
    }

    async getStats() {
        return {
            totalPredictions: 1234,
            averageRisk: 45.6,
            highRiskCases: 234,
            accuracy: 94.5
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create a singleton instance
const apiService = new MockAPIService();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIService, MockAPIService, apiService };
}
