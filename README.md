# ABEE三鷹店 LIFFアプリ

ペットサロンABEE三鷹店のLINE予約システム（LIFF）です。

## ファイル構成

```
liff-app/
├── index.html   # 全画面（初回登録〜予約完了）
├── style.css    # スタイル
├── config.js    # LIFF IDとAPI設定 ← 最初に編集
├── api.js       # LosicappsAPIラッパー（モック内蔵）
├── app.js       # 画面ロジック
└── README.md
```

---

## セットアップ手順

### 1. GitHubリポジトリを作成

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/abee-liff.git
git push -u origin main
```

### 2. GitHub Pagesを有効化

1. リポジトリの **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)`
4. **Save** → 数分後に `https://YOUR_USERNAME.github.io/abee-liff/` が公開される

### 3. LINE DevelopersでLIFFアプリを登録

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダー → チャネル（Messaging API または LINE Login）
3. **LIFF** タブ → 「追加」
4. 設定値：
   - **LIFF URL**: `https://YOUR_USERNAME.github.io/abee-liff/`
   - **サイズ**: Full
   - **Scope**: `profile`
5. 発行された **LIFF ID** をコピー

### 4. LIFF IDを設定する

`config.js` を開いて以下を変更：

```js
LIFF_ID: 'YOUR_LIFF_ID_HERE',  // ← 発行されたLIFF IDに変更
```

あわせて `index.html` のLIFF SDKコメントを外す：

```html
<!-- この行のコメントを外す -->
<script src="https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js"></script>

<!-- この行は削除またはコメントアウト（liffスタブは不要になる） -->
<script>
  if (typeof liff === 'undefined') { ... }  // ← 削除
</script>
```

---

## Losicapps APIへの差し替え

`config.js` の `API_BASE_URL` を `'MOCK'` から実際のエンドポイントに変更：

```js
API_BASE_URL: 'https://api.losicapps.com/v1/your-endpoint',
```

`api.js` の各関数は `_isMock()` が `false` になると自動的に実APIを呼び出します。

### 必要なAPIエンドポイント一覧

| メソッド | パス | 用途 |
|---------|------|------|
| GET | `/line-users/:lineUserId` | LINE利用者の登録チェック |
| POST | `/line-users` | 初回登録（電話番号紐付け） |
| GET | `/pets?customerId=` | ペット一覧取得 |
| GET | `/kartes?customerId=&from=today` | 予約一覧取得 |
| GET | `/available-slots?from=YYYY-MM-DD` | 週の空き状況取得 |
| POST | `/kartes` | 予約登録 |
| GET | `/menus` | メニュー一覧取得 |

### レスポンス形式（例）

**GET /line-users/:id**
```json
{ "found": true, "customerId": "C001" }
```

**POST /line-users**
```json
// Request
{ "lineUserId": "Uf...", "tel": "09012345678" }
// Response（成功）
{ "success": true, "customerId": "C001" }
// Response（未登録）
{ "success": false, "message": "登録されている電話番号が見つかりませんでした。" }
```

**GET /available-slots?from=2025-06-09**
```json
{
  "2025-06-09": { "10:00": true, "13:00": false, "16:00": true },
  "2025-06-10": "closed",
  "2025-06-11": { "10:00": true, "13:00": true, "16:00": false }
}
```

---

## 定休日・時間帯の変更

`config.js` の以下を変更：

```js
TIME_SLOTS: ['10:00', '13:00', '16:00'],  // 予約可能時間
CLOSED_DAYS: [0, 4],                       // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
```

---

## テスト（ローカル）

```bash
npx serve .
# または
python3 -m http.server 3000
```

ブラウザで `http://localhost:3000` を開く。  
LIFF IDが未設定の場合はモックモードで動作します（コンソールに警告表示）。
