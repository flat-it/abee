// ============================================================
// api.js — Logic App API ラッパー
// CONFIG.API_BASE_URL が 'MOCK' の場合はモックデータを返す
// ============================================================

const API = (() => {

  // ── モックデータ ──────────────────────────────────────────
  const _mock = {
    lineUsers: [],
    customers: [
      { id: 'C001', name: '田中 花子', tel: '09012345678' },
    ],
    pets: [
      { id: 'P001', customerId: 'C001', petName: 'ポチ', breed: 'トイプードル' },
      { id: 'P002', customerId: 'C001', petName: 'モモ', breed: 'チワワ' },
    ],
    kartes: [
      { id: 'K001', customerId: 'C001', petId: 'P001', date: '2025-06-15', time: '10:00' },
      { id: 'K002', customerId: 'C001', petId: 'P002', date: '2025-07-01', time: '13:00' },
    ],
    reservedSlots: {},
  };

  // ── ヘルパー ──────────────────────────────────────────────
  const _isMock = () => CONFIG.API_BASE_URL === 'MOCK';

  // Logic App は全て同じURLにPOST、actionをbodyに含める
  const _fetch = async (params) => {
    const res = await fetch(CONFIG.API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  };

  const _delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

  // ── LINE利用者 ─────────────────────────────────────────────

  const findLineUser = async (lineUserId) => {
    if (_isMock()) {
      await _delay();
      const user = _mock.lineUsers.find(u => u.lineUserId === lineUserId);
      return user ? { found: true, customerId: user.customerId } : { found: false };
    }
    return _fetch({ action: 'findLineUser', lineUserId });
  };

  const registerLineUser = async (lineUserId, tel) => {
    if (_isMock()) {
      await _delay(500);
      const customer = _mock.customers.find(c => c.tel === tel);
      if (customer) {
        _mock.lineUsers.push({ lineUserId, tel, customerId: customer.id });
        return { success: true, customerId: customer.id };
      } else {
        _mock.lineUsers.push({ lineUserId, tel, customerId: null, pendingLinkage: true });
        return { success: false, pendingLinkage: true };
      }
    }
    return _fetch({ action: 'registerLineUser', lineUserId, tel });
  };

  // ── ペット ─────────────────────────────────────────────────

  const getPets = async (customerId) => {
    if (_isMock()) {
      await _delay();
      return _mock.pets.filter(p => p.customerId === customerId);
    }
    return _fetch({ action: 'getPets', customerId });
  };

  // ── カルテ（予約）─────────────────────────────────────────

  const getReservations = async (customerId) => {
    if (_isMock()) {
      await _delay();
      const today = new Date().toISOString().slice(0, 10);
      return _mock.kartes
        .filter(k => k.customerId === customerId && k.date >= today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }
    return _fetch({ action: 'getReservations', customerId });
  };

  const getAvailableSlots = async (weekStartDate) => {
    if (_isMock()) {
      await _delay();
      const slots = {};
      const start = new Date(weekStartDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dow = d.getDay();
        if (CONFIG.CLOSED_DAYS && CONFIG.CLOSED_DAYS.includes(dow)) {
          slots[dateStr] = 'closed';
        } else {
          slots[dateStr] = {};
          for (const t of CONFIG.TIME_SLOTS) {
            const key = `${dateStr}_${t}`;
            const count = _mock.reservedSlots[key] || 0;
            slots[dateStr][t] = count < 1;
          }
        }
      }
      return slots;
    }
    // Logic Appからは配列で返ってくるのでオブジェクトに変換
    const result = await _fetch({ action: 'getAvailableSlots', from: weekStartDate });
    // resultは [{ date, status } or { date, '10:00', '13:00', '16:00' }] の配列
    const slots = {};
    for (const item of result) {
      if (item.status === 'closed') {
        slots[item.date] = 'closed';
      } else {
        slots[item.date] = {
          '10:00': item['10:00'],
          '13:00': item['13:00'],
          '16:00': item['16:00'],
        };
      }
    }
    return slots;
  };

  const createReservation = async ({ customerId, petId, date, time, notes }) => {
    if (_isMock()) {
      await _delay(600);
      const id = 'K' + Date.now();
      _mock.kartes.push({ id, customerId, petId, date, time, notes });
      const key = `${date}_${time}`;
      _mock.reservedSlots[key] = (_mock.reservedSlots[key] || 0) + 1;
      return { success: true, karteId: id };
    }
    return _fetch({ action: 'createReservation', customerId, petId, date, time, notes });
  };

  return { findLineUser, registerLineUser, getPets, getReservations, getAvailableSlots, createReservation };
})();
