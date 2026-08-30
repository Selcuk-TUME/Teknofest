/**
 * INGEK-IOT Analiz Paneli - JavaScript Etkileşim ve Telemetri Simülasyonu
 */

// UTC Clock updater
function initClock() {
    const clockElement = document.getElementById('utc-clock');
    if (!clockElement) return;

    function updateClock() {
        const now = new Date();
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds} UTC`;
    }

    setInterval(updateClock, 1000);
    updateClock();
}

// Live ESP32 Telemetry Stream Simulation Engine
class TelemetrySimulator {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.baseWeight = 482.4;
        this.flWeight = 132.5;
        this.frWeight = 131.0;
        this.blWeight = 108.2;
        this.brWeight = 110.7;
        this.isFiltered = true;
        this.stepCount = 3;
        this.kickCount = 1;
        this.history = [];
        this.maxPoints = 40;
    }

    start() {
        this.isRunning = true;
        const btn = document.getElementById('btn-simulate');
        if (btn) {
            btn.classList.remove('bg-primary', 'text-on-primary');
            btn.classList.add('bg-alarm-rose', 'text-white', 'hover:bg-rose-600');
            btn.innerHTML = `<span class="material-symbols-outlined text-sm">pause</span> Simülasyonu Durdur`;
        }

        const statusText = document.getElementById('esp32-status-text');
        if (statusText) statusText.textContent = "ESP32 Canlı Simülasyon";

        this.intervalId = setInterval(() => this.tick(), 300);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        const btn = document.getElementById('btn-simulate');
        if (btn) {
            btn.classList.remove('bg-alarm-rose', 'text-white', 'hover:bg-rose-600');
            btn.classList.add('bg-primary', 'text-on-primary');
            btn.innerHTML = `<span class="material-symbols-outlined text-sm">play_arrow</span> Canlı ESP32 Akışını Simüle Et`;
        }

        const statusText = document.getElementById('esp32-status-text');
        if (statusText) statusText.textContent = "ESP32 Bağlı";
    }

    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    tick() {
        // Random micro-fluctuations
        const noise = this.isFiltered ? (Math.random() - 0.5) * 0.4 : (Math.random() - 0.5) * 1.8;
        const flDelta = (Math.random() - 0.5) * 0.3;
        const frDelta = (Math.random() - 0.5) * 0.3;
        const blDelta = (Math.random() - 0.5) * 0.3;
        const brDelta = (Math.random() - 0.5) * 0.3;

        const currentFL = Math.max(0, this.flWeight + flDelta);
        const currentFR = Math.max(0, this.frWeight + frDelta);
        const currentBL = Math.max(0, this.blWeight + blDelta);
        const currentBR = Math.max(0, this.brWeight + brDelta);
        const total = currentFL + currentFR + currentBL + currentBR;

        // Occasional step/kick simulation
        if (Math.random() < 0.05) {
            this.stepCount++;
            const stepEl = document.getElementById('metric-step-count');
            if (stepEl) stepEl.textContent = this.stepCount;
        }

        // Update Weight UI
        const weightEl = document.getElementById('metric-total-weight');
        if (weightEl) {
            weightEl.textContent = total.toFixed(2);
        }

        // Update Legs UI
        const elFL = document.getElementById('val-fl-kg');
        const elFR = document.getElementById('val-fr-kg');
        const elBL = document.getElementById('val-bl-kg');
        const elBR = document.getElementById('val-br-kg');

        if (elFL) elFL.innerHTML = `${currentFL.toFixed(1)}<span class="text-[10px]">kg</span>`;
        if (elFR) elFR.innerHTML = `${currentFR.toFixed(1)}<span class="text-[10px]">kg</span>`;
        if (elBL) elBL.innerHTML = `${currentBL.toFixed(1)}<span class="text-[10px]">kg</span>`;
        if (elBR) elBR.innerHTML = `${currentBR.toFixed(1)}<span class="text-[10px]">kg</span>`;

        // Update percentages
        const pFL = (currentFL / total) * 100;
        const pFR = (currentFR / total) * 100;
        const pBL = (currentBL / total) * 100;
        const pBR = (currentBR / total) * 100;

        const elPFL = document.getElementById('pct-fl');
        const elPFR = document.getElementById('pct-fr');
        const elPBL = document.getElementById('pct-bl');
        const elPBR = document.getElementById('pct-br');

        if (elPFL) elPFL.textContent = `${pFL.toFixed(1)}%`;
        if (elPFR) elPFR.textContent = `${pFR.toFixed(1)}%`;
        if (elPBL) elPBL.textContent = `${pBL.toFixed(1)}%`;
        if (elPBR) elPBR.textContent = `${pBR.toFixed(1)}%`;

        // Front vs Back ratio
        const frontPct = pFL + pFR;
        const backPct = pBL + pBR;
        const frontBar = document.getElementById('front-load-bar');
        const backBar = document.getElementById('back-load-bar');
        const frontLabel = document.getElementById('front-load-text');
        const backLabel = document.getElementById('back-load-text');

        if (frontBar) frontBar.style.width = `${frontPct}%`;
        if (backBar) backBar.style.width = `${backPct}%`;
        if (frontLabel) frontLabel.textContent = `${frontPct.toFixed(1)}%`;
        if (backLabel) backLabel.textContent = `${backPct.toFixed(1)}%`;

        // Update Latency
        const latencyEl = document.getElementById('esp32-latency');
        if (latencyEl) {
            const lat = Math.floor(38 + Math.random() * 12);
            latencyEl.textContent = `${lat}ms`;
        }
    }
}

// Global simulator instance
const simulator = new TelemetrySimulator();

// Filter switch tabs
function setTelemetryFilter(isFiltered) {
    simulator.isFiltered = isFiltered;
    const btnRaw = document.getElementById('tab-raw-data');
    const btnFiltered = document.getElementById('tab-filtered-data');

    if (!btnRaw || !btnFiltered) return;

    if (isFiltered) {
        btnFiltered.className = "px-3 py-1 text-[10px] font-data-sm rounded-md bg-surface-card border border-surface-border text-text-primary shadow-sm cursor-pointer";
        btnRaw.className = "px-3 py-1 text-[10px] font-data-sm rounded-md bg-transparent text-text-muted hover:text-text-primary transition-colors cursor-pointer";
    } else {
        btnRaw.className = "px-3 py-1 text-[10px] font-data-sm rounded-md bg-surface-card border border-surface-border text-text-primary shadow-sm cursor-pointer";
        btnFiltered.className = "px-3 py-1 text-[10px] font-data-sm rounded-md bg-transparent text-text-muted hover:text-text-primary transition-colors cursor-pointer";
    }
}

// Modal helper for System Logs
function openSystemLogsModal() {
    const modal = document.getElementById('system-logs-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeSystemLogsModal() {
    const modal = document.getElementById('system-logs-modal');
    if (modal) modal.classList.add('hidden');
}

// Attach event listeners on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initClock();

    const btnSimulate = document.getElementById('btn-simulate');
    if (btnSimulate) {
        btnSimulate.addEventListener('click', () => simulator.toggle());
    }

    const btnRaw = document.getElementById('tab-raw-data');
    if (btnRaw) {
        btnRaw.addEventListener('click', () => setTelemetryFilter(false));
    }

    const btnFiltered = document.getElementById('tab-filtered-data');
    if (btnFiltered) {
        btnFiltered.addEventListener('click', () => setTelemetryFilter(true));
    }

    const btnLogs = document.getElementById('btn-system-logs');
    if (btnLogs) {
        btnLogs.addEventListener('click', openSystemLogsModal);
    }
});
