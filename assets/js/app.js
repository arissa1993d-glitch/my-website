// Chicken Hub calculators
(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);

  const navButtons = document.querySelectorAll('.nav-btn');
  const toolCards = document.querySelectorAll('.tool-card');

  // แท็บเมนู: แสดงเฉพาะ tool ที่เลือก
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      navButtons.forEach(b => b.classList.toggle('active', b === btn));
      toolCards.forEach(card => {
        card.classList.toggle('active', card.id === 'tool-' + target);
      });
      const card = document.getElementById('tool-' + target);
      if(card){
        card.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  const formatNumber = (n, digits=2) => {
    if(!isFinite(n)) return '-';
    return n.toLocaleString('th-TH',{
      minimumFractionDigits:digits,
      maximumFractionDigits:digits
    });
  };

  const formatInt = (n) => {
    if(!isFinite(n)) return '-';
    return Math.round(n).toLocaleString('th-TH');
  };

  const showError = (el, msg) => {
    el.innerHTML = '<p class="result-main">' + msg + '</p>';
  };

  // reset buttons
  document.querySelectorAll('button[data-reset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-reset');
      const form = document.getElementById(key + '-form');
      const result = document.getElementById(key + '-result');
      if(form) form.reset();
      if(result){
        const ph = result.querySelector('.placeholder');
        if(ph){
          result.innerHTML = '<p class="placeholder">' + ph.textContent + '</p>';
        }
      }
    });
  });

  /* ========== 1) Loan ========== */
  const loanForm = $('loan-form');
  const loanResult = $('loan-result');

  loanForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat($('loan-amount').value);
    const rateYear = parseFloat($('loan-rate').value);
    const years = parseFloat($('loan-years').value);
    const monthsExtra = parseFloat($('loan-months-extra').value) || 0;

    if(!amount || amount <= 0 || !rateYear && rateYear !== 0 || !years || years <= 0){
      showError(loanResult, 'กรุณากรอกวงเงินกู้ ดอกเบี้ยต่อปี และระยะเวลาผ่อนให้ครบ');
      return;
    }

    const months = years * 12 + monthsExtra;
    if(months <= 0){
      showError(loanResult, 'จำนวนเดือนต้องมากกว่า 0');
      return;
    }

    const r = rateYear / 100 / 12;
    let payment;
    if(r === 0){
      payment = amount / months;
    }else{
      payment = (amount * r) / (1 - Math.pow(1 + r, -months));
    }

    const totalPay = payment * months;
    const interest = totalPay - amount;

    let stressText = '';
    const approxIncome = payment * 3; // assume 1/3 income rule
    stressText = 'ค่างวดนี้เหมาะกับรายได้สุทธิราวๆ ' + formatInt(approxIncome) + ' บาทขึ้นไป/เดือน';

    loanResult.innerHTML = `
      <div class="result-main">
        คุณจะผ่อนเดือนละ
        <span class="result-highlight">${formatInt(payment)} บาท/เดือน</span>
      </div>
      <div class="result-sub">
        ผ่อนทั้งหมดประมาณ ${Math.round(months)} งวด · วงเงินกู้ ${formatInt(amount)} บาท · ดอกเบี้ยเฉลี่ยต่อปี ${formatNumber(rateYear,2)}%
      </div>
      <div class="result-grid">
        <div>ยอดชำระรวมทั้งสัญญา ~ <strong>${formatInt(totalPay)} บาท</strong></div>
        <div>ดอกเบี้ยรวมโดยประมาณ ~ <strong>${formatInt(interest)} บาท</strong></div>
        <div>${stressText}</div>
      </div>
    `;
  });

  /* ========== 2) Salary ========== */
  const salaryForm = $('salary-form');
  const salaryResult = $('salary-result');

  function calcThaiTax(yearIncome){
    if(!yearIncome || yearIncome <= 150000) return 0; // 150,000 แรกยกเว้น
    let taxable = yearIncome - 150000;
    let tax = 0;
    const brackets = [
      { limit: 300000, rate: 0.05 },
      { limit: 500000, rate: 0.10 },
      { limit: 750000, rate: 0.15 },
      { limit: 1000000, rate: 0.20 },
      { limit: 2000000, rate: 0.25 },
      { limit: 5000000, rate: 0.30 },
      { limit: Infinity, rate: 0.35 }
    ];
    let prev = 150000;
    for(const b of brackets){
      if(taxable <= 0) break;
      const span = Math.min(taxable, b.limit - prev);
      if(span > 0){
        tax += span * b.rate;
        taxable -= span;
        prev = b.limit;
      }
    }
    return Math.max(tax, 0);
  }

  salaryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const gross = parseFloat($('salary-gross').value);
    const ssoMode = $('salary-sso').value;

    if(!gross || gross <= 0){
      showError(salaryResult, 'กรุณากรอกเงินเดือนให้ถูกต้อง');
      return;
    }

    let sso = 0;
    if(ssoMode === 'auto'){
      sso = gross * 0.05;
      if(sso > 750) sso = 750;
    }

    const yearIncomeAfterSSO = (gross - sso) * 12;
    const taxYear = calcThaiTax(yearIncomeAfterSSO);
    const taxMonth = taxYear / 12;
    const netMonth = gross - sso - taxMonth;

    let feel = '';
    const taxRateApprox = (taxMonth * 12) / (gross * 12 - sso * 12 || 1);
    if(taxRateApprox < 0.05) feel = 'ภาษียังไม่เยอะมากเมื่อเทียบกับรายได้';
    else if(taxRateApprox < 0.15) feel = 'ภาษีอยู่ในระดับปานกลาง';
    else feel = 'ภาษีเริ่มสูง ลองวางแผนลดหย่อนเพิ่มได้';

    salaryResult.innerHTML = `
      <div class="result-main">
        เงินเข้ากระเป๋าประมาณ
        <span class="result-highlight">${formatInt(netMonth)} บาท/เดือน</span>
      </div>
      <div class="result-sub">
        คิดจากเงินเดือน ${formatInt(gross)} บาท/เดือน · ประกันสังคมประมาณ ${formatInt(sso)} บาท/เดือน
      </div>
      <div class="result-grid">
        <div>ภาษีต่อเดือน (ประมาณ): <strong>${formatInt(taxMonth)} บาท</strong></div>
        <div>รายได้สุทธิทั้งปี (ประมาณ): <strong>${formatInt(netMonth * 12)} บาท</strong></div>
        <div>${feel}</div>
      </div>
    `;
  });

  /* ========== 3) Saving ========== */
  const savingForm = $('saving-form');
  const savingResult = $('saving-result');

  savingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const P = parseFloat($('saving-principal').value) || 0;
    const PMT = parseFloat($('saving-monthly').value) || 0;
    const rYear = parseFloat($('saving-rate').value);
    const years = parseFloat($('saving-years').value);

    if((!P && !PMT) || (!rYear && rYear !== 0) || !years || years <= 0){
      showError(savingResult, 'กรุณากรอกเงินต้น/เงินออม ดอกเบี้ยต่อปี และระยะเวลาออมให้ครบ');
      return;
    }

    const n = years * 12;
    const r = rYear / 100 / 12;

    let futurePrincipal = P;
    let futurePMT = 0;

    if(r === 0){
      futurePrincipal = P;
      futurePMT = PMT * n;
    }else{
      futurePrincipal = P * Math.pow(1 + r, n);
      futurePMT = PMT * ((Math.pow(1 + r, n) - 1) / r);
    }

    const totalFuture = futurePrincipal + futurePMT;
    const totalDeposit = P + PMT * n;
    const interestGain = totalFuture - totalDeposit;

    savingResult.innerHTML = `
      <div class="result-main">
        ถ้าออมตามแผน คุณจะมีเงินประมาณ
        <span class="result-highlight">${formatInt(totalFuture)} บาท</span>
      </div>
      <div class="result-sub">
        ออมต่อเนื่อง ${years} ปี · อัตราดอกเบี้ยเฉลี่ย ${formatNumber(rYear || 0,2)}% ต่อปี
      </div>
      <div class="result-grid">
        <div>เงินที่ฝากจริงทั้งหมด: <strong>${formatInt(totalDeposit)} บาท</strong></div>
        <div>ดอกเบี้ยที่ได้รับโดยประมาณ: <strong>${formatInt(interestGain)} บาท</strong></div>
      </div>
    `;
  });

  /* ========== 4) Health (BMI/BMR) ========== */
  const healthForm = $('health-form');
  const healthResult = $('health-result');

  function bmiCategory(bmi){
    if(bmi < 18.5) return 'น้ำหนักน้อย / ผอม';
    if(bmi < 23) return 'น้ำหนักปกติ';
    if(bmi < 27.5) return 'น้ำหนักเกิน';
    return 'อ้วน';
  }

  healthForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const gender = $('health-gender').value;
    const age = parseFloat($('health-age').value);
    const height = parseFloat($('health-height').value);
    const weight = parseFloat($('health-weight').value);
    const activity = parseFloat($('health-activity').value);

    if(!age || !height || !weight){
      showError(healthResult, 'กรุณากรอกอายุ ส่วนสูง และน้ำหนักให้ครบ');
      return;
    }

    const bmi = weight / Math.pow(height / 100, 2);
    const bmiCat = bmiCategory(bmi);

    let bmr;
    if(gender === 'male'){
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    }else{
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    const tdee = bmr * activity;

    healthResult.innerHTML = `
      <div class="result-main">
        BMI ของคุณคือ <span class="result-highlight">${formatNumber(bmi,1)}</span>
        <span class="${bmiCat === 'น้ำหนักปกติ' ? 'good-chip' : 'bad-chip'}">${bmiCat}</span>
      </div>
      <div class="result-sub">
        ตัวเลขนี้เป็นการประเมินคร่าว ๆ หากต้องการข้อมูลด้านสุขภาพเชิงลึกควรปรึกษาแพทย์
      </div>
      <div class="result-grid">
        <div>ค่า BMR (พลังงานพื้นฐาน): <strong>${formatInt(bmr)} kcal/วัน</strong></div>
        <div>พลังงานที่ใช้ต่อวันโดยประมาณ (TDEE): <strong>${formatInt(tdee)} kcal/วัน</strong></div>
      </div>
    `;
  });

  /* ========== 5) Split bill ========== */
  const splitForm = $('split-form');
  const splitResult = $('split-result');

  splitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const total = parseFloat($('split-total').value);
    const people = parseInt($('split-people').value, 10);
    const tipPercent = parseFloat($('split-tip').value) || 0;
    const roundMode = $('split-round').value;

    if(!total || total <= 0 || !people || people <= 0){
      showError(splitResult, 'กรุณากรอกยอดบิลและจำนวนคนให้ถูกต้อง');
      return;
    }

    const tipAmount = total * (tipPercent / 100);
    const grandTotal = total + tipAmount;
    let perPerson = grandTotal / people;
    let rounded = perPerson;

    if(roundMode !== 'none'){
      const step = parseInt(roundMode, 10);
      rounded = Math.ceil(perPerson / step) * step;
    }

    splitResult.innerHTML = `
      <div class="result-main">
        แต่ละคนควรจ่ายประมาณ
        <span class="result-highlight">${formatInt(rounded)} บาท</span>
      </div>
      <div class="result-sub">
        ใช้หารบิลแบบง่าย ๆ เพื่อคุยกับเพื่อนได้ตรงกัน
      </div>
      <div class="result-grid">
        <div>ยอดบิลก่อนทิป: <strong>${formatInt(total)} บาท</strong></div>
        <div>ทิป (${formatNumber(tipPercent,1)}%): <strong>${formatInt(tipAmount)} บาท</strong></div>
        <div>ยอดรวมทั้งหมด: <strong>${formatInt(grandTotal)} บาท</strong></div>
        <div>จำนวนคนหาร: <strong>${people} คน</strong></div>
      </div>
    `;
  });

  /* ========== 6) Discount ========== */
  const discountForm = $('discount-form');
  const discountResult = $('discount-result');

  discountForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const original = parseFloat($('discount-original').value);
    const rate = parseFloat($('discount-rate').value);

    if(!original || original <= 0 || isNaN(rate)){
      showError(discountResult, 'กรุณากรอกราคาปกติและเปอร์เซ็นส่วนลดให้ถูกต้อง');
      return;
    }

    const discountAmount = original * (rate / 100);
    const finalPrice = original - discountAmount;

    discountResult.innerHTML = `
      <div class="result-main">
        ราคาหลังลดคือ
        <span class="result-highlight">${formatNumber(finalPrice,2)} บาท</span>
      </div>
      <div class="result-sub">
        ลดไปทั้งหมด ${formatNumber(discountAmount,2)} บาท จากราคาปกติ ${formatNumber(original,2)} บาท
      </div>
    `;
  });

})();
