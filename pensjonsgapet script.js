document.addEventListener('DOMContentLoaded', function() {

        function extractJsonObjectAfterMarker(text, marker) {
            const raw = String(text || '').replace(/^\uFEFF/, '').replace(/\u2028/g, '\n').replace(/\u2029/g, '\n');
            const idx = raw.indexOf(marker);
            if (idx < 0) return null;
            const braceStart = raw.indexOf('{', idx + marker.length);
            if (braceStart < 0) return null;
            let depth = 0, inString = false, esc = false;
            for (let i = braceStart; i < raw.length; i++) {
                const c = raw[i];
                if (inString) {
                    if (esc) { esc = false; continue; }
                    if (c === '\\') { esc = true; continue; }
                    if (c === '"') inString = false;
                    continue;
                }
                if (c === '"') { inString = true; continue; }
                if (c === '{') depth++;
                else if (c === '}') {
                    depth--;
                    if (depth === 0) return raw.slice(braceStart, i + 1);
                }
            }
            return null;
        }

        // --- GLOBAL APP STATE ---


        // Output modal wiring
        const outputBtn = document.getElementById('outputBtn');
        const outputModal = document.getElementById('outputModal');
        const outputClose = document.getElementById('outputClose');
        const outputTextArea = document.getElementById('outputTextArea');
        const copyButton = document.getElementById('copyButton');
        
        const generateOutputText = () => {
            let n = 1;
            const out = [];
            const push = (label, displayValue) => {
                out.push(`${n} : ${label} : ${displayValue}`);
                n += 1;
            };
            const inputLabels = {
                'age': 'Din alder',
                'retirementAge': 'Pensjonsalder',
                'grunnbelop': 'Grunnbeløp (1G)',
                'currentSalary': 'Dagens årslønn',
                'currentOTPSaldo': 'OTP Saldo i dag',
                'otpRate': 'OTP-sats',
                'currentIPSBalance': 'IPS saldo i dag',
                'ipsAnnualSaving': 'Årlig sparing IPS',
                'annualFripoliserPayout': 'Årlig utbetaling fra fripoliser',
                'expectedReturn': 'Aksjeandel',
                'payoutYears': 'Utbetalingsperiode OTP',
                'socialSecurityEstimate': 'Årlig utbetaling fra folketrygden',
                'desiredPensionLevel': 'Ønsket pensjonsnivå',
                'cpiRate': 'Forventet årlig KPI'
            };
            const INGEN_DATA = 'ingen data';
            const orIngenData = (v) => (v === undefined || v === null || (typeof v === 'string' && !String(v).trim())) ? INGEN_DATA : v;
            Object.keys(inputLabels).forEach(function (id) {
                const element = document.getElementById(id);
                if (!element) return;
                const value = element.value;
                const label = inputLabels[id];
                const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
                let displayValue = INGEN_DATA;
                if (hasValue) {
                    if (id === 'age' || id === 'retirementAge') {
                        displayValue = `${value} år`;
                    } else if (id === 'grunnbelop' || id === 'currentSalary' || id === 'currentOTPSaldo' || id === 'currentIPSBalance' || id === 'ipsAnnualSaving' || id === 'annualFripoliserPayout' || id === 'socialSecurityEstimate') {
                        displayValue = `${parseFloat(value).toLocaleString('nb-NO')} kr`;
                    } else if (id === 'otpRate' || id === 'desiredPensionLevel' || id === 'cpiRate') {
                        displayValue = `${parseFloat(value).toFixed(1)} %`;
                    } else if (id === 'expectedReturn') {
                        const returnToStock = { 5: 0, 5.6: 20, 6.3: 45, 6.7: 55, 7: 65, 7.5: 85, 8: 100 };
                        const ret = parseFloat(value);
                        const stock = returnToStock[ret] !== undefined ? returnToStock[ret] : ret;
                        displayValue = `${stock}% aksjer (${ret}% avkastning)`;
                    } else if (id === 'payoutYears') {
                        displayValue = `${value} år`;
                    } else {
                        displayValue = value;
                    }
                }
                push(label, displayValue);
            });
            const comboLumpSum = document.getElementById('combo-lump-sum');
            const comboMonthly = document.getElementById('combo-monthly');
            const customComboInput = document.getElementById('customComboPercent');
            if (comboLumpSum && comboMonthly) {
                let comboPercent = '';
                if (customComboInput && customComboInput.value) {
                    comboPercent = ` (${customComboInput.value}%)`;
                } else {
                    const selectedButton = document.querySelector('.combo-btn.bg-\\[var\\(--accent-blue-light\\)\\]');
                    if (selectedButton) {
                        comboPercent = ` (${selectedButton.getAttribute('data-percent')}%)`;
                    }
                }
                push(`Kombinasjonsløsning – Engangsinnskudd${comboPercent}`, orIngenData(comboLumpSum.textContent) || comboLumpSum.textContent || INGEN_DATA);
                push(`Kombinasjonsløsning – Månedlig sparing${comboPercent}`, orIngenData(comboMonthly.textContent) || comboMonthly.textContent || INGEN_DATA);
            }
            var ccpStore = document.getElementById('customComboPercent');
            var selBtnStore = document.querySelector('.combo-btn.bg-\\[var\\(--accent-blue-light\\)\\]');
            if (ccpStore) {
                push('Kombinasjonsløsning – lagret skreddersydd %', String(ccpStore.value).trim()
                    ? `${parseFloat(ccpStore.value).toFixed(1)} %`
                    : INGEN_DATA);
            }
            push('Kombinasjonsløsning – lagret knappvalg', (selBtnStore && selBtnStore.getAttribute('data-percent'))
                ? `${selBtnStore.getAttribute('data-percent')} %`
                : INGEN_DATA);
            const totalAnnualPension = document.getElementById('total-annual-pension');
            const pensionPercentage = document.getElementById('pension-percentage');
            const lumpSumToday = document.getElementById('lump-sum-today');
            const monthlySavingNeeded = document.getElementById('monthly-saving-needed');
            if (totalAnnualPension) {
                push('Årlig pensjon (estimat)', orIngenData(totalAnnualPension.textContent) || totalAnnualPension.textContent || INGEN_DATA);
            }
            if (pensionPercentage) {
                push('% av sluttlønn', orIngenData(pensionPercentage.textContent) || pensionPercentage.textContent || INGEN_DATA);
            }
            if (lumpSumToday) {
                push('Nødvendig engangsinnskudd i dag', orIngenData(lumpSumToday.textContent) || lumpSumToday.textContent || INGEN_DATA);
            }
            if (monthlySavingNeeded) {
                push('Alternativ månedlig sparing', orIngenData(monthlySavingNeeded.textContent) || monthlySavingNeeded.textContent || INGEN_DATA);
            }
            return out.join('\n');
        };
        
        window.PensjonsgapetGetOutputText = function() { return generateOutputText(); };
        
        window.PensjonsgapetApplyInputText = function(text) {
            if (!text || !text.trim()) return;
            const PJ = 'Pensjonsgapet state (json):';
            var raw = String(text).replace(/^\uFEFF/, '').replace(/\u2028/g, '\n').replace(/\u2029/g, '\n');
            var js = extractJsonObjectAfterMarker(raw, PJ);
            if (!js) {
                var pj = raw.indexOf(PJ);
                if (pj >= 0) {
                    js = raw.slice(pj + PJ.length).trim();
                    var nl = js.indexOf('\n');
                    if (nl >= 0) js = js.slice(0, nl).trim();
                }
            }
            if (js) {
                try {
                    var snap = JSON.parse(js);
                    if (snap && snap.v === 1 && snap.inputs && typeof snap.inputs === 'object') {
                        Object.keys(snap.inputs).forEach(function (id) {
                            var el = document.getElementById(id);
                            var v = snap.inputs[id];
                            // Inkluder 0 og "0" – ikkje hopp over med == null
                            if (el && v !== null && v !== undefined) {
                                el.value = String(v);
                                if (id === 'desiredPensionLevel' && typeof window.PensjonsgapetSyncDesiredPensionUI === 'function') {
                                    window.PensjonsgapetSyncDesiredPensionUI(parseFloat(v));
                                }
                                if (el.type === 'range') el.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });
                        if (snap.customComboPercent != null) {
                            var cc = document.getElementById('customComboPercent');
                            if (cc) cc.value = String(snap.customComboPercent);
                        }
                        if (snap.comboPercentSelected != null) {
                            var b = document.querySelector('.combo-btn[data-percent="' + String(snap.comboPercentSelected) + '"]');
                            if (b) b.click();
                        }
                        if (typeof DashboardApp !== 'undefined' && DashboardApp.calculatePension) DashboardApp.calculatePension();
                        return;
                    }
                } catch (e) { console.warn('Pensjonsgapet state (json):', e); }
            }
            const labelToId = {
                'Din alder': 'age', 'Pensjonsalder': 'retirementAge', 'Grunnbeløp (1G)': 'grunnbelop',
                'Dagens årslønn': 'currentSalary', 'OTP Saldo i dag': 'currentOTPSaldo', 'OTP-sats': 'otpRate',
                'IPS Saldo i dag': 'currentIPSBalance', 'IPS saldo i dag': 'currentIPSBalance', 'Årlig sparing IPS': 'ipsAnnualSaving',
                'Årlig utbetaling fra Fripoliser': 'annualFripoliserPayout', 'Årlig utbetaling fra fripoliser': 'annualFripoliserPayout',
                'Aksjeandel': 'expectedReturn', 'Utbetalingsperiode OTP': 'payoutYears', 'Forventet årlig KPI': 'cpiRate',
                'Årlig utbetaling Folketrygden': 'socialSecurityEstimate', 'Årlig utbetaling fra folketrygden': 'socialSecurityEstimate',
                'Ønsket pensjonsnivå': 'desiredPensionLevel'
            };
            const stockToReturn = { 0: 5, 20: 5.6, 45: 6.3, 55: 6.7, 65: 7, 85: 7.5, 100: 8 };
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            lines.forEach(line => {
                let label, valueStr;
                const triple = line.match(/^(\d+)\s*:\s*(.+?)\s*:\s*(.+)$/);
                if (triple) {
                    label = triple[2].trim();
                    valueStr = triple[3].trim();
                } else {
                    const colonIdx = line.indexOf(':');
                    if (colonIdx < 0) return;
                    label = line.substring(0, colonIdx).trim();
                    valueStr = line.substring(colonIdx + 1).trim();
                }
                if (label === 'Kombinasjonsløsning – lagret skreddersydd %') {
                    const cc = document.getElementById('customComboPercent');
                    if (cc) {
                        const rawPct = String(valueStr).replace(',', '.').replace(/[^\d.-]/g, '').trim();
                        const pv = parseFloat(rawPct);
                        if (!isNaN(pv)) {
                            cc.value = String(pv);
                            cc.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                    return;
                }
                if (label === 'Kombinasjonsløsning – lagret knappvalg') {
                    const mPct = String(valueStr).match(/(\d+)/);
                    if (mPct) {
                        const b = document.querySelector('.combo-btn[data-percent="' + mPct[1] + '"]');
                        if (b) b.click();
                    }
                    return;
                }
                const id = labelToId[label];
                if (!id) return;
                const el = document.getElementById(id);
                if (!el) return;
                let num = parseFloat(valueStr.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
                if (id === 'expectedReturn' && valueStr.includes('%')) {
                    const stockMatch = valueStr.match(/(\d+)\s*%\s*aksjer/);
                    if (stockMatch) num = stockToReturn[parseInt(stockMatch[1], 10)] ?? num;
                }
                el.value = String(num);
                if (id === 'desiredPensionLevel' && typeof window.PensjonsgapetSyncDesiredPensionUI === 'function') {
                    window.PensjonsgapetSyncDesiredPensionUI(num);
                }
                const valSpan = document.getElementById(id + '-value');
                if (valSpan && id !== 'grunnbelop') valSpan.textContent = valueStr.includes('kr') ? new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num) : valueStr;
                if (el.type === 'range') el.dispatchEvent(new Event('input', { bubbles: true }));
            });
            if (typeof DashboardApp !== 'undefined' && DashboardApp.calculatePension) DashboardApp.calculatePension();
        };
        
        const openOutput = () => {
            if (!outputModal) return;
            
            // Generate and populate the text
            const outputText = generateOutputText();
            if (outputTextArea) {
                outputTextArea.value = outputText;
            }
            
            outputModal.classList.remove('hidden');
            outputModal.classList.add('flex');
        };
        const closeOutput = () => {
            if (!outputModal) return;
            outputModal.classList.add('hidden');
            outputModal.classList.remove('flex');
        };
        // Copy functionality
        const copyToClipboard = async () => {
            if (!outputTextArea) return;
            
            try {
                await navigator.clipboard.writeText(outputTextArea.value);
                
                // Visual feedback
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    Kopiert!
                `;
                copyButton.setAttribute('data-copied', 'true');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                    copyButton.removeAttribute('data-copied');
                }, 2000);
                
            } catch (err) {
                console.error('Failed to copy text: ', err);
                // Fallback for older browsers
                outputTextArea.select();
                document.execCommand('copy');
            }
        };
        
        if (outputBtn) outputBtn.addEventListener('click', openOutput);
        if (outputClose) outputClose.addEventListener('click', closeOutput);
        if (copyButton) copyButton.addEventListener('click', copyToClipboard);
        if (outputModal) {
            outputModal.addEventListener('click', (e) => {
                const target = e.target;
                if (target && target.getAttribute('data-close') === 'true') closeOutput();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeOutput();
            });
        }

        // No multi-page navigation or shared data needed


        // ==================================================================
        // --- SCRIPT FOR PART 1: PENSION DASHBOARD ---
        // ==================================================================
        const DashboardApp = {
            inputsConfig: [
                { id: 'age', label: 'Din alder', type: 'range', min: 18, max: 70, step: 1, value: 45, unit: 'år' },
                { id: 'retirementAge', label: 'Pensjonsalder', type: 'range', min: 62, max: 72, step: 1, value: 67, unit: 'år' },
                { id: 'grunnbelop', label: 'Grunnbeløp (1G)', type: 'number', value: 136549, unit: 'kr' },
                { id: 'currentSalary', label: 'Dagens årslønn', type: 'range', min: 0, max: 15000000, step: 10000, value: 2000000, unit: 'kr' },
                { id: 'currentOTPSaldo', label: 'OTP Saldo i dag', type: 'range', min: 0, max: 10000000, step: 10000, value: 500000, unit: 'kr' },
                { id: 'otpRate', label: 'OTP-sats', type: 'range', min: 2, max: 8, step: 0.1, value: 5, unit: '%' },
                { id: 'currentIPSBalance', label: 'IPS Saldo i dag', type: 'range', min: 0, max: 1000000, step: 10000, value: 0, unit: 'kr' },
                { id: 'ipsAnnualSaving', label: 'Årlig sparing IPS', type: 'range', min: 0, max: 25000, step: 1000, value: 0, unit: 'kr' },
                { id: 'annualFripoliserPayout', label: 'Årlig utbetaling fra Fripoliser', type: 'range', min: 0, max: 500000, step: 5000, value: 0, unit: 'kr' },
                { id: 'expectedReturn', label: 'Aksjeandel', type: 'range', min: 3, max: 10, step: 0.1, value: 7, unit: '%' },
                { id: 'payoutYears', label: 'Utbetalingsperiode OTP', type: 'range', min: 10, max: 20, step: 1, value: 15, unit: 'år' },
                { id: 'cpiRate', label: 'Forventet årlig KPI', type: 'range', min: 0, max: 10, step: 0.1, value: 3, unit: '%' },
                { id: 'socialSecurityEstimate', label: 'Årlig utbetaling Folketrygden', type: 'range', min: 150000, max: 600000, step: 5000, value: 250000, unit: 'kr' },
                { id: 'desiredPensionLevel', label: 'Ønsket pensjonsnivå', type: 'range', min: 0, max: 100, step: 0.1, value: 80, unit: '%' }
            ],
            
            init: function() {
                const inputContainer = document.getElementById('input-container');
                if (inputContainer.childElementCount > 0) return; // Prevent re-initialization
                
                // IDs of fields to hide/show with toggle button (excluding currentOTPSaldo itself)
                const toggleableFieldIds = ['otpRate', 'currentIPSBalance', 'ipsAnnualSaving', 'annualFripoliserPayout', 'expectedReturn', 'payoutYears', 'socialSecurityEstimate'];
                
                this.inputsConfig.forEach(config => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'input-group';
                    
                    // Mark toggleable fields
                    if (toggleableFieldIds.includes(config.id)) {
                        wrapper.classList.add('toggleable-input');
                    }
                    
                    const label = document.createElement('label');
                    label.htmlFor = config.id;
                    label.className = 'typo-label';
                    label.textContent = config.label;
                    const input = document.createElement('input');
                    input.id = config.id;
                    input.type = config.type;
                    input.value = config.value;

                    if (config.type === 'range') {
                        const labelWrapper = document.createElement('div');
                        labelWrapper.className = 'flex justify-between items-baseline mb-2';
                        const valueSpan = document.createElement('span');
                        valueSpan.id = `${config.id}-value`;
                        valueSpan.className = 'text-base font-bold text-[var(--accent-blue-light)]';
                        
                        // Add toggle button to the left of label for OTP Saldo field
                        if (config.id === 'currentOTPSaldo') {
                            const toggleBtn = document.createElement('button');
                            toggleBtn.id = 'toggleInputsBtn';
                            toggleBtn.className = 'text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50 mr-2';
                            toggleBtn.setAttribute('aria-label', 'Vis/skjul inputs');
                            toggleBtn.setAttribute('type', 'button');
                            toggleBtn.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                    <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" />
                                </svg>
                            `;
                            
                            // Create a container for all content (label, value, slider) that can be toggled
                            const otpContent = document.createElement('div');
                            otpContent.className = 'toggleable-otp-content';
                            
                            labelWrapper.appendChild(label);
                            labelWrapper.appendChild(valueSpan);
                            otpContent.appendChild(labelWrapper);
                            
                            input.className = 'w-full';
                            input.min = config.min;
                            input.max = config.max;
                            input.step = config.step;
                            input.value = config.value; // sett verdi etter min/max for å unngå klipping
                            otpContent.appendChild(input);
                            
                            wrapper.appendChild(toggleBtn);
                            wrapper.appendChild(otpContent);
                            inputContainer.appendChild(wrapper);
                            return; // Skip the normal append logic
                        }
                        
                        labelWrapper.appendChild(label);
                        labelWrapper.appendChild(valueSpan);
                        wrapper.appendChild(labelWrapper);
                        input.className = 'w-full';
                        input.min = config.min;
                        input.max = config.max;
                        input.step = config.step;
                        input.value = config.value; // sett verdi etter min/max for å unngå klipping
                    } else {
                        wrapper.appendChild(label);
                        input.className = 'asset-input w-full mt-2 bg-slate-800 border border-[var(--border-color)] rounded-md px-3 py-2 text-white focus:ring-[var(--accent-blue-light)] focus:border-[var(--accent-blue-light)]';
                    }
                    wrapper.appendChild(input);
                    inputContainer.appendChild(wrapper);
                });

                this.inputsConfig.forEach(config => {
                    document.getElementById(config.id).addEventListener('input', this.calculatePension.bind(this));
                });
                
                // Removed navigation to prognosis page
                
                // Relocate selected sliders under combo boxes to save space on the left
                const comboSlidersContainer = document.getElementById('combo-sliders-container');
                if (comboSlidersContainer) {
                    ['desiredPensionLevel', 'cpiRate'].forEach((moveId) => {
                        const inputEl = document.getElementById(moveId);
                        if (inputEl) {
                            const group = inputEl.closest('.input-group');
                            if (group) comboSlidersContainer.appendChild(group);
                        }
                    });
                    // Stock allocation -> expected return mapping
                    const stockToReturn = { 0: 5, 20: 5.6, 45: 6.3, 55: 6.7, 65: 7, 85: 7.5, 100: 8 };
                    const transformToStockAllocation = (id, stockOptions, defaultStock) => {
                        const input = document.getElementById(id);
                        if (!input) return;
                        const wrapper = input.closest('.input-group');
                        const valueSpan = wrapper ? wrapper.querySelector(`#${id}-value`) : null;
                        const headerRow = wrapper ? wrapper.firstElementChild : null;
                        if (headerRow) headerRow.className = 'mb-2';
                        if (valueSpan) valueSpan.classList.add('hidden');
                        input.classList.add('hidden');
                        const btnRow = document.createElement('div');
                        btnRow.className = 'grid grid-cols-7 gap-2';
                        stockOptions.forEach((stock) => {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'choice-btn aksjeandel-btn w-full py-1.5 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition border border-slate-600';
                            btn.textContent = `${stock}%`;
                            btn.addEventListener('click', () => {
                                input.value = stockToReturn[stock];
                                btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                    b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    b.removeAttribute('data-selected');
                                });
                                btn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                btn.setAttribute('data-selected', 'true');
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            });
                            btnRow.appendChild(btn);
                        });
                        if (wrapper) wrapper.appendChild(btnRow);
                        const defaultBtn = Array.from(btnRow.children).find(b => b.textContent === `${defaultStock}%`);
                        if (defaultBtn) defaultBtn.click();
                    };
                    // Transform the two relocated sliders into fixed option button groups
                    const transformToChoices = (id, options, defaultValue) => {
                        const input = document.getElementById(id);
                        if (!input) return;
                        const wrapper = input.closest('.input-group');
                        const valueSpan = wrapper ? wrapper.querySelector(`#${id}-value`) : null;
                        const headerRow = wrapper ? wrapper.firstElementChild : null; // label row
                        if (headerRow) headerRow.className = 'mb-2';
                        if (valueSpan) valueSpan.classList.add('hidden');
                        // hide the slider input but keep it for value/state and events
                        input.classList.add('hidden');
                        // build buttons
                        const btnRow = document.createElement('div');
                        btnRow.className = 'grid grid-cols-6 gap-3';
                        
                        // Special handling for desiredPensionLevel - replace 0% with custom input
                        if (id === 'desiredPensionLevel') {
                            // Create custom input for first position
                            const customInputDiv = document.createElement('div');
                            customInputDiv.className = 'relative';
                            const customInput = document.createElement('input');
                            customInput.type = 'number';
                            customInput.id = 'customDesiredPensionLevel';
                            customInput.className = 'w-full py-1 text-sm rounded-full bg-slate-700 text-white border border-slate-600 text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
                            customInput.placeholder = '';
                            customInput.min = '0';
                            customInput.max = '100';
                            customInput.step = '0.1';
                            customInput.value = '';

                            const percentSymbol = document.createElement('div');
                            percentSymbol.className = 'absolute inset-y-0 right-2 pointer-events-none flex items-center';
                            percentSymbol.innerHTML = '<span class="text-xs text-slate-400">%</span>';

                            customInputDiv.appendChild(customInput);
                            customInputDiv.appendChild(percentSymbol);
                            btnRow.appendChild(customInputDiv);

                            const presetValues = options.slice(1);
                            const applyCustomDesired = (rawVal) => {
                                if (rawVal === '' || rawVal == null) return;
                                let value = parseFloat(String(rawVal).replace(',', '.'));
                                if (isNaN(value)) return;
                                value = Math.min(100, Math.max(0, value));
                                input.value = value;
                                customInput.value = String(value);
                                btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                    b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    b.removeAttribute('data-selected');
                                });
                                customInput.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                if (valueSpan) valueSpan.textContent = `${value} %`;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            };
                            const syncDesiredPensionUI = (value) => {
                                const num = Math.min(100, Math.max(0, parseFloat(value)));
                                if (isNaN(num)) return;
                                input.value = num;
                                const presetBtn = Array.from(btnRow.querySelectorAll('.choice-btn')).find(
                                    b => parseFloat(b.textContent) === num
                                );
                                if (presetBtn) {
                                    customInput.value = '';
                                    customInput.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                        b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                        b.removeAttribute('data-selected');
                                    });
                                    presetBtn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    presetBtn.setAttribute('data-selected', 'true');
                                } else {
                                    customInput.value = String(num);
                                    customInput.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                        b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                        b.removeAttribute('data-selected');
                                    });
                                }
                                if (valueSpan) valueSpan.textContent = `${num} %`;
                            };
                            window.PensjonsgapetSyncDesiredPensionUI = syncDesiredPensionUI;

                            customInput.addEventListener('input', (e) => {
                                const raw = e.target.value.trim();
                                if (raw === '' || raw === '-') {
                                    customInput.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                    return;
                                }
                                const value = parseFloat(raw.replace(',', '.'));
                                if (!isNaN(value) && value >= 0 && value <= 100) {
                                    applyCustomDesired(value);
                                }
                            });
                            customInput.addEventListener('blur', (e) => {
                                const raw = e.target.value.trim();
                                if (raw === '') return;
                                let value = parseFloat(raw.replace(',', '.'));
                                if (isNaN(value)) {
                                    customInput.value = '';
                                    return;
                                }
                                applyCustomDesired(value);
                            });

                            presetValues.forEach((val) => {
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = 'choice-btn w-full py-1 text-sm rounded-full bg-slate-700 text-white hover:bg-slate-600 transition';
                                btn.textContent = `${val}%`;
                                btn.addEventListener('click', () => {
                                    input.value = val;
                                    // visual state - remove from all buttons
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                        b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                        b.removeAttribute('data-selected');
                                    });
                                    // add to clicked button
                                    btn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    btn.setAttribute('data-selected', 'true');
                                    customInput.value = '';
                                    customInput.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                    if (valueSpan) valueSpan.textContent = `${val} %`;
                                    // trigger recalculation
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                });
                                btnRow.appendChild(btn);
                            });
                        } else {
                            // Original behavior for other fields
                            options.forEach((val) => {
                                const btn = document.createElement('button');
                                btn.type = 'button';
                                btn.className = 'choice-btn w-full py-1 text-sm rounded-full bg-slate-700 text-white hover:bg-slate-600 transition';
                                btn.textContent = `${val}%`;
                                btn.addEventListener('click', () => {
                                    input.value = val;
                                    // visual state - remove from all buttons
                                    btnRow.querySelectorAll('.choice-btn').forEach(b => {
                                        b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                        b.removeAttribute('data-selected');
                                    });
                                    // add to clicked button
                                    btn.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900', 'choice-btn-selected');
                                    btn.setAttribute('data-selected', 'true');
                                    // update label value immediately
                                    if (valueSpan) valueSpan.textContent = `${val} %`;
                                    // trigger recalculation
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                });
                                btnRow.appendChild(btn);
                            });
                        }
                        
                        if (wrapper) wrapper.appendChild(btnRow);
                        // set default
                        const defaultBtn = Array.from(btnRow.children).find(b => b.textContent === `${defaultValue}%`);
                        if (defaultBtn) defaultBtn.click();
                    };
                    // Desired pension: 0,20,40,60,80,100 with default 80
                    transformToChoices('desiredPensionLevel', [0, 20, 40, 60, 80, 100], 80);
                    // KPI: 0–5 with default 3
                    transformToChoices('cpiRate', [0, 1, 2, 3, 4, 5], 3);
                    // Aksjeandel: 0,20,45,55,65,85,100 -> forventet avkastning 5,5.6,6.3,6.7,7,7.5,8 % (default 65%)
                    // Aksjeandel boxes stay in Input column
                    transformToStockAllocation('expectedReturn', [0, 20, 45, 55, 65, 85, 100], 65);
                }
                
                // Combination buttons handlers
                const comboButtons = document.querySelectorAll('.combo-btn');
                if (comboButtons && comboButtons.length > 0) {
                    comboButtons.forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const percent = parseFloat(e.currentTarget.getAttribute('data-percent'));
                            this.updateCombination(percent);
                            this.calculatePension();
                            // visual selection state
                            comboButtons.forEach(b => {
                                b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                b.removeAttribute('data-combo-selected');
                            });
                            e.currentTarget.classList.add('bg-[var(--accent-blue-light)]', 'text-slate-900');
                            e.currentTarget.setAttribute('data-combo-selected', 'true');
                            // Clear custom input when button is selected
                            const customInput = document.getElementById('customComboPercent');
                            if (customInput) customInput.value = '';
                        });
                    });
                }
                
                // Custom input handler
                const customComboInput = document.getElementById('customComboPercent');
                if (customComboInput) {
                    customComboInput.addEventListener('input', (e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                            this.updateCombination(value);
                            this.calculatePension();
                            // Clear button selections when custom input is used
                            comboButtons.forEach(b => {
                                b.classList.remove('bg-[var(--accent-blue-light)]', 'text-slate-900');
                                b.removeAttribute('data-combo-selected');
                            });
                        }
                    });
                }

                this.calculatePension();
            },

            formatCurrency: (value) => new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value),
            formatNumber: (value) => new Intl.NumberFormat('nb-NO').format(value),
            formatPercent: (value) => `${value.toFixed(1)} %`,

            // --- STABLET SØYLEDIAGRAM: ESTIMERTE ÅRLIGE UTBETALINGER ---
            payoutChart: null,
            payoutCategories: [
                { key: 'lonn', label: 'Lønn', color: '#002359' },
                { key: 'folketrygd', label: 'Folketrygd', color: '#0A5EDC' },
                { key: 'otp', label: 'OTP', color: '#9747FF' },
                { key: 'ips', label: 'IPS', color: '#079455' },
                { key: 'fripoliser', label: 'Fripoliser', color: '#F79009' },
                { key: 'egenSparing', label: 'Egen sparing', color: '#15B79E' }
            ],
            gapPaymentAtYear: function(annualPensionGap, flatPension, g, yearIndex) {
                if (annualPensionGap <= 0) return 0;
                const growth = Math.pow(1 + g, yearIndex);
                return annualPensionGap * growth + (flatPension || 0) * (growth - 1);
            },
            pvInflationAdjustedGap: function(annualPensionGap, flatPension, g, r, periods) {
                if (periods <= 0 || annualPensionGap <= 0) return 0;
                let pv = 0;
                for (let t = 0; t < periods; t++) {
                    const payment = this.gapPaymentAtYear(annualPensionGap, flatPension, g, t);
                    if (Math.abs(r) < 1e-9) {
                        pv += payment;
                    } else {
                        pv += payment / Math.pow(1 + r, t + 1);
                    }
                }
                return pv;
            },
            remainingGapBalance: function(V0, annualPensionGap, flatPension, g, r, k) {
                if (k <= 0) return V0;
                let withdrawn = 0;
                for (let t = 0; t < k; t++) {
                    const payment = this.gapPaymentAtYear(annualPensionGap, flatPension, g, t);
                    withdrawn += payment * Math.pow(1 + Math.max(0, r), k - 1 - t);
                }
                return Math.max(0, V0 * Math.pow(1 + Math.max(0, r), k) - withdrawn);
            },
            getActiveExtraPayout: function(p, yearIndex) {
                if ((p.annualPensionGap || 0) <= 0) return 0;
                return Math.round(this.gapPaymentAtYear(
                    p.annualPensionGap,
                    p.flatPension || 0,
                    p.cpiRate || 0,
                    yearIndex != null ? yearIndex : 0
                ));
            },
            buildPayoutChartData: function(p) {
                const startAge = Math.round(p.age);
                const workYears = Math.max(0, Math.round(p.yearsToRetirement));
                const otpYears = Math.max(0, Math.round(p.payoutYears));
                const folketrygdYears = 25;
                const retirementSpan = Math.max(otpYears, folketrygdYears);
                const totalYears = workYears + retirementSpan;
                const g = p.cpiRate || 0;
                const labels = [];
                const series = { lonn: [], folketrygd: [], otp: [], ips: [], fripoliser: [], egenSparing: [] };
                for (let i = 0; i < totalYears; i++) {
                    labels.push(`${startAge + i} år`);
                    if (i < workYears) {
                        series.lonn.push(Math.round(p.currentSalary * Math.pow(1 + g, i)));
                        series.folketrygd.push(0);
                        series.otp.push(0);
                        series.ips.push(0);
                        series.fripoliser.push(0);
                        series.egenSparing.push(0);
                    } else {
                        const rIdx = i - workYears;
                        series.lonn.push(0);
                        series.folketrygd.push(rIdx < folketrygdYears ? Math.round(p.futureSocialSecurity * Math.pow(1 + g, rIdx)) : 0);
                        series.otp.push(rIdx < otpYears ? Math.round(p.annualOTPPayout) : 0);
                        series.ips.push(rIdx < otpYears ? Math.round(p.annualIPSPayout) : 0);
                        series.fripoliser.push(rIdx < otpYears ? Math.round(p.fripoliserPayout) : 0);
                        series.egenSparing.push(rIdx < otpYears ? this.getActiveExtraPayout(p, rIdx) : 0);
                    }
                }
                return { labels, series };
            },
            buildPensionLevelLine: function(p, totalYears) {
                const workYears = Math.max(0, Math.round(p.yearsToRetirement));
                const payoutYears = Math.max(0, Math.round(p.payoutYears));
                const level = p.totalAnnualPension || 0;
                const g = p.cpiRate || 0;
                const base = p.futureSocialSecurity || 0;
                const data = [];
                for (let i = 0; i < totalYears; i++) {
                    const rIdx = i - workYears;
                    data.push((rIdx >= 0 && rIdx < payoutYears) ? Math.round(level + base * (Math.pow(1 + g, rIdx) - 1)) : null);
                }
                return data;
            },
            pensionLevelLabel: function(p) {
                const pct = (typeof p.pensionPercentage === 'number') ? p.pensionPercentage : 0;
                return `Pensjonsnivå (${pct.toFixed(1)} % av sluttlønn)`;
            },
            buildDesiredLevelLine: function(p, totalYears) {
                const workYears = Math.max(0, Math.round(p.yearsToRetirement));
                const payoutYears = Math.max(0, Math.round(p.payoutYears));
                const level = p.desiredAnnualPension || 0;
                const g = p.cpiRate || 0;
                const data = [];
                for (let i = 0; i < totalYears; i++) {
                    const rIdx = i - workYears;
                    data.push((rIdx >= 0 && rIdx < payoutYears) ? Math.round(level * Math.pow(1 + g, rIdx)) : null);
                }
                return data;
            },
            desiredLevelLabel: function(p) {
                const pct = (typeof p.desiredPensionLevel === 'number') ? p.desiredPensionLevel : 0;
                return `Ønsket pensjonsnivå (${Math.round(pct)} % av sluttlønn)`;
            },
            updatePayoutChart: function(p) {
                const canvas = document.getElementById('payoutChart');
                if (!canvas || typeof Chart === 'undefined') return;
                const { labels, series } = this.buildPayoutChartData(p);
                const lineData = this.buildPensionLevelLine(p, labels.length);
                const lineLabel = this.pensionLevelLabel(p);
                const desiredLineData = this.buildDesiredLevelLine(p, labels.length);
                const desiredLineLabel = this.desiredLevelLabel(p);
                const fmt = this.formatCurrency;
                this.payoutMeta = { workYears: Math.max(0, Math.round(p.yearsToRetirement)) };
                if (!this.payoutChart) {
                    const barDatasets = this.payoutCategories.map(cat => ({
                        label: cat.label,
                        data: series[cat.key],
                        backgroundColor: cat.color,
                        hoverBackgroundColor: cat.color,
                        borderWidth: 0,
                        borderRadius: 3,
                        borderSkipped: false,
                        stack: 'utbetalinger',
                        categoryPercentage: 0.86,
                        barPercentage: 0.92,
                        maxBarThickness: 26,
                        order: 1
                    }));
                    const lineDataset = {
                        type: 'line',
                        label: lineLabel,
                        data: lineData,
                        borderColor: '#101828',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        borderCapStyle: 'round',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        spanGaps: false,
                        stack: 'pensjonsnivaa',
                        hidden: !this.showReferenceLines,
                        order: 0
                    };
                    const desiredLineDataset = {
                        type: 'line',
                        label: desiredLineLabel,
                        data: desiredLineData,
                        borderColor: '#B42318',
                        borderWidth: 2,
                        borderDash: [10, 5],
                        borderCapStyle: 'round',
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        fill: false,
                        spanGaps: false,
                        stack: 'oensketnivaa',
                        hidden: !this.showReferenceLines,
                        order: 0
                    };
                    const retirementBandPlugin = {
                        id: 'retirementBand',
                        getBoundaryX(chart) {
                            const meta = DashboardApp.payoutMeta;
                            if (!meta || !meta.workYears) return null;
                            const xScale = chart.scales.x;
                            const area = chart.chartArea;
                            if (!xScale || !area) return null;
                            const b = meta.workYears;
                            const total = chart.data.labels.length;
                            if (b <= 0 || b >= total) return null;
                            return (xScale.getPixelForValue(b - 1) + xScale.getPixelForValue(b)) / 2;
                        },
                        beforeDatasetsDraw(chart) {
                            const left = this.getBoundaryX(chart);
                            if (left == null) return;
                            const area = chart.chartArea;
                            const ctx = chart.ctx;
                            ctx.save();
                            ctx.fillStyle = 'rgba(0, 35, 89, 0.035)';
                            ctx.fillRect(left, area.top, area.right - left, area.bottom - area.top);
                            ctx.beginPath();
                            ctx.setLineDash([3, 4]);
                            ctx.strokeStyle = 'rgba(0, 35, 89, 0.22)';
                            ctx.lineWidth = 1;
                            ctx.moveTo(left, area.top);
                            ctx.lineTo(left, area.bottom);
                            ctx.stroke();
                            ctx.restore();
                        },
                        afterDatasetsDraw(chart) {
                            const left = this.getBoundaryX(chart);
                            if (left == null) return;
                            const area = chart.chartArea;
                            const ctx = chart.ctx;
                            ctx.save();
                            ctx.font = '700 10px Hanken Grotesk, sans-serif';
                            ctx.textBaseline = 'top';
                            ctx.textAlign = 'start';
                            ctx.fillStyle = '#0A5EDC';
                            ctx.fillText('PENSJONSUTBETALING', left + 8, area.top + 22);
                            ctx.restore();
                        }
                    };
                    const legendSpacingPlugin = {
                        id: 'legendSpacing',
                        beforeInit(chart) {
                            const originalFit = chart.legend.fit;
                            chart.legend.fit = function() {
                                originalFit.call(this);
                                this.height += 18;
                            };
                        }
                    };
                    this.payoutChart = new Chart(canvas.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [...barDatasets, lineDataset, desiredLineDataset]
                        },
                        plugins: [retirementBandPlugin, legendSpacingPlugin],
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: { top: 8, right: 6, bottom: 0, left: 0 } },
                            interaction: { mode: 'index', intersect: false },
                            animation: { duration: 650, easing: 'easeOutQuart' },
                            scales: {
                                x: {
                                    stacked: true,
                                    grid: { display: false },
                                    border: { display: false },
                                    ticks: {
                                        color: '#98A2B3',
                                        font: { family: 'Hanken Grotesk, sans-serif', size: 11 },
                                        autoSkip: true,
                                        maxTicksLimit: 12,
                                        maxRotation: 0,
                                        minRotation: 0,
                                        padding: 6
                                    }
                                },
                                y: {
                                    stacked: true,
                                    grid: { color: 'rgba(234, 236, 240, 0.7)', drawTicks: false },
                                    border: { display: false },
                                    ticks: {
                                        color: '#98A2B3',
                                        font: { family: 'Hanken Grotesk, sans-serif', size: 11 },
                                        padding: 10,
                                        maxTicksLimit: 6,
                                        callback: (value) => new Intl.NumberFormat('nb-NO', { notation: 'compact', compactDisplay: 'short' }).format(value) + ' kr'
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    align: 'start',
                                    labels: {
                                        color: '#475467',
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                        boxWidth: 8,
                                        boxHeight: 8,
                                        padding: 18,
                                        font: { family: 'Hanken Grotesk, sans-serif', size: 12, weight: '600' }
                                    }
                                },
                                tooltip: {
                                    backgroundColor: '#002359',
                                    titleColor: '#ffffff',
                                    bodyColor: 'rgba(255, 255, 255, 0.92)',
                                    footerColor: '#ffffff',
                                    padding: 14,
                                    cornerRadius: 10,
                                    caretSize: 6,
                                    boxPadding: 6,
                                    usePointStyle: true,
                                    titleFont: { family: 'Hanken Grotesk, sans-serif', size: 13, weight: '700' },
                                    bodyFont: { family: 'Hanken Grotesk, sans-serif', size: 12 },
                                    footerFont: { family: 'Hanken Grotesk, sans-serif', size: 12, weight: '700' },
                                    filter: (item) => item.parsed.y > 0,
                                    callbacks: {
                                        label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                                        footer: (items) => {
                                            const sum = items.reduce((acc, it) => acc + (it.dataset.type === 'line' ? 0 : (it.parsed.y || 0)), 0);
                                            return `Sum: ${fmt(sum)}`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    this.payoutChart.data.labels = labels;
                    this.payoutCategories.forEach((cat, idx) => {
                        this.payoutChart.data.datasets[idx].data = series[cat.key];
                    });
                    const lineDs = this.payoutChart.data.datasets[this.payoutCategories.length];
                    if (lineDs) {
                        lineDs.data = lineData;
                        lineDs.label = lineLabel;
                        lineDs.hidden = !this.showReferenceLines;
                    }
                    const desiredDs = this.payoutChart.data.datasets[this.payoutCategories.length + 1];
                    if (desiredDs) {
                        desiredDs.data = desiredLineData;
                        desiredDs.label = desiredLineLabel;
                        desiredDs.hidden = !this.showReferenceLines;
                    }
                    this.payoutChart.update();
                }
            },

            // --- STABLET SØYLEDIAGRAM: BEHOLDNINGER EGEN SPARING ---
            balanceChart: null,
            balanceCategories: [
                { key: 'otp', label: 'OTP', color: '#9747FF' },
                { key: 'ips', label: 'IPS', color: '#079455' },
                { key: 'egenSparing', label: 'Egen sparing', color: '#15B79E' }
            ],
            isComboActive: function() {
                const lumpEl = document.getElementById('combo-lump-sum');
                const box = lumpEl ? lumpEl.closest('.combo-output') : null;
                return !!(box && box.classList.contains('combo-output--active'));
            },
            buildBalanceChartData: function(p) {
                const startAge = Math.round(p.age);
                const n = Math.max(0, Math.round(p.yearsToRetirement));
                const payoutYears = Math.max(0, Math.round(p.payoutYears));
                const folketrygdYears = 25;
                const totalYears = n + Math.max(payoutYears, folketrygdYears);
                const r = p.r || 0;
                const g = p.g || 0;
                const comboActive = this.isComboActive() && (p.requiredCapitalAtRetirement || 0) > 0;
                const pct = (p.comboPercent != null ? p.comboPercent : 100) / 100;
                let egenLump = 0, egenAnnual = 0;
                if (comboActive && n > 0) {
                    egenLump = (pct * p.requiredCapitalAtRetirement) / Math.pow(1 + r, n);
                    egenAnnual = r > 0
                        ? ((1 - pct) * p.requiredCapitalAtRetirement) / ((Math.pow(1 + r, n) - 1) / r)
                        : ((1 - pct) * p.requiredCapitalAtRetirement) / n;
                }
                const otpAccum = (t) => {
                    const pvPart = (p.currentOTPSaldo || 0) * Math.pow(1 + r, t);
                    let pmtPart;
                    if (Math.abs(r - g) < 1e-9) {
                        pmtPart = (p.otpContribution || 0) * t * Math.pow(1 + r, Math.max(0, t - 1));
                    } else {
                        pmtPart = (p.otpContribution || 0) * ((Math.pow(1 + r, t) - Math.pow(1 + g, t)) / (r - g));
                    }
                    return pvPart + pmtPart;
                };
                const ipsAccum = (t) => {
                    const pvPart = (p.currentIPSBalance || 0) * Math.pow(1 + r, t);
                    const savePart = r > 0 ? (p.ipsAnnual || 0) * ((Math.pow(1 + r, t) - 1) / r) : (p.ipsAnnual || 0) * t;
                    return pvPart + savePart;
                };
                const egenAccum = (t) => {
                    if (!comboActive) return 0;
                    const lumpPart = egenLump * Math.pow(1 + r, t);
                    const savePart = r > 0 ? egenAnnual * ((Math.pow(1 + r, t) - 1) / r) : egenAnnual * t;
                    return lumpPart + savePart;
                };
                const remaining = (V0, pay, k) => {
                    let val;
                    if (r > 0) val = V0 * Math.pow(1 + r, k) - pay * ((Math.pow(1 + r, k) - 1) / r);
                    else val = V0 - pay * k;
                    return Math.max(0, val);
                };
                const labels = [];
                const series = { otp: [], ips: [], egenSparing: [] };
                for (let i = 0; i < totalYears; i++) {
                    labels.push(`${startAge + i} år`);
                    if (i <= n) {
                        series.otp.push(Math.round(otpAccum(i)));
                        series.ips.push(Math.round(ipsAccum(i)));
                        series.egenSparing.push(Math.round(egenAccum(i)));
                    } else {
                        const k = i - n;
                        if (k <= payoutYears) {
                            series.otp.push(Math.round(remaining(p.futureOTPSaldo || 0, p.annualOTPPayout || 0, k)));
                            series.ips.push(Math.round(remaining(p.futureIPSSaldo || 0, p.annualIPSPayout || 0, k)));
                            const egenV0 = comboActive ? (p.requiredCapitalAtRetirement || 0) : 0;
                            series.egenSparing.push(Math.round(this.remainingGapBalance(
                                egenV0,
                                p.annualPensionGap || 0,
                                p.flatPension || 0,
                                g,
                                r,
                                k
                            )));
                        } else {
                            series.otp.push(0);
                            series.ips.push(0);
                            series.egenSparing.push(0);
                        }
                    }
                }
                return { labels, series };
            },
            updateBalanceChart: function(p) {
                const canvas = document.getElementById('balanceChart');
                if (!canvas || typeof Chart === 'undefined') return;
                const { labels, series } = this.buildBalanceChartData(p);
                const fmt = this.formatCurrency;
                this.payoutMeta = { workYears: Math.max(0, Math.round(p.yearsToRetirement)) };
                if (!this.balanceChart) {
                    const barDatasets = this.balanceCategories.map(cat => ({
                        label: cat.label,
                        data: series[cat.key],
                        backgroundColor: cat.color,
                        hoverBackgroundColor: cat.color,
                        borderWidth: 0,
                        borderRadius: 3,
                        borderSkipped: false,
                        stack: 'beholdninger',
                        categoryPercentage: 0.86,
                        barPercentage: 0.92,
                        maxBarThickness: 26,
                        order: 1
                    }));
                    const retirementBandPlugin = {
                        id: 'retirementBandBalance',
                        getBoundaryX(chart) {
                            const meta = DashboardApp.payoutMeta;
                            if (!meta || !meta.workYears) return null;
                            const xScale = chart.scales.x;
                            const area = chart.chartArea;
                            if (!xScale || !area) return null;
                            const b = meta.workYears;
                            const total = chart.data.labels.length;
                            if (b <= 0 || b >= total) return null;
                            return (xScale.getPixelForValue(b - 1) + xScale.getPixelForValue(b)) / 2;
                        },
                        beforeDatasetsDraw(chart) {
                            const left = this.getBoundaryX(chart);
                            if (left == null) return;
                            const area = chart.chartArea;
                            const ctx = chart.ctx;
                            ctx.save();
                            ctx.fillStyle = 'rgba(0, 35, 89, 0.035)';
                            ctx.fillRect(left, area.top, area.right - left, area.bottom - area.top);
                            ctx.beginPath();
                            ctx.setLineDash([3, 4]);
                            ctx.strokeStyle = 'rgba(0, 35, 89, 0.22)';
                            ctx.lineWidth = 1;
                            ctx.moveTo(left, area.top);
                            ctx.lineTo(left, area.bottom);
                            ctx.stroke();
                            ctx.restore();
                        },
                        afterDatasetsDraw(chart) {
                            const left = this.getBoundaryX(chart);
                            if (left == null) return;
                            const area = chart.chartArea;
                            const ctx = chart.ctx;
                            ctx.save();
                            ctx.font = '700 10px Hanken Grotesk, sans-serif';
                            ctx.textBaseline = 'top';
                            ctx.textAlign = 'start';
                            ctx.fillStyle = '#0A5EDC';
                            ctx.fillText('NEDTAPPING', left + 8, area.top + 22);
                            ctx.restore();
                        }
                    };
                    const legendSpacingPlugin = {
                        id: 'legendSpacingBalance',
                        beforeInit(chart) {
                            const originalFit = chart.legend.fit;
                            chart.legend.fit = function() {
                                originalFit.call(this);
                                this.height += 18;
                            };
                        }
                    };
                    this.balanceChart = new Chart(canvas.getContext('2d'), {
                        type: 'bar',
                        data: { labels: labels, datasets: barDatasets },
                        plugins: [retirementBandPlugin, legendSpacingPlugin],
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: { padding: { top: 8, right: 6, bottom: 0, left: 0 } },
                            interaction: { mode: 'index', intersect: false },
                            animation: { duration: 650, easing: 'easeOutQuart' },
                            scales: {
                                x: {
                                    stacked: true,
                                    grid: { display: false },
                                    border: { display: false },
                                    ticks: {
                                        color: '#98A2B3',
                                        font: { family: 'Hanken Grotesk, sans-serif', size: 11 },
                                        autoSkip: true,
                                        maxTicksLimit: 12,
                                        maxRotation: 0,
                                        minRotation: 0,
                                        padding: 6
                                    }
                                },
                                y: {
                                    stacked: true,
                                    grid: { color: 'rgba(234, 236, 240, 0.7)', drawTicks: false },
                                    border: { display: false },
                                    ticks: {
                                        color: '#98A2B3',
                                        font: { family: 'Hanken Grotesk, sans-serif', size: 11 },
                                        padding: 10,
                                        maxTicksLimit: 6,
                                        callback: (value) => new Intl.NumberFormat('nb-NO', { notation: 'compact', compactDisplay: 'short' }).format(value) + ' kr'
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    align: 'start',
                                    labels: {
                                        color: '#475467',
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                        boxWidth: 8,
                                        boxHeight: 8,
                                        padding: 18,
                                        font: { family: 'Hanken Grotesk, sans-serif', size: 12, weight: '600' }
                                    }
                                },
                                tooltip: {
                                    backgroundColor: '#002359',
                                    titleColor: '#ffffff',
                                    bodyColor: 'rgba(255, 255, 255, 0.92)',
                                    footerColor: '#ffffff',
                                    padding: 14,
                                    cornerRadius: 10,
                                    caretSize: 6,
                                    boxPadding: 6,
                                    usePointStyle: true,
                                    titleFont: { family: 'Hanken Grotesk, sans-serif', size: 13, weight: '700' },
                                    bodyFont: { family: 'Hanken Grotesk, sans-serif', size: 12 },
                                    footerFont: { family: 'Hanken Grotesk, sans-serif', size: 12, weight: '700' },
                                    filter: (item) => item.parsed.y > 0,
                                    callbacks: {
                                        label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
                                        footer: (items) => {
                                            const sum = items.reduce((acc, it) => acc + (it.parsed.y || 0), 0);
                                            return `Sum: ${fmt(sum)}`;
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    this.balanceChart.data.labels = labels;
                    this.balanceCategories.forEach((cat, idx) => {
                        this.balanceChart.data.datasets[idx].data = series[cat.key];
                    });
                    this.balanceChart.update();
                }
            },

            // Nåverdi av annuitet med årlig KPI-vekst i utbetalingsperioden
            pvGrowingAnnuity: function(payment, g, r, periods) {
                if (periods <= 0 || payment <= 0) return 0;
                if (Math.abs(g) < 1e-9 && r > 0) {
                    return payment * ((1 - Math.pow(1 + r, -periods)) / r);
                }
                if (Math.abs(r) < 1e-9) {
                    if (Math.abs(g) < 1e-9) return payment * periods;
                    return payment * (Math.pow(1 + g, periods) - 1) / g;
                }
                if (Math.abs(r - g) < 1e-9) return payment * periods;
                const q = (1 + g) / (1 + r);
                return payment * (1 - Math.pow(q, periods)) / (1 - q);
            },
            remainingGrowingBalance: function(V0, payment, g, r, k) {
                if (k <= 0) return V0;
                let withdrawn;
                if (Math.abs(r) < 1e-9) {
                    withdrawn = Math.abs(g) < 1e-9 ? payment * k : payment * (Math.pow(1 + g, k) - 1) / g;
                } else if (Math.abs(r - g) < 1e-9) {
                    withdrawn = payment * k * Math.pow(1 + r, k - 1);
                } else {
                    const q = (1 + g) / (1 + r);
                    const growthFactor = Math.abs(1 - q) < 1e-9 ? k : (1 - Math.pow(q, k)) / (1 - q);
                    withdrawn = payment * Math.pow(1 + r, k - 1) * growthFactor;
                }
                const val = V0 * Math.pow(1 + Math.max(0, r), k) - withdrawn;
                return Math.max(0, val);
            },

            // Store last required capital and parameters for combo calculations
            lastCalc: null,
            showReferenceLines: true,
            selectedComboPercent: 100, /* Default: 100% engangsinnskudd */
            updateCombination: function(percent) {
                const comboSection = document.getElementById('combo-section');
                if (!comboSection || comboSection.classList.contains('hidden')) return;
                if (!this.lastCalc) return;
                const { r, n, requiredCapitalAtRetirement } = this.lastCalc;
                const p = percent / 100;
                let lump = 0;
                let annualSaving = 0;
                if (r > 0) {
                    lump = (p * requiredCapitalAtRetirement) / Math.pow(1 + r, n);
                    annualSaving = ((1 - p) * requiredCapitalAtRetirement) / ((Math.pow(1 + r, n) - 1) / r);
                } else {
                    lump = (p * requiredCapitalAtRetirement); // no discounting when r = 0
                    annualSaving = ((1 - p) * requiredCapitalAtRetirement) / n;
                }
                const monthly = annualSaving / 12;
                const lumpEl = document.getElementById('combo-lump-sum');
                const monthlyEl = document.getElementById('combo-monthly');
                if (lumpEl) lumpEl.textContent = this.formatCurrency(lump);
                if (monthlyEl) monthlyEl.textContent = this.formatCurrency(monthly);
                this.selectedComboPercent = percent;
            },

            calculatePension: function() {
                const values = {};
                this.inputsConfig.forEach(config => {
                    const element = document.getElementById(config.id);
                    values[config.id] = parseFloat(element.value);
                    if (config.type === 'range') {
                        let displayValue = this.formatNumber(values[config.id]);
                        if (config.unit === 'kr') displayValue = this.formatCurrency(values[config.id]);
                        if (config.unit === '%') displayValue = `${values[config.id].toFixed(config.step < 1 ? 1 : 0)} %`;
                        if (config.unit === 'år') displayValue = `${values[config.id]} år`;
                        document.getElementById(`${config.id}-value`).textContent = displayValue;
                    }
                });
                
                const G = values.grunnbelop;
                const maxContributionBaseSalary = 12 * G;
                if (values.age >= values.retirementAge) {
                    values.age = values.retirementAge - 1;
                    document.getElementById('age').value = values.age;
                }

                const n = values.retirementAge - values.age;
                const g = values.cpiRate / 100;
                const r = values.expectedReturn / 100;
                const cpiFactor = 1 + g;
                const futureSocialSecurity = values.socialSecurityEstimate * Math.pow(cpiFactor, n);
                const futureSalary = values.currentSalary * Math.pow(cpiFactor, n);
                const contributionBase = Math.min(values.currentSalary, maxContributionBaseSalary);
                const pmt = contributionBase * (values.otpRate / 100);
                const pv = values.currentOTPSaldo;
                const pvComponent = pv * Math.pow(1 + r, n);
                let pmtComponent;
                if (r.toFixed(5) === g.toFixed(5)) {
                    pmtComponent = pmt * n * Math.pow(1 + r, n - 1);
                } else {
                    pmtComponent = pmt * ((Math.pow(1 + r, n) - Math.pow(1 + g, n)) / (r - g));
                }
                const futureOTPSaldo = pvComponent + pmtComponent;
                let annualOTPPayout = 0;
                const n_payout = values.payoutYears;
                if (r > 0) {
                    annualOTPPayout = (futureOTPSaldo * r) / (1 - Math.pow(1 + r, -n_payout));
                } else {
                    annualOTPPayout = futureOTPSaldo / n_payout;
                }
                if (isNaN(annualOTPPayout)) annualOTPPayout = 0;

                // IPS: accumulation until retirement, then payout over same period as OTP
                const ipsPV = values.currentIPSBalance || 0;
                const ipsAnnual = values.ipsAnnualSaving || 0;
                const futureIPSFromPV = ipsPV * Math.pow(1 + r, n);
                const futureIPSFromSaving = r > 0 ? (ipsAnnual * ((Math.pow(1 + r, n) - 1) / r)) : (ipsAnnual * n);
                const futureIPSSaldo = futureIPSFromPV + futureIPSFromSaving;
                let annualIPSPayout = 0;
                if (r > 0) {
                    annualIPSPayout = (futureIPSSaldo * r) / (1 - Math.pow(1 + r, -n_payout));
                } else {
                    annualIPSPayout = futureIPSSaldo / n_payout;
                }
                if (isNaN(annualIPSPayout)) annualIPSPayout = 0;

                // Fripoliser: add directly to annual pension without return or CPI adjustments
                const fripoliserPayout = values.annualFripoliserPayout || 0;
                const flatPension = annualOTPPayout + annualIPSPayout + fripoliserPayout;
                const totalAnnualPension = futureSocialSecurity + flatPension;
                const pensionPercentage = futureSalary > 0 ? (totalAnnualPension / futureSalary) * 100 : 0;
                
                document.getElementById('years-to-retirement').textContent = this.formatNumber(n);
                document.getElementById('future-salary').textContent = this.formatCurrency(futureSalary);
                document.getElementById('annual-otp-saving').textContent = this.formatCurrency(pmt);
                document.getElementById('future-otp-balance').textContent = this.formatCurrency(futureOTPSaldo);
                document.getElementById('annual-otp-payout').textContent = this.formatCurrency(annualOTPPayout);
                document.getElementById('future-social-security').textContent = this.formatCurrency(futureSocialSecurity);
                const annualIpsSavingEl = document.getElementById('annual-ips-saving');
                const futureIpsBalanceEl = document.getElementById('future-ips-balance');
                const annualIpsPayoutEl = document.getElementById('annual-ips-payout');
                if (annualIpsSavingEl) annualIpsSavingEl.textContent = this.formatCurrency(ipsAnnual);
                if (futureIpsBalanceEl) futureIpsBalanceEl.textContent = this.formatCurrency(futureIPSSaldo);
                if (annualIpsPayoutEl) annualIpsPayoutEl.textContent = this.formatCurrency(annualIPSPayout);
                const fripEl = document.getElementById('annual-fripoliser-payout');
                if (fripEl) fripEl.textContent = this.formatCurrency(fripoliserPayout);
                document.getElementById('total-annual-pension').textContent = this.formatCurrency(totalAnnualPension);
                document.getElementById('pension-percentage').textContent = this.formatPercent(pensionPercentage);

                try {
                    const portfolio = (values.currentOTPSaldo || 0) + (values.currentIPSBalance || 0);
                    const saving = (values.ipsAnnualSaving || 0) + pmt;
                    sessionStorage.setItem('pensjonsgapetPortefoljeOgSparing', JSON.stringify({ portfolio, saving }));
                } catch (e) {}

                // Eksporter pensjonsdata til T-konto kontantstrøm-prognose (kun visning i fremtidsgraf)
                try {
                    sessionStorage.setItem('pensjonsgapetTKontoAarligPensjon', JSON.stringify({
                        annualPension: Math.max(0, Math.round(totalAnnualPension)),
                        age: Math.max(0, Number(values.age) || 0),
                        retirementAge: Math.max(0, Number(values.retirementAge) || 0),
                        yearsToRetirement: Math.max(0, Number(n) || 0)
                    }));
                } catch (e) {}

                const desiredAnnualPension = futureSalary * (values.desiredPensionLevel / 100);
                const annualPensionGap = desiredAnnualPension - totalAnnualPension;
                let requiredCapitalAtRetirement = 0;
                let lumpSumToday = 0;
                let annualSavingNeeded = 0;
                const goalMetMessage = document.getElementById('goal-met-message');
                const pensionGapSummary = document.getElementById('pension-gap-summary');
                const goalResults = document.getElementById('goal-results');
                const goalExplainer = document.getElementById('goal-explainer');

                if (annualPensionGap <= 0) {
                    goalMetMessage.classList.remove('hidden');
                    pensionGapSummary.classList.add('hidden');
                    goalResults.classList.add('hidden');
                    goalExplainer.classList.add('hidden');
                    const comboSection = document.getElementById('combo-section');
                    if (comboSection) comboSection.classList.add('hidden');
                } else {
                    goalMetMessage.classList.add('hidden');
                    pensionGapSummary.classList.remove('hidden');
                    goalResults.classList.remove('hidden');
                    goalExplainer.classList.remove('hidden');
                    const percentageGap = values.desiredPensionLevel - pensionPercentage;
                    document.getElementById('pension-gap-details').textContent = `${this.formatPercent(percentageGap)} (${this.formatCurrency(annualPensionGap)} / år)`;
                    requiredCapitalAtRetirement = this.pvInflationAdjustedGap(annualPensionGap, flatPension, g, r, n_payout);
                    lumpSumToday = requiredCapitalAtRetirement / Math.pow(1 + r, n);
                    if (r > 0) {
                        annualSavingNeeded = requiredCapitalAtRetirement / ((Math.pow(1 + r, n) - 1) / r);
                    } else {
                        annualSavingNeeded = requiredCapitalAtRetirement / n;
                    }
                    const monthlySavingNeeded = annualSavingNeeded / 12;
                    document.getElementById('lump-sum-today').textContent = this.formatCurrency(lumpSumToday);
                    document.getElementById('monthly-saving-needed').textContent = this.formatCurrency(monthlySavingNeeded);
                    // expose combo section and save params
                    const comboSection = document.getElementById('combo-section');
                    if (comboSection) {
                        comboSection.classList.remove('hidden');
                        this.lastCalc = { r, n, requiredCapitalAtRetirement };
                        if (this.selectedComboPercent != null) this.updateCombination(this.selectedComboPercent);
                        // Visually select default 100% button if none selected
                        const comboButtons = document.querySelectorAll('.combo-btn');
                        const hasSelected = Array.from(comboButtons).some(b => b.hasAttribute('data-combo-selected'));
                        if (!hasSelected && this.selectedComboPercent === 100) {
                            const btn100 = Array.from(comboButtons).find(b => b.getAttribute('data-percent') === '100');
                            if (btn100) btn100.click();
                        }
                    }
                    // Eksporter data for "Hent alt fra pensjon" – hent oppdaterte verdier fra Kombinasjonsløsning (combo-output)
                    try {
                        if (this.selectedComboPercent != null) this.updateCombination(this.selectedComboPercent);
                        const parseKr = (txt) => {
                            if (!txt) return 0;
                            const s = String(txt).replace(/kr/gi, '').trim();
                            const cleaned = s.replace(/[\s\xa0\u202f]/g, '').replace(',', '.');
                            const num = parseFloat(cleaned);
                            return isNaN(num) ? 0 : Math.round(num);
                        };
                        const lumpEl = document.getElementById('combo-lump-sum');
                        const monthlyEl = document.getElementById('combo-monthly');
                        const engangsinnskudd = lumpEl ? parseKr(lumpEl.textContent) : 0;
                        const manedligSparing = monthlyEl ? parseKr(monthlyEl.textContent) : 0;
                        const aarligSparing = Math.round(manedligSparing * 12);
                        let aksjeandel = 65;
                        const selectedAksjeBtn = document.querySelector('.aksjeandel-btn.choice-btn-selected, .aksjeandel-btn[data-selected="true"]');
                        if (selectedAksjeBtn) {
                            const m = String(selectedAksjeBtn.textContent || '').match(/(\d+)\s*%/);
                            if (m) aksjeandel = parseInt(m[1], 10);
                        } else {
                            const returnToStock = { 5: 0, 5.6: 20, 6.3: 45, 6.7: 55, 7: 65, 7.5: 85, 8: 100 };
                            const expRet = values.expectedReturn;
                            aksjeandel = returnToStock[expRet] !== undefined ? returnToStock[expRet] : 65;
                        }
                        sessionStorage.setItem('pensjonsgapetHentAltFraPension', JSON.stringify({
                            engangsinnskudd,
                            aarligSparing,
                            yearsToRetirement: n,
                            payoutYears: n_payout,
                            bruttoArligUtbetaling: Math.round(annualPensionGap),
                            aksjeandel
                        }));
                    } catch (e) {}
                }

                // Oppdater stablet søylediagram i fanen "Estimerte utbetalinger"
                this.updatePayoutChart({
                    age: values.age,
                    yearsToRetirement: n,
                    cpiRate: g,
                    currentSalary: values.currentSalary,
                    futureSocialSecurity: futureSocialSecurity,
                    annualOTPPayout: annualOTPPayout,
                    annualIPSPayout: annualIPSPayout,
                    fripoliserPayout: fripoliserPayout,
                    payoutYears: n_payout,
                    annualPensionGap: annualPensionGap,
                    flatPension: flatPension,
                    comboPercent: this.selectedComboPercent,
                    totalAnnualPension: totalAnnualPension,
                    pensionPercentage: pensionPercentage,
                    desiredAnnualPension: desiredAnnualPension,
                    desiredPensionLevel: values.desiredPensionLevel
                });

                // Oppdater beholdningsdiagram i fanen "Beholdninger egen sparing"
                this.updateBalanceChart({
                    age: values.age,
                    yearsToRetirement: n,
                    payoutYears: n_payout,
                    r: r,
                    g: g,
                    currentOTPSaldo: pv,
                    otpContribution: pmt,
                    futureOTPSaldo: futureOTPSaldo,
                    annualOTPPayout: annualOTPPayout,
                    currentIPSBalance: ipsPV,
                    ipsAnnual: ipsAnnual,
                    futureIPSSaldo: futureIPSSaldo,
                    annualIPSPayout: annualIPSPayout,
                    requiredCapitalAtRetirement: requiredCapitalAtRetirement,
                    annualPensionGap: annualPensionGap,
                    flatPension: flatPension,
                    comboPercent: this.selectedComboPercent
                });

            }
        };

        // --- INITIALIZE THE APPLICATION ---
        DashboardApp.init();

        // --- DASHBOARD TABS ---
        const dashboardTabButtons = document.querySelectorAll('.dashboard-tabs__btn[data-dashboard-tab]');
        const dashboardTabPanels = document.querySelectorAll('.dashboard-tab[role="tabpanel"]');
        const activateDashboardTab = (panelId) => {
            dashboardTabButtons.forEach((btn) => {
                const isActive = btn.getAttribute('data-dashboard-tab') === panelId;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
                btn.tabIndex = isActive ? 0 : -1;
            });
            dashboardTabPanels.forEach((panel) => {
                const isActive = panel.id === panelId;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            });
            if (panelId === 'dashboardTabUtbetalinger' && DashboardApp.payoutChart) {
                requestAnimationFrame(() => DashboardApp.payoutChart.resize());
            }
            if (panelId === 'dashboardTabBeholdninger' && DashboardApp.balanceChart) {
                requestAnimationFrame(() => DashboardApp.balanceChart.resize());
            }
        };
        dashboardTabButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                activateDashboardTab(btn.getAttribute('data-dashboard-tab'));
            });
            btn.addEventListener('keydown', (e) => {
                const tabs = Array.from(dashboardTabButtons);
                const idx = tabs.indexOf(btn);
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    tabs[(idx + 1) % tabs.length].click();
                    tabs[(idx + 1) % tabs.length].focus();
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    tabs[(idx - 1 + tabs.length) % tabs.length].click();
                    tabs[(idx - 1 + tabs.length) % tabs.length].focus();
                }
            });
        });
        
        // --- COMBO-BOKSER: to sider av samme sak – begge aktiveres/deaktiveres samtidig ---
        const comboOutputBoxes = document.querySelectorAll('.combo-output');
        comboOutputBoxes.forEach((box) => {
            box.addEventListener('click', () => {
                const willActivate = !box.classList.contains('combo-output--active');
                comboOutputBoxes.forEach((b) => b.classList.toggle('combo-output--active', willActivate));
                DashboardApp.calculatePension();
            });
        });

        // --- TOGGLE REFERANSELINJER (faktisk vs. ønsket) ---
        const toggleIntervalBtn = document.getElementById('toggleIntervalBtn');
        if (toggleIntervalBtn) {
            toggleIntervalBtn.addEventListener('click', () => {
                DashboardApp.showReferenceLines = !DashboardApp.showReferenceLines;
                const active = DashboardApp.showReferenceLines;
                toggleIntervalBtn.classList.toggle('is-active', active);
                toggleIntervalBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
                const chart = DashboardApp.payoutChart;
                if (chart) {
                    const n = DashboardApp.payoutCategories.length;
                    [chart.data.datasets[n], chart.data.datasets[n + 1]].forEach((ds) => {
                        if (ds) ds.hidden = !active;
                    });
                    chart.update();
                }
            });
        }

        // --- TOGGLE INPUT VISIBILITY ---
        const toggleInputsBtn = document.getElementById('toggleInputsBtn');
        if (toggleInputsBtn) {
            toggleInputsBtn.addEventListener('click', () => {
                // Toggle OTP Saldo input slider
                const otpContent = document.querySelector('.toggleable-otp-content');
                if (otpContent) {
                    otpContent.classList.toggle('visibility-hidden');
                }
                
                // Toggle all other fields
                const toggleableInputs = document.querySelectorAll('.toggleable-input');
                toggleableInputs.forEach(input => {
                    input.classList.toggle('visibility-hidden');
                });
            });
        }
        
        // --- TOGGLE DETAILED VIEW ---
        const toggleDetailedViewBtn = document.getElementById('toggleDetailedViewBtn');
        const detailedViewContent = document.getElementById('detailedViewContent');
        if (toggleDetailedViewBtn && detailedViewContent) {
            toggleDetailedViewBtn.addEventListener('click', () => {
                detailedViewContent.classList.toggle('visibility-hidden');
            });
        }
        
        // --- TOGGLE PENSION GAP ---
        const togglePensionGapBtn = document.getElementById('togglePensionGapBtn');
        const pensionGapContent = document.getElementById('pensionGapContent');
        if (togglePensionGapBtn && pensionGapContent) {
            togglePensionGapBtn.addEventListener('click', () => {
                pensionGapContent.classList.toggle('visibility-hidden');
            });
        }

        // --- FULLSCREEN ---
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const fullscreenIconEnter = document.getElementById('fullscreenIconEnter');
        const fullscreenIconExit = document.getElementById('fullscreenIconExit');
        if (fullscreenBtn) {
            const isFullscreenActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
            const syncFullscreenUi = () => {
                const isFullscreen = isFullscreenActive();
                fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm');
                fullscreenBtn.setAttribute('title', isFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm');
                if (fullscreenIconEnter) fullscreenIconEnter.classList.toggle('hidden', isFullscreen);
                if (fullscreenIconExit) fullscreenIconExit.classList.toggle('hidden', !isFullscreen);
            };
            fullscreenBtn.addEventListener('click', () => {
                const root = document.documentElement;
                if (!isFullscreenActive()) {
                    const request = root.requestFullscreen || root.webkitRequestFullscreen;
                    if (request) request.call(root).catch(() => {});
                } else {
                    const exit = document.exitFullscreen || document.webkitExitFullscreen;
                    if (exit) exit.call(document);
                }
            });
            document.addEventListener('fullscreenchange', syncFullscreenUi);
            document.addEventListener('webkitfullscreenchange', syncFullscreenUi);
            syncFullscreenUi();
        }
    });


