// ============================================================
// api.js — Logic App API ラッパー
// ============================================================

const API = (() => {

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

  const _isMock = () => CONFIG.API_BASE_URL === 'MOCK';
  const _isSmsMock = () => !CONFIG.SMS_SEND_PIN_URL || CONFIG.SMS_SEND_PIN_URL === 'MOCK';

  const _post = async (url, params) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API Error: ${res.status} ${text}`);
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`JSON Parse Error: ${text.slice(0, 100)}`);
    }
  };

  const _fetch = (params) => _post(CONFIG.API_BASE_URL, params);

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

  const registerLineUser = async (lineUserId, tel, displayName) => {
    if (_isMock()) {
      await _delay(500);
      const customer = _mock.customers.find(c => c.tel === tel);
      if (customer) {
        _mock.lineUsers.push({ lineUserId, tel, customerId: customer.id });
        return { success: true, customerId: customer.id };
      } else {
        return { success: false, notFound: true };
      }
    }
    return _fetch({ action: 'registerLineUser', lineUserId, tel, displayName });
  };

  // ── SMS PIN認証 ───────────────────────────────────────────

  const sendPin = async (tel) => {
    if (_isSmsMock()) {
      await _delay(400);
      console.warn('[DEV] SMS_SEND_PIN_URLが未設定。モックPIN(0000)で動作します。');
      return { pinId: 'MOCK' + Date.now() };
    }
    return _post(CONFIG.SMS_SEND_PIN_URL, { tel });
  };

  const verifyPin = async (pinId, pin) => {
    if (_isSmsMock()) {
      await _delay(400);
      return { verified: pin === '0000' };
    }
    return _post(CONFIG.SMS_VERIFY_PIN_URL, { pinId, pin });
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
        const y2 = d.getFullYear(), m2 = String(d.getMonth()+1).padStart(2,'0'), dd2 = String(d.getDate()).padStart(2,'0');
        const dateStr = `${y2}-${m2}-${dd2}`;
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

    // Logic Appからカレンダーとカルテの生データを受け取る
    // ※ Logic App の $select に cr984_finishtime を含めること
    const result = await _fetch({ action: 'getAvailableSlots', from: weekStartDate });

    // 予約済み範囲を日付ごとに管理（開始〜終了時刻）
    const reservationRanges = {};
    for (const k of (result.kartes || [])) {
      const dateStr = k.cra25_day ? k.cra25_day.slice(0, 10) : null;
      const startTime = k.cra25_time;
      const endTime = k.cr984_finishtime;
      if (dateStr && startTime) {
        if (!reservationRanges[dateStr]) reservationRanges[dateStr] = [];
        reservationRanges[dateStr].push({ start: startTime, end: endTime });
      }
    }

    // 指定時刻が予約範囲に含まれるか判定
    // 開始時刻 <= 対象時刻 < 終了時刻 であれば予約あり
    // 例: 14:00〜17:00 の予約があれば 16:00 は予約あり、13:00 は空き
    const isBooked = (dateStr, slotTime) => {
      const ranges = reservationRanges[dateStr] || [];
      return ranges.some(r => {
        if (r.end) return r.start <= slotTime && slotTime < r.end;
        return r.start === slotTime; // 終了時刻なしは開始一致にフォールバック
      });
    };

    // 定休日をSetで管理
    const closedDates = new Set();
    for (const c of (result.calendar || [])) {
      if (c.cra25_holiday) {
        const dateStr = c.cra25_date ? c.cra25_date.slice(0, 10) : null;
        if (dateStr) closedDates.add(dateStr);
      }
    }

    // ローカル日付文字列を返すヘルパー
    const toLocalDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // 7日分のスロットを生成
    const slots = {};
    const start = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = toLocalDate(d);
      if (closedDates.has(dateStr)) {
        slots[dateStr] = 'closed';
      } else {
        slots[dateStr] = {};
        for (const t of CONFIG.TIME_SLOTS) {
          slots[dateStr][t] = !isBooked(dateStr, t);
        }
      }
    }

    // 予約可能上限日をスロットに付加して返す
    slots.maxBookableDate = result.maxBookableDate || null;

    return slots;
  };

  const createReservation = async ({ customerId, petId, date, time, notes, message }) => {
    if (_isMock()) {
      await _delay(600);
      const id = 'K' + Date.now();
      _mock.kartes.push({ id, customerId, petId, date, time, notes });
      const key = `${date}_${time}`;
      _mock.reservedSlots[key] = (_mock.reservedSlots[key] || 0) + 1;
      return { success: true, karteId: id };
    }
    return _fetch({ action: 'createReservation', customerId, petId, date, time, notes, message });
  };

  const cancelReservation = async (karteId, reason) => {
    if (_isMock()) {
      await _delay(500);
      const k = _mock.kartes.find(k => k.id === karteId);
      if (k) { k.cancelled = true; k.cancelReason = reason; }
      return { success: true };
    }
    return _fetch({ action: 'cancelReservation', karteId, cancelReason: reason });
  };

  return { findLineUser, registerLineUser, sendPin, verifyPin, getPets, getReservations, getAvailableSlots, createReservation, cancelReservation };
})();
