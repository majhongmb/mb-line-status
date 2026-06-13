# 麻雀MB LINE 卓状況ページ

公式LINEから開く、お客さん向けの卓状況確認ページです。

## できること

- `フリー` ボタンで、現在フリーに入れるかを確認
- `セット` ボタンで、セット予約の案内を表示
- 帳簿アプリのSupabaseデータをサーバー側で読み、公開してよい案内文だけを返す
- 顧客名、売上、来店履歴などは表示しない

## ローカル起動

```powershell
npm.cmd install
npm.cmd run dev
```

起動後:

```text
http://localhost:3010
```

同じネットワークのスマホでは、PCのLAN IPを使います。

```text
http://192.168.xxx.xxx:3010
```

## 環境変数

`.env.local` またはVercelのEnvironment Variablesに設定します。

```text
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SHOP_OPEN_MINUTES=720
SHOP_CLOSE_MINUTES=1500
```

営業時間は日本時間の「0時からの分」で指定します。

- `720` = 12:00
- `1500` = 25:00

## フリー判定

API: `/api/status`

- 営業時間外: 営業時間外として案内
- 三麻卓が立っていて、最新半荘がメンバー1入り: `フリー案内できます`
- フリー卓なし: `メンバー2入りで立卓できる場合あり`
- それ以外: `要確認`

## セット判定

初期版では自動判定せず、LINEトークで問い合わせてもらう案内にしています。

後で帳簿アプリ側に公開用フラグを足す場合は、`docs/public_shop_status.sql` のようなテーブルをSupabaseに追加し、このページのAPIで読む形にします。

## 公開方法

おすすめはVercel公開です。

1. このフォルダをGitHubリポジトリに push
2. VercelでGitHubリポジトリをImport
3. Framework Presetは `Next.js`
4. Environment Variablesに上記の値を設定
5. Deploy
6. 公開URLを公式LINEのリッチメニューや応答メッセージに設定

## 安全面

このページは、お客さんに見せる情報を案内文・卓数・更新時刻に絞っています。

SupabaseのキーはVercelのサーバー側APIで使います。ブラウザには帳簿データを直接読ませません。
