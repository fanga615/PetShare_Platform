# PawPaw 毛孩日常

PawPaw 是一個使用 HTML、CSS、原生 JavaScript 與 LocalStorage 製作的寵物分享交流平台。網站可直接在瀏覽器執行，包含公開分享區、登入註冊、個人頁、發文、按讚、留言、通知、搜尋、熱門貼文、深色模式與圖片選取式雙重驗證。

## 功能

- 公開分享區與熱門貼文排序
- LocalStorage 模擬資料庫
- 使用者註冊、登入與登出
- 登入圖片選取式雙重驗證
- 個人首頁與公開個人頁面
- 新增、編輯、刪除貼文
- 圖片預覽、拖曳上傳與壓縮
- 按讚、取消按讚、留言、收藏與分享
- 通知未讀數量
- 搜尋使用者 ID、主題、內容與 Tag
- 深色模式偏好保存
- RWD 手機版響應式設計

## 專案檔案

- `index.html`：公開分享區首頁
- `login.html`：登入頁
- `register.html`：註冊頁
- `home.html`：個人首頁
- `profile.html`：公開個人頁
- `create-post.html`：新增貼文頁
- `style.css`：網站樣式
- `script.js`：網站互動與 LocalStorage 邏輯

## 執行方式

可以直接開啟 `index.html`，也可以使用本機靜態伺服器：

```bash
python -m http.server 4173
```

然後開啟：

```text
http://127.0.0.1:4173/index.html
```

## 測試帳號

初次開啟網站會自動建立示範資料：

- ID：`momo_cat`，密碼：`1234`
- ID：`bobo_dog`，密碼：`1234`
- ID：`lala_bunny`，密碼：`1234`

