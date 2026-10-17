# URL・QRコードで公開する手順（Render無料枠）

現状：公開用コードを準備済み。Renderへのデプロイ、実API接続、スマートフォンでの確認、公開URLのQRコード化はまだです。
画面・問題・ブラウザ保存の仕組みは変更していません。

## 1. GitHubへ反映

このフォルダの server.cjs、package.json、test-public.cjs、DEPLOY.md、README.md、.gitignore を、既存のapp.jsなどと同じ場所にアップロードします。
まだ統合版をGitHubに反映していなければ、index.html、style.css、app.js、engine.js、test.cjs、preview.pngもアップロードします。
APIキー、.env、desktop.ini、ZIPはアップロードしません。
相手の新しい変更がある場合は、新しいブランチで差分を確認してから取り込みます。

## 2. Renderへログイン

https://dashboard.render.com/ を開き、GitHubでログインします。
New → Web Service を選び、kangfiu/memoを接続します。
GitHubのアクセス許可が求められたら、このリポジトリだけを選択できます。

## 3. 作成画面の設定

- Name：wakaranai（使用済みの場合は任意の別名）
- Language / Runtime：Node
- Branch：公開用コードを取り込んだブランチ
- Root Directory：GitHubでserver.cjsがあるフォルダ。リポジトリ直下なら空欄、wakaranaiフォルダ内ならwakaranai。
- Build Command：npm test
- Start Command：npm start
- Instance Type：Free
- Health Check Path（項目がある場合）：/healthz

Environment Variablesに次を追加します。

| 名前 | 値 |
| --- | --- |
| GROQ_API_KEY | 自分のGroq APIキー本体。Renderの入力欄だけに貼ります。 |
| AI_DAILY_LIMIT | 100 |

Node.jsはpackage.jsonで24系を指定しています。依存ライブラリの追加はありません。
RenderのRENDER_EXTERNAL_URLとPORTを自動で利用するので、PUBLIC_ORIGINやPORTを手入力する必要はありません。
Freeを確認してDeploy Web Serviceを押します。有料プランへは変更しません。
無料枠でもアカウント確認などでカードの登録を要求された場合は、その画面で止めて別の方法を相談してください。

## 4. URLで確認

Liveになったら、Renderに表示された https://...onrender.com のURLを開きます。
通常モードで「生徒としてはじめる」を選び、宿題を解きます。
最初の問題を間違えた場合、分析の数式・数値問題を進め、最後の理由を文章で回答します。
例：両辺に同じ操作をしても、左右が等しい関係は保たれるから。
「デモを見る」は固定ルールなので実API接続の確認にはなりません。
エラー時は回答が残ります。原因を解決して再送してください。

スマホではWi-Fiを切ったモバイル回線からも同じURLを開き、画面表示・自由記述送信を確認します。
端末が違えば保存される宿題・記録も別です。現在は別端末の先生との記録共有はありません。
架空の回答のみを使い、個人情報を入力しない体験にしてください。

## 5. QRコード

公開URLが確定してから、そのURLをQRコードにします。
公開URLをチャットに送れば、そのURL用のQRコード画像を作成できます。APIキーは送らないでください。
127.0.0.1やRenderの管理画面のURLはQRコードにしません。

## 上限と制約

AI呼び出しはサーバー全体で同時2件、1分20件、直近24時間100件まで（失敗したAPI呼び出しも含む）。
100件の値はAI_DAILY_LIMITで変更できます。Groq側の制限にも従います。
これはサーバーのメモリ上の簡易制限で、休止・再起動・再デプロイでリセットされます。厳密な課金上限・認証・不正利用防止を保証するものではありません。
不特定多数への大規模公開ではなく、ハッカソンの小規模体験を想定しています。
APIを止める場合はRenderでサービスを停止するか、GROQ_API_KEYを削除して再デプロイします。

Render無料枠は15分アクセスがないと休止し、次のアクセス時の再開に約1分かかります。
発表前に一度URLを開いてください。無料枠の月間上限にも従います。
公開先のサーバーが動くので、自分のパソコンのPowerShellを開いておく必要はありません。

## テスト

npm test

既存227項目と公開向け31項目を確認済み。実際のGroq APIへは通信しないテストです。
公開HTTPS環境とスマホでの実動作は、デプロイ後に確認します。

公式情報（2026-10-17確認）：
- https://render.com/docs/web-services
- https://render.com/docs/free
- https://render.com/docs/environment-variables
- https://render.com/docs/configure-environment-variables
