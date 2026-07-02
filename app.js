// ============================================================
// app.js — メインアプリロジック
// ============================================================

const App = (() => {

  // ── 状態管理 ──────────────────────────────────────────────
  const state = {
    lineUserId: null,
    customerId: null,
    pets: [],
    selectedPetId: null,
    selectedDate: null,
    selectedTime: null,
    currentWeekStart: null,
    availableSlots: {},
    calendarCache: {}, // 週ごとのキャッシュ
  };

  // ── ユーティリティ ────────────────────────────────────────

  const fmt = {
    date: (dateStr) => {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}月${d.getDate()}日`;
    },
    dateWithDay: (dateStr) => {
      const d = new Date(dateStr);
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
    },
    // 週の月曜日を返す
    mondayOf: (date = new Date()) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    },
    toDateStr: (date) => date.toISOString().slice(0, 10),
  };

  // ── 画面切り替え ──────────────────────────────────────────
  const showScreen = (id) => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  };

  const showLoading = (show) => {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
  };

  const showToast = (msg, type = 'info') => {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast toast--${type} show`;
    setTimeout(() => t.classList.remove('show'), 3000);
  };

  // ── LIFF初期化 ────────────────────────────────────────────
  const initLiff = async () => {
    showLoading(true);
    try {
      if (CONFIG.LIFF_ID === 'YOUR_LIFF_ID_HERE') {
        // 開発中：モックユーザーIDを使用
        console.warn('[DEV] LIFF IDが未設定。モードで動作します。');
        state.lineUserId = 'Uf1234567890mock';
      } else {
        await liff.init({ liffId: CONFIG.LIFF_ID, withLoginOnExternalBrowser: true });
        if (!liff.isLoggedIn()) {
          liff.login({ scope: 'profile' });
          return;
        }
        const profile = await liff.getProfile();
        state.lineUserId = profile.userId;
      }
      await checkRegistration();
    } catch (err) {
      console.error('LIFF init error:', err);
      showToast('アプリの起動に失敗しました。再度お試しください。', 'error');
      showLoading(false);
    }
  };

  // ── 登録チェック ──────────────────────────────────────────
  const checkRegistration = async () => {
    try {
      const result = await API.findLineUser(state.lineUserId);
      if (result.found) {
        state.customerId = result.customerId;
        await loadHome();
      } else {
        showLoading(false);
        showScreen('screen-register');
      }
    } catch (err) {
      console.error(err);
      showLoading(false);
      showScreen('screen-register');
    }
  };

  // ── 利用規約チェックボックス ──────────────────────────────
  const onTermsChange = () => {
    const agreed = document.getElementById('terms-agree').checked;
    document.getElementById('btn-terms-next').disabled = !agreed;
  };

  // ── パスワード確認 ────────────────────────────────────────
  const REGISTER_PASSWORD = 'ABEE2026';

  const handlePassword = () => {
    const input = document.getElementById('input-password').value;
    if (input !== REGISTER_PASSWORD) {
      showToast('パスワードが違います。', 'error');
      document.getElementById('input-password').value = '';
      return;
    }
    document.getElementById('input-password').value = '';
    showScreen('screen-register-form');
  };

  // ── 初回登録 ──────────────────────────────────────────────
  const handleRegister = async () => {
    const tel = document.getElementById('input-tel').value.trim().replace(/[-\s]/g, '');
    if (!/^0\d{9,10}$/.test(tel)) {
      showToast('正しい携帯電話番号を入力してください（例：09012345678）', 'error');
      return;
    }
    showLoading(true);
    try {
      const result = await API.registerLineUser(state.lineUserId, tel);
      if (result.success) {
        state.customerId = result.customerId;
        document.getElementById('register-done-title').textContent = '初回登録が完了しました。';
        document.getElementById('register-done-msg').textContent = '次回からはこちらの画面から予約が可能になります。';
        showScreen('screen-register-done');
      } else {
        showToast('ご登録の電話番号が見つかりませんでした。店頭スタッフにご確認ください。', 'error');
      }
    } catch (err) {
      showToast('通信エラーが発生しました。', 'error');
    } finally {
      showLoading(false);
    }
  };

  // ── ホーム画面 ────────────────────────────────────────────
  const loadHome = async () => {
    showLoading(true);
    try {
      const [reservations, pets] = await Promise.all([
        API.getReservations(state.customerId),
        API.getPets(state.customerId),
      ]);
      state.pets = pets;
      renderHome(reservations, pets);
      showScreen('screen-home');
    } catch (err) {
      showToast('データの取得に失敗しました。', 'error');
    } finally {
      showLoading(false);
    }
  };

  const renderHome = (reservations, pets) => {
    const listEl = document.getElementById('reservation-list');
    if (reservations.length === 0) {
      listEl.innerHTML = '<p class="empty-msg">現在のご予約はありません。</p>';
    } else {
      listEl.innerHTML = reservations.map(k => {
        const pet = pets.find(p => p.id === k.petId);
        return `
          <div class="reservation-item">
            <div class="reservation-date">${fmt.date(k.date)} ${k.time}</div>
            <div class="reservation-detail">
              <span class="pet-name">${pet ? pet.petName : '—'}</span>
            </div>
          </div>`;
      }).join('');
    }
  };

  // ── ペット選択（新規予約前） ──────────────────────────────
  const openPetSelect = () => {
    if (state.pets.length === 0) {
      showToast('登録されているペット情報がありません。店舗にお電話ください。', 'error');
      return;
    }
    const sel = document.getElementById('select-pet');
    sel.innerHTML = state.pets.map(p =>
      `<option value="${p.id}">${p.petName}（${p.breed || ''}）</option>`
    ).join('');
    showScreen('screen-pet-select');
  };

  const handlePetSelect = () => {
    const sel = document.getElementById('select-pet');
    state.selectedPetId = sel.value;
    loadCalendar(fmt.mondayOf());
  };

  // ── カレンダー画面 ────────────────────────────────────────
  const loadCalendar = async (monday) => {
    state.currentWeekStart = monday;
    const weekKey = fmt.toDateStr(monday);

    // キャッシュがあればAPIを呼ばずに表示
    if (state.calendarCache[weekKey]) {
      state.availableSlots = state.calendarCache[weekKey];
      renderCalendar();
      showScreen('screen-calendar');
      return;
    }

    showLoading(true);
    try {
      const slots = await API.getAvailableSlots(weekKey);
      state.calendarCache[weekKey] = slots; // キャッシュに保存
      state.availableSlots = slots;
      renderCalendar();
      showScreen('screen-calendar');
    } catch (err) {
      showToast('空き情報の取得に失敗しました: ' + err.message, 'error');
    } finally {
      showLoading(false);
    }
  };

  const renderCalendar = () => {
    const slots = state.availableSlots;
    const dates = Object.keys(slots).sort();

    // 週表示ラベル
    const first = dates[0];
    const last = dates[dates.length - 1];
    document.getElementById('cal-week-label').textContent =
      `${fmt.date(first)} 〜 ${fmt.date(last)}`;

    // テーブルボディ
    const tbody = document.getElementById('cal-tbody');
    tbody.innerHTML = dates.map(date => {
      const daySlots = slots[date];
      if (daySlots === 'closed') {
        return `
          <tr>
            <td class="cal-date">${fmt.dateWithDay(date)}</td>
            <td colspan="${CONFIG.TIME_SLOTS.length}" class="cal-closed">定休日</td>
          </tr>`;
      }
      const today = new Date().toISOString().slice(0, 10);
      const cells = CONFIG.TIME_SLOTS.map(t => {
        if (date < today) return `<td class="cal-full">—</td>`;
        const available = daySlots[t];
        if (available === undefined) return `<td class="cal-unavailable">—</td>`;
        return available
          ? `<td><button class="btn-slot" onclick="App.selectSlot('${date}','${t}')">予約する</button></td>`
          : `<td class="cal-full">×</td>`;
      }).join('');
      return `<tr><td class="cal-date">${fmt.dateWithDay(date)}</td>${cells}</tr>`;
    }).join('');
  };

  const selectSlot = (date, time) => {
    state.selectedDate = date;
    state.selectedTime = time;
    openBookingForm();
  };

  const prevWeek = () => {
    const prev = new Date(state.currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    // 今週より前には戻れない
    if (prev < fmt.mondayOf()) return;
    loadCalendar(prev);
  };

  const nextWeek = () => {
    const next = new Date(state.currentWeekStart);
    next.setDate(next.getDate() + 7);
    loadCalendar(next);
  };

  // ── 予約フォーム ──────────────────────────────────────────
  const openBookingForm = () => {
    const pet = state.pets.find(p => p.id === state.selectedPetId);
    document.getElementById('form-header').textContent =
      `${fmt.date(state.selectedDate)} ${state.selectedTime} のご予約`;
    document.getElementById('form-pet-name').textContent =
      pet ? `${pet.petName}（${pet.breed || ''}）` : '—';

    showScreen('screen-booking');
  };

  const handleBooking = async () => {
    const notes = document.getElementById('input-notes').value.trim();

    showLoading(true);
    try {
      const result = await API.createReservation({
        customerId: state.customerId,
        petId: state.selectedPetId,
        date: state.selectedDate,
        time: state.selectedTime,
        notes,
      });
      if (result.success) {
        // 予約完了後はキャッシュをクリア（最新の空き状況を反映するため）
        state.calendarCache = {};
        document.getElementById('confirm-detail').textContent =
          `${fmt.date(state.selectedDate)} ${state.selectedTime}`;
        showScreen('screen-booking-done');
      } else {
        showToast('予約に失敗しました。', 'error');
      }
    } catch (err) {
      showToast('通信エラーが発生しました。', 'error');
    } finally {
      showLoading(false);
    }
  };

  // ── 公開インターフェース ──────────────────────────────────
  return {
    init: initLiff,
    handleRegister,
    handlePassword,
    onTermsChange,
    handlePetSelect,
    selectSlot,
    prevWeek,
    nextWeek,
    openBookingForm,
    handleBooking,
    openPetSelect,
    loadHome,
  };
})();

// DOM準備完了後に起動
document.addEventListener('DOMContentLoaded', () => App.init());
