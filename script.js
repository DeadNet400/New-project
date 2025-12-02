let currentLangData = {}; // ตัวแปรสำหรับเก็บข้อมูลภาษาปัจจุบัน
let calculationHistory = [];
let interestChart = null; // ตัวแปรสำหรับเก็บ instance ของกราฟ

/**
 * โหลดไฟล์ภาษาแบบ Asynchronously
 * @param {string} lang - ภาษาที่ต้องการ (เช่น 'en', 'th')
 * @returns {Promise<Object>} - ข้อมูลภาษาในรูปแบบ Object
 */
async function fetchLanguageData(lang) {
    const response = await fetch(`${lang}.json`);
    return response.json();
}

/**
 * สลับภาษาของหน้าเว็บ
 * @param {string} lang - ภาษาที่จะเปลี่ยนไป
 */
async function switchLanguage(lang) {
    // 1. โหลดข้อมูลภาษาใหม่
    currentLangData = await fetchLanguageData(lang);

    // 2. ตั้งค่า attribute และบันทึกลง Local Storage
    document.documentElement.lang = lang;
    localStorage.setItem('preferredLanguage', lang);

    // 3. อัปเดตข้อความทั้งหมดในหน้าเว็บ
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.getAttribute('data-lang-key');
        const text = key.split('.').reduce((obj, i) => obj?.[i], currentLangData);

        if (text) {
            // ตรวจสอบว่าเป็น placeholder หรือ innerText/label
            if (el.tagName === 'OPTION') {
                el.textContent = text;
            } else if (el.placeholder !== undefined) {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        }
    });

    // 4. อัปเดตสถานะ Active ของปุ่มภาษา
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.lang-switcher button[data-lang="${lang}"]`).classList.add('active');

    // 5. อัปเดตข้อความในส่วนที่อาจจะถูกสร้างแบบไดนามิก (เช่น ผลลัพธ์)
    updatePercentageInputs(); // อัปเดต placeholder ของเครื่องคิดเลขเปอร์เซ็นต์

    // 6. Re-render history with the new language
    renderHistory();
}

/**
 * โหลดภาษาที่ผู้ใช้เคยเลือกไว้ หรือใช้ภาษาอังกฤษเป็นค่าเริ่มต้น
 */
async function loadPreferredLanguage() {
    const preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';
    await switchLanguage(preferredLanguage);
}

// --- History Logic ---
const MAX_HISTORY_ITEMS = 15;

function renderHistory() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    // Use a temporary history copy to avoid modifying the original objects
    const historyToRender = JSON.parse(JSON.stringify(calculationHistory));

    historyToRender.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.innerHTML = `
            <span class="expression">${item.expression}</span>
            <span class="result">= ${item.result}</span>
        `;
        historyList.appendChild(li);
    });
}

function addToHistory(expressionKey, result, valuesForExpr) {
    // Add new item to the beginning of the array
    calculationHistory.unshift({ expressionKey, result, valuesForExpr });

    // Keep the history list to a maximum size
    if (calculationHistory.length > MAX_HISTORY_ITEMS) {
        calculationHistory.pop();
    }

    renderHistory();
    localStorage.setItem('mathHistory', JSON.stringify(calculationHistory));
}

function loadHistory() {
    const savedHistory = localStorage.getItem('mathHistory');
    if (savedHistory) {
        calculationHistory = JSON.parse(savedHistory);
        renderHistory();
    }
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            calculationHistory = [];
            renderHistory();
            localStorage.removeItem('mathHistory');
        });
    }
}

// --- Refactored Calculator Logic ---

function createStatInputRow(isFirst = false) {
    const row = document.createElement('div');
    row.classList.add('stat-input-row');

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.dataset.input = 'number';
    row.appendChild(numberInput);

    if (!isFirst) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('btn-remove-row');
        removeButton.innerHTML = '&times;';
        removeButton.dataset.action = 'remove-stat-input';
        row.appendChild(removeButton);
    }

    return row;
}

function addStatInput(button) {
    const container = button.closest('.calculator-section')?.querySelector('.stats-inputs-container');
    if (container) {
        container.appendChild(createStatInputRow());
    }
}

function resetStatInputs(section) {
    const container = section.querySelector('.stats-inputs-container');
    if (container) {
        container.innerHTML = '';
        container.appendChild(createStatInputRow(true));
        container.appendChild(createStatInputRow());
    }
}

function createBasicInputRow(isFirst = false) {
    const row = document.createElement('div');
    row.classList.add('basic-input-row');

    if (!isFirst) {
        const operatorSelect = document.createElement('select');
        operatorSelect.dataset.input = 'operation';
        operatorSelect.innerHTML = `
            <option value="add">+</option>
            <option value="subtract">-</option>
            <option value="multiply">*</option>
            <option value="divide">/</option>
        `;
        row.appendChild(operatorSelect);
    }

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.dataset.input = 'number';
    numberInput.placeholder = isFirst ? (currentLangData?.basic_arithmetic?.num1_placeholder || 'Enter first number') : (currentLangData?.basic_arithmetic?.num2_placeholder || 'Enter next number');
    row.appendChild(numberInput);

    if (!isFirst) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.classList.add('btn-remove-row');
        removeButton.innerHTML = '&times;'; // HTML entity for '×'
        removeButton.dataset.action = 'remove-basic-input';
        row.appendChild(removeButton);
    }

    return row;
}

function addBasicInput() {
    const container = document.getElementById('basic-inputs-container');
    if (container) {
        container.appendChild(createBasicInputRow());
    }
}

function resetBasicInputs() {
    const container = document.getElementById('basic-inputs-container');
    if (container) {
        container.innerHTML = '';
        container.appendChild(createBasicInputRow(true)); // First input
        container.appendChild(createBasicInputRow());    // Second input
    }
}

const calculatorRegistry = {
    'basic-arithmetic': {
        // This calculator is now handled by a special case in handleCalculation
        calculate: (values) => {
            let total = values.numbers[0];
            for (let i = 0; i < values.operators.length; i++) {
                const num = values.numbers[i + 1];
                const op = values.operators[i];
                if (op === 'add') total += num;
                else if (op === 'subtract') total -= num;
                else if (op === 'multiply') total *= num;
                else if (op === 'divide') total /= num;
            }
            return total;
        },
        format: (val) => typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 10 }) : val,
    },
    'circle': {
        inputs: ['radius', 'operation', 'area', 'circumference'],
        calculate: ({ radius, operation, area, circumference }) => {
            switch (operation) {
                case 'area': return Math.PI * Math.pow(radius, 2);
                case 'circumference': return 2 * Math.PI * radius;
                case 'diameter': return 2 * radius;
                case 'radius_from_area': return Math.sqrt(area / Math.PI);
                case 'radius_from_circumference': return circumference / (2 * Math.PI);
                default: return NaN;
            }
        },
    },
    'rectangle': {
        inputs: ['width', 'height', 'operation', 'area'],
        calculate: ({ width, height, operation, area }) => {
            switch (operation) {
                case 'area': return width * height;
                case 'perimeter': return 2 * (width + height);
                case 'width': return area / height;
                case 'height': return area / width;
                default: return NaN;
            }
        },
    },
    'triangle': {
        inputs: ['base', 'height', 'operation', 'area'],
        calculate: ({ base, height, operation, area }) => {
            switch (operation) {
                case 'area': return 0.5 * base * height;
                case 'height': return (2 * area) / base;
                case 'base': return (2 * area) / height;
                default: return NaN;
            }
        }
    },
    'pentagon': {
        inputs: ['side'],
        calculate: ({ side }) => (0.25) * Math.sqrt(5 * (5 + 2 * Math.sqrt(5))) * Math.pow(side, 2),
    },
    'cube': {
        inputs: ['side', 'operation', 'volume'],
        calculate: ({ side, operation, volume }) => {
            switch (operation) {
                case 'volume': return Math.pow(side, 3);
                case 'side': return Math.cbrt(volume);
                default: return NaN;
            }
        },
    },
    'sphere': {
        inputs: ['radius', 'operation', 'volume'],
        calculate: ({ radius, operation, volume }) => {
            switch (operation) {
                case 'volume': return (4 / 3) * Math.PI * Math.pow(radius, 3);
                case 'radius': return Math.cbrt((3 * volume) / (4 * Math.PI));
                default: return NaN;
            }
        },
    },
    'cylinder': {
        inputs: ['radius', 'height'],
        calculate: ({ radius, height }) => Math.PI * Math.pow(radius, 2) * height,
    },
    'bmi': {
        inputs: ['weight', 'height'],
        calculate: ({ weight, height }) => {
            const heightInMeters = height / 100;
            const bmi = weight / Math.pow(heightInMeters, 2);
            let interpretation = '';
            if (bmi < 18.5) interpretation = currentLangData.bmi.interp_underweight;
            else if (bmi < 23) interpretation = currentLangData.bmi.interp_normal;
            else if (bmi < 25) interpretation = currentLangData.bmi.interp_overweight;
            else if (bmi < 30) interpretation = currentLangData.bmi.interp_obese1;
            else interpretation = currentLangData.bmi.interp_obese2;
            return { result: bmi, interpretation: interpretation };
        },
        format: {
            result: (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            interpretation: (val) => val,
        }
    },
    'percentage': {
        inputs: ['val1', 'val2', 'operation'],
        calculate: ({ val1, val2, operation }) => {
            if (operation === 'percent_of') return { result: (val1 / 100) * val2 };
            if (operation === 'what_percent') return { result: `${((val1 / val2) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} %` };
            if (operation === 'discount') {
                const savedAmount = (val2 / 100) * val1;
                const discountedPrice = val1 - savedAmount;
                return {
                    result: currentLangData.percentage.result_discount.replace('{val2}', val2),
                    'discount-summary': true, // Flag to show the summary
                    'discounted-price': discountedPrice,
                    'saved-amount': savedAmount,
                };
            }
        },
        format: {
            result: (val) => typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : val,
            'discounted-price': (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            'saved-amount': (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        }
    },
    'interest': {
        inputs: ['operation', 'principal', 'rate', 'time', 'time_unit', 'compounding_frequency'],
        calculate: ({ operation, principal, rate, time, time_unit, compounding_frequency }) => {
            const timeInYears = time_unit === 'months' ? time / 12 : time;
            const interestRate = rate / 100;
            let totalAmount = 0;

            if (operation === 'simple') {
                totalAmount = principal * (1 + interestRate * timeInYears);
            } else if (operation === 'compound') {
                const n = parseInt(compounding_frequency, 10); // จำนวนครั้งที่ทบต้นต่อปี
                const t = timeInYears;
                totalAmount = principal * Math.pow(1 + (interestRate / n), n * t);

                // --- สร้างข้อมูลสำหรับกราฟ ---
                const graphLabels = [];
                const graphData = [];
                const periods = Math.floor(t); // คำนวณตามจำนวนปีเต็ม
                for (let i = 0; i <= periods; i++) {
                    graphLabels.push(`${currentLangData.common.year_prefix || 'Year'} ${i}`);
                    const amountAtYearI = principal * Math.pow(1 + (interestRate / n), n * i);
                    graphData.push(amountAtYearI);
                }
                // เพิ่มจุดสุดท้ายเพื่อให้กราฟไปถึงเวลาที่แน่นอน
                if (t > periods) {
                    graphLabels.push(`${currentLangData.common.year_prefix || 'Year'} ${t.toFixed(2)}`);
                    graphData.push(totalAmount);
                }
                renderInterestGraph(graphLabels, graphData);
            }

            const totalInterest = totalAmount - principal;

            if (isNaN(totalAmount)) {
                return { total_interest: 0, total_amount: 0 };
            } else {
                return {
                    total_interest: totalInterest,
                    total_amount: totalAmount
                };
            }
        },
        format: {
            total_interest: (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total_amount: (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        }
    },
    'loan': {
        inputs: ['amount', 'rate', 'term'],
        calculate: ({ amount, rate, term }) => {
            const principal = amount;
            const monthlyInterestRate = (rate / 100) / 12;
            const numberOfPayments = term * 12;

            if (monthlyInterestRate === 0) { // กรณีไม่มีดอกเบี้ย
                const monthlyPayment = principal / numberOfPayments;
                return {
                    monthly_payment: monthlyPayment,
                    total_payment: principal,
                    total_interest: 0
                };
            }

            const monthlyPayment = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
            const totalPayment = monthlyPayment * numberOfPayments;
            const totalInterest = totalPayment - principal;

            return {
                monthly_payment: monthlyPayment,
                total_payment: totalPayment,
                total_interest: totalInterest
            };
        },
        format: {
            monthly_payment: (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total_payment: (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            total_interest: (val) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        }
    },
    'mean': {
        // This calculator is handled by a special case in handleCalculation
        calculate: (nums) => {
            if (nums.length === 0) return NaN;
            const sum = nums.reduce((acc, val) => acc + val, 0);
            return sum / nums.length;
        },
        format: (val) => isNaN(val) ? (currentLangData.statistics.error_no_numbers || 'Please enter numbers.') : val.toLocaleString(undefined, { maximumFractionDigits: 5 })
    },
    'median': {
        // This calculator is handled by a special case in handleCalculation
        calculate: (nums) => {
            // Sort the numbers
            nums.sort((a, b) => a - b);
            if (nums.length === 0) return NaN;
            
            const mid = Math.floor(nums.length / 2);
            if (nums.length % 2 !== 0) {
                return nums[mid]; // จำนวนคี่
            } else {
                return (nums[mid - 1] + nums[mid]) / 2; // จำนวนคู่
            }
        },
        format: (val) => isNaN(val) ? (currentLangData.statistics.error_no_numbers || 'Please enter numbers.') : val.toLocaleString()
    },
    'mode': {
        // This calculator is handled by a special case in handleCalculation
        calculate: (nums) => {
            if (nums.length === 0) return NaN;

            const frequency = {};
            let maxFreq = 0;
            
            nums.forEach(num => {
                frequency[num] = (frequency[num] || 0) + 1;
                if (frequency[num] > maxFreq) {
                    maxFreq = frequency[num];
                }
            });

            if (maxFreq === 1) { // ทุกตัวมีความถี่เท่ากัน (คือ 1)
                return currentLangData.statistics.no_mode_found || 'No mode found';
            }

            const modes = Object.keys(frequency).filter(num => frequency[num] === maxFreq);
            
            // ตรวจสอบกรณีที่ทุกตัวมีความถี่เท่ากันแต่ไม่ใช่ 1
            if (modes.length === Object.keys(frequency).length) {
                 return currentLangData.statistics.no_mode_found || 'No mode found';
            }

            return modes.map(m => parseFloat(m));
        },
        format: (val) => {
            if (isNaN(val) && typeof val !== 'string') return (currentLangData.statistics.error_no_numbers || 'Please enter numbers.');
            if (Array.isArray(val)) return val.join(', ');
            return val;
        }
    },
    'standard-deviation': {
        // This calculator is handled by a special case in handleCalculation
        calculate: (nums) => {
            if (nums.length < 2) return NaN; // SD requires at least 2 numbers

            // 1. Find the mean
            const mean = nums.reduce((acc, val) => acc + val, 0) / nums.length;

            // 2. Find the variance (the average of the squared differences from the Mean)
            const variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / nums.length;

            // 3. Find the standard deviation (square root of variance)
            return Math.sqrt(variance);
        },
        format: (val) => isNaN(val) ? (currentLangData.statistics.error_at_least_two || 'Please enter at least two numbers.') : val.toLocaleString(undefined, { maximumFractionDigits: 5 })
    },
};

function handleCalculation(button) {
    const section = button.closest('.calculator-section');
    const calculatorId = section.dataset.calculator;
    const config = calculatorRegistry[calculatorId];

    if (calculatorId === 'basic-arithmetic' && config) {
        const numbers = Array.from(section.querySelectorAll('[data-input="number"]')).map(el => parseFloat(el.value));
        const operators = Array.from(section.querySelectorAll('[data-input="operation"]')).map(el => el.value);

        if (numbers.some(isNaN)) {
            section.querySelector('[data-output="result"]').textContent = currentLangData.common.error_nan;
            return;
        }

        const result = config.calculate({ numbers, operators });
        section.querySelector('[data-output="result"]').textContent = config.format(result);
        // Add to history for basic arithmetic
        const expression = numbers.map((n, i) => (i > 0 ? ` ${ { add: '+', subtract: '-', multiply: '×', divide: '÷' }[operators[i-1]] || ''} ${n}` : n)).join('');
        addToHistory(expression, config.format(result));
        return;
    }

    const isStatCalculator = ['mean', 'median', 'mode', 'standard-deviation'].includes(calculatorId) && config;

    if (isStatCalculator) {
        const numbers = Array.from(section.querySelectorAll('[data-input="number"]'))
            .map(el => el.value)
            .filter(val => val.trim() !== '') // Filter out empty strings
            .map(parseFloat);

        if (numbers.some(isNaN)) {
            section.querySelector('[data-output="result"]').textContent = currentLangData.common.error_nan;
            return;
        }
        const result = config.calculate(numbers);
        section.querySelector('[data-output="result"]').textContent = config.format(result);
        // Optional: Add to history
        const expression = `${currentLangData.nav[calculatorId] || calculatorId} (${numbers.length})`;
        addToHistory(expression, config.format(result));
        return;
    }

    const values = {};
    let hasNaN = false;

    if (!config || !config.inputs) return; // Guard clause

    for (const inputName of config.inputs) {
        const inputEl = section.querySelector(`[data-input="${inputName}"]`);
        const isNumeric = inputEl?.type === 'number';
        values[inputName] = isNumeric ? parseFloat(inputEl?.value) : (inputEl?.value || '');

        if (isNumeric && isNaN(values[inputName])) {
            hasNaN = true;
        }
    }

    const resultSpan = section.querySelector('[data-output="result"]');
    if (hasNaN) {
        resultSpan.textContent = currentLangData.common.error_nan;
        return;
    }

    const result = config.calculate(values);

    // --- Add to History ---
    let expression = '';
    const titleKey = `nav.${calculatorId}`;
    expression = currentLangData.nav[calculatorId] || calculatorId;
    const resultForHistory = (typeof result === 'object' ? result.result : result);
    if (typeof resultForHistory !== 'object' && !isNaN(resultForHistory)) {
        addToHistory(expression, (config.format?.result || config.format || ((val) => val.toLocaleString()))(resultForHistory), null);
    }

    // Display results
    if (typeof result === 'object') {
        for (const key in result) {
            const outputEl = section.querySelector(`[data-output="${key}"]`);
            if (outputEl) {
                const formatter = config.format?.[key] || ((val) => val);
                outputEl.textContent = formatter(result[key]);
                if (key.includes('summary')) { // Handle visibility for summaries
                    outputEl.style.display = result[key] ? 'flex' : 'none';
                }
            }
        }
    } else {
        const formatter = config.format || ((val) => val.toLocaleString(undefined, { maximumFractionDigits: 4 }));
        resultSpan.textContent = formatter(result);
    }
}

function clearInputs(button) {
    const section = button.closest('.calculator-section');
    if (section.id === 'basic-arithmetic') {
        resetBasicInputs();
        section.querySelector('[data-output="result"]').textContent = '';
        return;
    }
    if (section.querySelector('.stats-inputs-container')) {
        resetStatInputs(section);
        section.querySelector('[data-output="result"]').textContent = '';
        return;
    }
    section.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.tagName === 'SELECT') {
            // ไม่ต้องรีเซ็ต select เพราะบางทีมีค่า default ที่ต้องการ
            // el.selectedIndex = 0;
        } else {
            el.value = '';
        }
    });
    section.querySelectorAll('[data-output]').forEach(el => {
        el.textContent = '';
        if (el.dataset.output.includes('summary')) {
            el.style.display = 'none';
        }
    });
    // ซ่อนและทำลายกราฟ
    const chartContainer = section.querySelector('.chart-container');
    if (chartContainer) chartContainer.style.display = 'none';
    // ตรวจสอบว่า interestChart เป็น instance ของ Chart จริงๆ ก่อนทำลาย
    // และ section ที่กำลังเคลียร์คือ interest-calculator
    if (interestChart && section.id === 'interest-calculator') {
        interestChart.destroy();
        interestChart = null;
    }
}

function showCalculator(id, element) {
    // ซ่อนทุก section
    document.querySelectorAll('.calculator-section').forEach(section => {
        section.style.display = 'none';
    });
    const sectionToShow = document.getElementById(id);
    if (sectionToShow) sectionToShow.style.display = 'block';

    // If showing basic calculator, ensure it's initialized
    if (id === 'basic-arithmetic') {
        resetBasicInputs();
    }

    // If showing a stat calculator, ensure it's initialized
    if (sectionToShow && sectionToShow.querySelector('.stats-inputs-container')) {
        resetStatInputs(document.getElementById(id));
    }

    // จัดการ active class ของปุ่ม nav
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
    
    // ถ้าเป็นเมนูย่อย ให้ active ที่เมนูหลักด้วย
    const parentSubMenu = element.closest('.submenu');
    if (parentSubMenu) {
        parentSubMenu.previousElementSibling.classList.add('active');
    }
}

function toggleSubMenu(button) {
    const submenu = button.nextElementSibling;
    const isOpen = submenu.style.display === 'block';
    if (isOpen) {
        button.classList.remove('open');
    } else {
        submenu.style.display = 'block'; // Or 'flex' if needed
        button.classList.add('open');
    }
}

function updateCalculatorInputs(selectElement) {
    const section = selectElement.closest('.calculator-section');
    const selectedMode = selectElement.value;

    // ซ่อนทุก element ที่มี data-mode
    section.querySelectorAll('[data-mode]').forEach(group => {
        group.style.display = 'none';
    });

    // แสดง element ที่เกี่ยวข้องกับ mode ที่เลือก
    section.querySelectorAll(`[data-mode*="${selectedMode}"]`).forEach(element => {
        // ใช้ 'flex' สำหรับ .input-group และ 'block' สำหรับอย่างอื่น (เช่น chart-container)
        element.style.display = element.classList.contains('input-group') ? 'flex' : 'block';
    });
}

/**
 * วาดหรืออัปเดตกราฟดอกเบี้ยทบต้น
 * @param {string[]} labels - ป้ายกำกับแกน X (เช่น ['Year 0', 'Year 1', ...])
 * @param {number[]} data - ข้อมูลยอดเงินรวมสำหรับแต่ละช่วงเวลา
 */
function renderInterestGraph(labels, data) {
    const chartContainer = document.querySelector('#interest-calculator .chart-container');
    if (!chartContainer) return;
    
    chartContainer.style.display = 'block'; // แสดงพื้นที่กราฟ
    const ctx = document.getElementById('interest-chart').getContext('2d');

    // ทำลายกราฟเก่าทิ้งถ้ามีอยู่
    if (interestChart) {
        interestChart.destroy();
    }

    // สร้างกราฟใหม่
    interestChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentLangData.interest.total_amount_label || 'Total Amount',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false, // เริ่มแกน Y จากค่าที่ใกล้เคียงที่สุด
                    ticks: {
                        callback: function(value) { return value.toLocaleString(); }
                    }
                }
            }
        }
    });
}

function updatePercentageInputs() {
    const section = document.getElementById('percentage');
    if (!section) return; // Exit if not on the calculator page
    const operation = section.querySelector('[data-input="operation"]')?.value;
    const val1Input = section.querySelector('[data-input="val1"]');
    const val2Input = section.querySelector('[data-input="val2"]');

    // ตรวจสอบว่า currentLangData พร้อมใช้งานหรือไม่
    if (!currentLangData || !currentLangData.percentage) return;

    // ใช้ข้อมูลจากไฟล์ภาษาเพื่อตั้งค่า placeholder
    if (operation === 'percent_of') {
        val1Input.placeholder = currentLangData.percentage.placeholder_x_percent;
        val2Input.placeholder = currentLangData.percentage.placeholder_y_total;
    } else if (operation === 'what_percent') {
        val1Input.placeholder = currentLangData.percentage.placeholder_x_part;
        val2Input.placeholder = currentLangData.percentage.placeholder_y_total;
    } else if (operation === 'discount') {
        val1Input.placeholder = currentLangData.percentage.placeholder_full_price;
        val2Input.placeholder = currentLangData.percentage.placeholder_discount_percent;
    }
    // ล้างค่าเมื่อเปลี่ยนโหมด
    clearInputs(val1Input);
}

function runConversion(type) {
    // 1. กำหนด ID ของ elements ตามประเภทของการแปลงหน่วย
    const inputId = `${type}-conv-input`;
    const fromUnitId = `${type}-conv-from`;
    const toUnitId = `${type}-conv-to`;
    const resultId = `${type}-conv-result`;

    // 2. ดึงค่าจาก HTML elements
    const inputValue = parseFloat(document.getElementById(inputId).value);
    const fromUnit = document.getElementById(fromUnitId).value;
    const toUnit = document.getElementById(toUnitId).value;
    const resultSpan = document.getElementById(resultId);

    // 3. ถ้ายังไม่มีการใส่ค่า ให้ล้างผลลัพธ์
    if (isNaN(inputValue)) {
        resultSpan.textContent = '';
        return;
    }
    
    // 4. กำหนดค่าแฟกเตอร์การแปลงหน่วย โดยใช้หน่วยพื้นฐานเป็นตัวกลาง
    let conversionFactors;
    let baseUnit; // หน่วยพื้นฐานสำหรับการคำนวณ

    if (type === 'length') {
        baseUnit = 'm'; // หน่วยพื้นฐานคือ เมตร
        conversionFactors = {
            'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000, // Metric
            'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mi': 1609.34 // Imperial
        };
    } else if (type === 'area') {
        baseUnit = 'sqm'; // หน่วยพื้นฐานคือ ตารางเมตร
        conversionFactors = {
            'sqm': 1,
            'sqkm': 1000000,
            'sqft': 0.092903,
            'acre': 4046.86
        };
    } else if (type === 'volume') {
        baseUnit = 'l'; // หน่วยพื้นฐานคือ ลิตร
        conversionFactors = {
            'ml': 0.001,
            'l': 1,
            'gal': 3.78541 // US Gallon
        };
    } else {
        return; // ไม่ทำอะไรถ้า type ไม่ตรง
    }

    // 5. คำนวณผลลัพธ์
    // แปลงค่าที่ใส่เข้ามาให้เป็นหน่วยพื้นฐานก่อน
    const valueInBaseUnit = inputValue * conversionFactors[fromUnit];
    // จากนั้นแปลงจากหน่วยพื้นฐานไปยังหน่วยที่ต้องการ
    const result = valueInBaseUnit / conversionFactors[toUnit];

    // 6. แสดงผลลัพธ์ (ปัดเศษทศนิยม 6 ตำแหน่งเพื่อความแม่นยำ)
    resultSpan.textContent = result.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/**
 * คัดลอกข้อความจาก element ไปยังคลิปบอร์ด
 * @param {HTMLElement} buttonElement - ปุ่มที่ถูกกด
 * @param {string} elementId - ID ของ element ที่มีข้อความผลลัพธ์
 */
function copyResult(buttonElement, elementId) {
    // หาจาก element ที่ใกล้ที่สุด แทนการใช้ ID แบบ global
    const section = buttonElement.closest('.calculator-section');
    const resultSpan = section.querySelector(`[data-output="${elementId}"]`);
    const textToCopy = resultSpan?.textContent;

    if (!textToCopy) return; // ไม่ทำอะไรถ้าไม่มีข้อความ

    navigator.clipboard.writeText(textToCopy).then(() => {
        // สำเร็จ: แสดงสถานะ "คัดลอกแล้ว!"
        const originalContent = buttonElement.innerHTML;
        buttonElement.innerHTML = `<span style="font-size: 0.8em;">${currentLangData.common.copied}</span>`;
        buttonElement.disabled = true;

        // เปลี่ยนกลับเป็นไอคอนเดิมหลังจาก 1.5 วินาที
        setTimeout(() => {
            buttonElement.innerHTML = originalContent;
            buttonElement.disabled = false;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function copyConversionResult(buttonElement) {
    const targetId = buttonElement.dataset.outputTarget;
    const resultSpan = document.getElementById(targetId);
    const textToCopy = resultSpan?.textContent;

    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalContent = buttonElement.innerHTML;
        buttonElement.innerHTML = `<span style="font-size: 0.8em;">${currentLangData.common.copied}</span>`;
        buttonElement.disabled = true;

        setTimeout(() => {
            buttonElement.innerHTML = originalContent;
            buttonElement.disabled = false;
        }, 1500);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}


// --- Dark Mode Logic ---
const darkModeToggle = document.getElementById('dark-mode-toggle');

function enableDarkMode() {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    darkModeToggle.textContent = '☀️'; // Change icon to sun
}

function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
    darkModeToggle.textContent = '🌙'; // Change icon to moon
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

// --- Event Listener Setup ---
function initEventListeners() {
    // Language and Theme
    document.querySelectorAll('[data-action="switch-lang"]').forEach(button => {
        button.addEventListener('click', () => switchLanguage(button.dataset.lang));
    });
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.contains('dark-mode') ? disableDarkMode() : enableDarkMode();
    });

    // Navigation
    document.querySelectorAll('[data-action="show-calculator"]').forEach(button => {
        button.addEventListener('click', (e) => showCalculator(e.currentTarget.dataset.calculatorId, e.currentTarget));
    });
    document.querySelectorAll('[data-action="toggle-submenu"]').forEach(button => {
        button.addEventListener('click', (e) => toggleSubMenu(e.currentTarget));
    });

    // Calculator Actions
    document.querySelectorAll('[data-action="calculate"]').forEach(button => {
        button.addEventListener('click', (e) => handleCalculation(e.currentTarget));
    });
    document.querySelectorAll('[data-action="clear"]').forEach(button => {
        button.addEventListener('click', (e) => clearInputs(e.currentTarget));
    });

    // Dynamic Input Actions
    document.querySelector('[data-action="add-basic-input"]')?.addEventListener('click', addBasicInput);
    document.querySelectorAll('[data-action="add-stat-input"]').forEach(button => {
        button.addEventListener('click', (e) => addStatInput(e.currentTarget));
    });
    document.querySelectorAll('[data-action="update-inputs"]').forEach(select => {
        select.addEventListener('change', (e) => updateCalculatorInputs(e.currentTarget));
    });
    document.querySelector('[data-action="update-percentage-inputs"]')?.addEventListener('change', updatePercentageInputs);

    // Unit Converters
    document.querySelectorAll('[data-action="convert"]').forEach(el => {
        el.addEventListener('change', (e) => runConversion(e.currentTarget.dataset.convType));
        el.addEventListener('keyup', (e) => runConversion(e.currentTarget.dataset.convType));
    });

    // Copy Actions
    document.querySelectorAll('[data-action="copy"]').forEach(button => {
        button.addEventListener('click', (e) => copyResult(e.currentTarget, e.currentTarget.dataset.outputTarget));
    });
    document.querySelectorAll('[data-action="copy-conv"]').forEach(button => {
        button.addEventListener('click', (e) => copyConversionResult(e.currentTarget));
    });

    // Event delegation for dynamically added remove buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'remove-basic-input') {
            e.target.closest('.basic-input-row')?.remove();
        }
        if (e.target.dataset.action === 'remove-stat-input') {
            e.target.closest('.stat-input-row')?.remove();
        }
    });
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadPreferredLanguage().then(() => {
        // Ensure language is loaded before initializing calculators that depend on it
        showCalculator('basic-arithmetic', document.querySelector('[data-calculator-id="basic-arithmetic"]'));
    });
    loadTheme();
    loadHistory();
});