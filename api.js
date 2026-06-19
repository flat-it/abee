// ============================================================
// api.js — Losicapps API ラッパー
// CONFIG.API_BASE_URL が 'MOCK' の場合はモックデータを返す
// 実URLに差し替えると本番APIを呼び出す
// ============================================================

const API = (() => {

  // ── モックデータ ──────────────────────────────────────────
  const _mock = {
    // C_AB_LINE利用テーブル（電話番号 → LINE利用者の紐付け）
    lineUsers: [
      // { lineUserId, tel, customerId }
    ],

    // C_AB_顧客テーブル（簡易）
    customers: [
      { id: 'C001', name: '田中 花子', tel: '09012345678' },
    ],

    // C_AB_ペットテーブル
    pets: [
      { id: 'P001', customerId: 'C001', petName: 'ポチ', breed: 'トイプードル' },
      { id: 'P002', customerId: 'C001', petName: 'モモ', breed: 'チワワ' },
    ],

    // C_AB_カルテテーブル（予約情報）
    kartes: [
      {
        id: 'K001', customerId: 'C001', petId: 'P001',
        date: '2025-06-15', time: '10:00', menu: 'シャンプーカット',
        status: 'confirmed',
      },
      {
        id: 'K002', customerId: 'C001', petId: 'P002',
        date: '2025-07-01', time: '13:00', menu: 'シャンプーのみ',
        status: 'confirmed',
      },
    ],

    // C_AB_メニューテーブル
    menus: [
      { id: 'M001', name: 'シャンプーカット', price: '¥6,000〜' },
      { id: 'M002', name: 'シャンプーのみ',   price: '¥3,500〜' },
      { id: 'M003', name: 'カットのみ',       price: '¥4,000〜' },
      { id: 'M004', name: 'トリミング（フルコース）', price: '¥8,000〜' },
    ],

    // 予約済みスロット（日付+時間 → 予約数）
    reservedSlots: {
      // 'YYYY-MM-DD_HH:MM': count
    },
  };

  // ── ヘルパー ──────────────────────────────────────────────
  const _isMock = () => CONFIG.API_BASE_URL === 'MOCK';

  const _fetch = async (path, options = {}) => {
    const url = `${CONFIG.API_BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${path}`);
    return res.json();
  };

  const _delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

  // ── LINE利用者 ─────────────────────────────────────────────

  /**
   * LINE利用者を電話番号で検索
   * @param {string} lineUserId
   * @returns {{ found: boolean, customerId?: string }}
   */
  const findLineUser = async (lineUserId) => {
    if (_isMock()) {
      await _delay();
      const user = _mock.lineUsers.find(u => u.lineUserId === lineUserId);
      return user ? { found: true, customerId: user.customerId } : { found: false };
    }
    return _fetch(`/line-users/${lineUserId}`);
  };

  /**
   * 初回登録：電話番号でC_AB_顧客を検索しC_AB_LINE利用に登録
   * @param {string} lineUserId
   * @param {string} tel
   * @returns {{ success: boolean, customerId?: string, message?: string }}
   */
  const registerLineUser = async (lineUserId, tel) => {
    if (_isMock()) {
      await _delay(500);
      const customer = _mock.customers.find(c => c.tel === tel);
      if (customer) {
        // 顧客テーブルに電話番号あり → 正常に紐付け
        _mock.lineUsers.push({ lineUserId, tel, customerId: customer.id });
        return { success: true, customerId: customer.id };
      } else {
        // 電話番号がテーブルにない → LINE利用テーブルへの登録のみ（店頭で紐付け）
        _mock.lineUsers.push({ lineUserId, tel, customerId: null, pendingLinkage: true });
        return { success: false, pendingLinkage: true };
      }
    }
    return _fetch('/line-users', {
      method: 'POST',
      body: JSON.stringify({ lineUserId, tel }),
    });
  };

  // ── ペット ─────────────────────────────────────────────────

  /**
   * 顧客IDでペット一覧を取得
   * @param {string} customerId
   * @returns {Array<{ id, petName, breed }>}
   */
  const getPets = async (customerId) => {
    if (_isMock()) {
      await _delay();
      return _mock.pets.filter(p => p.customerId === customerId);
    }
    return _fetch(`/pets?customerId=${customerId}`);
  };

  // ── カルテ（予約）─────────────────────────────────────────

  /**
   * 顧客の予約一覧を取得（今日以降）
   * @param {string} customerId
   * @returns {Array<karte>}
   */
  const getReservations = async (customerId) => {
    if (_isMock()) {
      await _delay();
      const today = new Date().toISOString().slice(0, 10);
      return _mock.kartes
        .filter(k => k.customerId === customerId && k.date >= today)
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }
    return _fetch(`/kartes?customerId=${customerId}&from=today`);
  };

  /**
   * 指定週の予約可能スロットを取得
   * @param {string} weekStartDate  'YYYY-MM-DD'（月曜日）
   * @returns {Object} { 'YYYY-MM-DD': { 'HH:MM': available(bool) } }
   */
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
        if (CONFIG.CLOSED_DAYS.includes(dow)) {
          slots[dateStr] = 'closed';
        } else {
          slots[dateStr] = {};
          for (const t of CONFIG.TIME_SLOTS) {
            const key = `${dateStr}_${t}`;
            const count = _mock.reservedSlots[key] || 0;
            slots[dateStr][t] = count < 2; // 2枠まで予約可能
          }
        }
      }
      return slots;
    }
    return _fetch(`/available-slots?from=${weekStartDate}`);
  };

  /**
   * 予約を登録（C_AB_カルテに作成）
   * @param {Object} params
   * @returns {{ success: boolean, karteId?: string }}
   */
  const createReservation = async ({ customerId, petId, date, time, menu, notes }) => {
    if (_isMock()) {
      await _delay(600);
      const id = 'K' + Date.now();
      _mock.kartes.push({ id, customerId, petId, date, time, menu, notes, status: 'confirmed' });
      const key = `${date}_${time}`;
      _mock.reservedSlots[key] = (_mock.reservedSlots[key] || 0) + 1;
      return { success: true, karteId: id };
    }
    return _fetch('/kartes', {
      method: 'POST',
      body: JSON.stringify({ customerId, petId, date, time, menu, notes }),
    });
  };

  // ── メニュー ───────────────────────────────────────────────

  const getMenus = async () => {
    if (_isMock()) {
      await _delay();
      return _mock.menus;
    }
    return _fetch('/menus');
  };

  return { findLineUser, registerLineUser, getPets, getReservations, getAvailableSlots, createReservation, getMenus };
})();
