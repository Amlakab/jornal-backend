"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTradeSummary = void 0;
const buildTradeSummary = (trade) => {
    const parts = [];
    // Sentence 1: Basic Trade Details & Strategy Setup
    const tradeNumStr = trade.tradeNumber !== undefined
        ? `#${trade.tradeNumber.toString().padStart(3, '0')}`
        : 'New Trade';
    const directionStr = trade.direction ? trade.direction.toUpperCase() : 'TRADE';
    const pairStr = trade.pair || 'the asset';
    let dateStr = '';
    if (trade.date) {
        const d = new Date(trade.date);
        if (!isNaN(d.getTime())) {
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();
            dateStr = ` on ${day}/${month}/${year}`;
        }
    }
    const sessionStr = trade.session ? ` during the ${trade.session} session` : '';
    const tfStr = trade.entryTF ? ` on the ${trade.entryTF} entry timeframe` : '';
    const analysisTfStr = trade.analysisTF && trade.analysisTF.length > 0
        ? ` (${trade.analysisTF.join('/')} analysis)`
        : '';
    const stratStr = trade.strategyType ? ` using a ${trade.strategyType} framework` : '';
    const setupStr = trade.setupType ? ` (${trade.setupType} setup)` : '';
    parts.push(`Trade ${tradeNumStr} was a ${directionStr} on ${pairStr} taken${sessionStr}${dateStr}${tfStr}${analysisTfStr}${stratStr}${setupStr}.`);
    // Sentence 2: Market Analysis & Setup
    let contextClause = '';
    if (trade.marketStructure) {
        contextClause = `Market structure was ${trade.marketStructure.toLowerCase()}`;
        if (trade.htfDirection) {
            contextClause += ` with a ${trade.htfDirection.toLowerCase()} HTF bias`;
        }
    }
    else if (trade.htfDirection) {
        contextClause = `HTF bias was ${trade.htfDirection.toLowerCase()}`;
    }
    let entryClause = '';
    if (trade.entryLocation) {
        entryClause = `entry was taken at ${trade.entryLocation.toLowerCase()}`;
    }
    if (trade.liquidityTaken && trade.liquidityTaken.toLowerCase() !== 'no') {
        entryClause = entryClause ? `${entryClause} after a liquidity sweep` : 'entry was taken after a liquidity sweep';
    }
    const confirmationsList = [];
    if (trade.confirmations && trade.confirmations.length > 0) {
        confirmationsList.push(...trade.confirmations.map(c => c.toLowerCase()));
    }
    if (trade.volumeCondition) {
        confirmationsList.push(`${trade.volumeCondition.toLowerCase()} volume`);
    }
    let sentence2 = '';
    if (contextClause && entryClause) {
        sentence2 = `${contextClause}; ${entryClause}`;
    }
    else if (contextClause) {
        sentence2 = contextClause;
    }
    else if (entryClause) {
        sentence2 = entryClause.charAt(0).toUpperCase() + entryClause.slice(1);
    }
    if (confirmationsList.length > 0) {
        const confText = `confirmed by ${confirmationsList.join(', ')}`;
        sentence2 = sentence2 ? `${sentence2}, ${confText}` : confText.charAt(0).toUpperCase() + confText.slice(1);
    }
    if (sentence2) {
        sentence2 = sentence2.trim() + '.';
        parts.push(sentence2);
    }
    // Sentence 3: Risk & Reward in $ and %
    const riskVal = trade.risk?.value !== undefined ? trade.risk.value : 0;
    const riskPct = trade.riskPercent?.value !== undefined ? trade.riskPercent.value : 0;
    const rewardVal = trade.reward?.value !== undefined ? trade.reward.value : 0;
    const rewardPct = trade.rewardPercent?.value !== undefined ? trade.rewardPercent.value : 0;
    const rrVal = trade.rr?.value !== undefined ? trade.rr.value : 0;
    if (riskVal > 0 || rewardVal > 0) {
        const riskStr = riskPct > 0 ? `$${riskVal.toLocaleString()} (${riskPct}%)` : `$${riskVal.toLocaleString()}`;
        const rewardStr = rewardPct > 0 ? `$${rewardVal.toLocaleString()} (${rewardPct}%)` : `$${rewardVal.toLocaleString()}`;
        parts.push(`Risk was ${riskStr} for a ${rewardStr} reward (1:${rrVal}).`);
    }
    // Sentence 4: Outcome & Results
    const outcomeClauses = [];
    if (trade.result) {
        outcomeClauses.push(`closed as a ${trade.result}`);
    }
    if (trade.pnl?.value !== undefined) {
        const sign = trade.pnl.value >= 0 ? '+' : '';
        const pctStr = trade.pnlPercent?.value !== undefined ? ` (${sign}${trade.pnlPercent.value}%)` : '';
        outcomeClauses.push(`with ${sign}$${trade.pnl.value.toLocaleString()}${pctStr} P/L`);
    }
    if (trade.executionQuality) {
        outcomeClauses.push(`execution rated ${trade.executionQuality}`);
    }
    if (trade.exitReason) {
        outcomeClauses.push(`exited at ${trade.exitReason}`);
    }
    if (outcomeClauses.length > 0) {
        parts.push(`The trade ${outcomeClauses.join(', ')}.`);
    }
    // Sentence 5: Psychology & Mindset
    const psych = trade.psychology;
    if (psych) {
        const psychClauses = [];
        if (psych.patient && psych.patient.toLowerCase() === 'yes') {
            psychClauses.push('the trader was patient');
        }
        if (psych.followedPlan) {
            psychClauses.push('followed the plan');
        }
        const avoided = [];
        if (psych.fomo && psych.fomo.toLowerCase() === 'no')
            avoided.push('FOMO');
        if (psych.revenge && psych.revenge.toLowerCase() === 'no')
            avoided.push('revenge trading');
        if (avoided.length > 0) {
            psychClauses.push(`avoided ${avoided.join(' and ')}`);
        }
        if (psych.rating) {
            psychClauses.push(`rated confidence ${psych.rating}/5`);
        }
        if (psychClauses.length > 0) {
            parts.push(`Psychologically, ${psychClauses.join(', ')}.`);
        }
    }
    // Sentence 6: Lesson Learned
    if (trade.lesson && trade.lesson.trim()) {
        parts.push(`Lesson learned: ${trade.lesson.trim()}`);
    }
    return parts.join(' ');
};
exports.buildTradeSummary = buildTradeSummary;
