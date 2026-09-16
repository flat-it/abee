# SMS PIN認証用 Logic App（Aurora SMS版）

`abee-sms-send-pin.json` / `abee-sms-verify-pin.json` は、既存の2本のAzure Logic App
（`abee-sms-send-pin` / `abee-sms-verify-pin`）を、NTT CPaaSからAurora SMS
（`https://a1.auth-db.com/api.php`）に置き換えるためのワークフロー定義です。

## デプロイ手順

各Logic Appについて：

1. Azure Portalで対象のLogic App（Consumption）を開く
2. 左メニューの **開発ツール → コード ビュー（Code view）** を開く
3. このリポジトリの対応するJSONファイルの中身で、既存の定義を丸ごと置き換えて保存
4. 左メニューの **ワークフローの設定 → パラメーター** で `auroraApiKey` に実際のAPIキーを設定して保存
   （**このJSONファイル自体にはAPIキーを書き込まない** — gitにコミットされるため）
5. トリガーURLを確認（Logic App概要画面の「HTTP POSTのURL」）
   - 既存のLogic Appを編集した場合は多くの場合URLは変わらない
   - もしURLが変わった場合は `config.js` の `SMS_SEND_PIN_URL` / `SMS_VERIFY_PIN_URL` を新しいURLに更新すること

## sms_title / sms_text について

- `sms_title`（送信者名表示、半角英数字11文字以内）: 暫定で `ABEE` を設定
- `sms_text`（SMS本文）: `ABEEペットサロンの認証コードは {PIN} です。` の形式でPINを埋め込み

変更したい場合は各JSONの `Sms_Send` アクション内の `sms_title` / `sms_text` を書き換える。

## 送信元電話番号について

Aurora SMSから案内された送信元番号（docomo/au/Rakuten: `05052131017`、Softbank: `243041`）は
キャリア側でどう表示されるかの参考情報として扱い、API呼び出しのパラメータには含めていない。

## success判定について

Aurora SMSのAPIは常にHTTP 200を返し、成否は本文中の `success`（`"1"`=成功 / `"0"`=エラー）で判定する
仕様のため、各HTTPアクションの後に `success` をチェックする条件分岐を入れている。

- `abee-sms-send-pin`: `session.login` または `auth.check` または `sms.send` のいずれかが失敗した場合は
  HTTP 502で `{ pinId: null, error: "...", detail: {...} }` を返す
- `abee-sms-verify-pin`: `session.login` 自体の失敗（設定不備等）はHTTP 502で返すが、
  PIN不一致は正常なユーザー操作結果として扱い、HTTP 200で `{ verified: false, errorCode: ... }` を返す

## auth.checkのレスポンス表記揺れについて

`auth.check` のレスポンスは未認証時 `id`、認証済み時 `auth_id` と表記が揺れる可能性があるため、
`abee-sms-send-pin.json` では `coalesce(auth_id, id)` で両対応している。
