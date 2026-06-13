# 公開チェックリスト

## Codex側で済ませること

- [x] `package-lock.json` 作成
- [x] TypeScriptチェック
- [x] `/api/status` 動作確認
- [x] 本番公開用README整理
- [x] Next.jsを `16.2.9` へ更新

## ユーザー側で必要なこと

- [ ] GitHubに新規リポジトリを作る
- [ ] このフォルダをGitHubへpushする
- [ ] VercelでGitHubリポジトリをImportする
- [ ] Vercelに環境変数を設定する
- [ ] 公式LINEに公開URLを設定する

## Vercel環境変数

```text
SUPABASE_URL=https://jyirwhnsjhisygegnmrl.supabase.co
SUPABASE_ANON_KEY=...
SHOP_OPEN_MINUTES=720
SHOP_CLOSE_MINUTES=1500
```

`SUPABASE_ANON_KEY` は `.env.local` と同じ値を使えます。

## 公開後テスト

- [ ] スマホで公開URLを開ける
- [ ] `フリー` ボタンで結果オーバーレイが出る
- [ ] `セット` ボタンで結果オーバーレイが出る
- [ ] 営業時間外の表示が想定どおり
- [ ] 公式LINEのリッチメニュー/メッセージから開ける
