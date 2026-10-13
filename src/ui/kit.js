// Sayfalarda kullanılan küçük HTML yapı taşları
import { S } from '../state.js';
import { clamp } from '../utils.js';

export const item = ({ ic, t, s = '', ac = '', extra = '', col = false, dim = false }) =>
  `<div class="item${col ? ' col' : ''}${dim ? ' dim' : ''}">${ic ? `<div class="ic">${ic}</div>` : ''}<div class="bd"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}${extra}</div>${ac ? `<div class="ac">${ac}</div>` : ''}</div>`;
export const btn = (act, arg, label, cls = '', disabled = false) => `<button class="btn sm ${cls}" data-act="${act}"${arg != null ? ` data-arg="${arg}"` : ''}${disabled ? ' disabled' : ''}>${label}</button>`;
export const buy = (act, arg, label, cost, cls = 'primary') => btn(act, arg, label, cls, S.money < cost);
export const meter = (v, cls = '') => `<div class="meter ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
export const stats = arr => `<div class="stats">${arr.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
