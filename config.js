// ============================================================
// config.js — 設定ファイル
// ============================================================

const CONFIG = {
  LIFF_ID: '2010455608-5xKvmKL7',

  // Logic App エンドポイント（予約・顧客データ全般）
  API_BASE_URL: 'https://prod-24.japanwest.logic.azure.com:443/workflows/f06773ad1b2b423da6c1a507786909e5/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=731W-oP9nHnBbt7Owt3efyqSu5of7ibXCdfDuTVogKU',

  // SMS認証用エンドポイント（NTT CPaaS中継Logic App）
  SMS_SEND_PIN_URL: 'https://prod-24.japanwest.logic.azure.com:443/workflows/1ef07a6748a948f884970914dbf96f23/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OPvPIgOxubw3xXkQwVZIjjaDtc0i7hLg9clCIMTKC14',
  SMS_VERIFY_PIN_URL: 'https://prod-18.japanwest.logic.azure.com:443/workflows/a68beaf3bcab4a539c38e7a9e90cac03/triggers/manual/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=pceQzebO1bQxh3-8agzrs_zmLpWcPUQ5brM93wN96Ns',

  // 店舗情報
  SHOP: {
    name: 'ABEE 三鷹店',
    tel: '0422-30-5392',
    address: '〒181-0014 東京都三鷹市野崎2-8-1 クラウンビル104',
  },

  // 予約可能な時間帯
  TIME_SLOTS: ['10:00', '13:00', '16:00'],
};
