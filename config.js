// ============================================================
// config.js — 設定ファイル
// ============================================================

const CONFIG = {
  LIFF_ID: '2010455608-5xKvmKL7',

  // Logic App エンドポイント
  API_BASE_URL: 'https://prod-08.japanwest.logic.azure.com:443/workflows/45020ecad453464396fba2ec7e465052/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=B9lrhkwfEK-0ir2kq_mhhg_GpSKBrjsWLOO0La5tVcs',

  // 店舗情報
  SHOP: {
    name: 'ABEE 三鷹店',
    tel: '0422-30-5392',
    address: '〒190-0013 東京都立川市富士見町2-12-9 富士見マンション101',
  },

  // 予約可能な時間帯
  TIME_SLOTS: ['10:00', '13:00', '16:00'],
};
