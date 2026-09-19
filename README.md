# 🎓 KHDH AUTO V10.1 FINAL – WEB APPLICATION

Hệ thống tự động hóa xây dựng Kế hoạch dạy học (KHDH) chuẩn Công văn 5512 & slide Canva.
**Đơn vị áp dụng:** Trường THCS Quang Trung | Tổ Toán Tin | Giáo viên: Lê Tâm

---

## 🌟 Tổng Quan Dự Án
**KHDH AUTO V10.1 FINAL** là ứng dụng web full-stack (Next.js 15, TypeScript, Tailwind CSS v4, Google AI Gemini) tự động hóa quy trình soạn giáo án chuẩn Bộ Giáo dục và Đào tạo:
- Chuẩn hóa mục I.1 Kiến thức ngắn gọn (2-12 từ, không chép YCCĐ).
- Bảng tiến trình dạy học chuẩn 2 cột (`HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN`).
- Xử lý công thức Toán học chuẩn LaTeX / KaTeX / Word Equation (OMML).
- Sinh mã TikZ cho hình vẽ chính xác và prompt ảnh minh họa thực tiễn.
- Tự động phân chia 15-20 slide/tiết và xuất Canva Prompt độc lập.

---

## 🏗️ Kiến Trúc Hệ Thống (10 Chuyên Viên Agent)

```text
SourceIndexerAgent
 └──→ LessonRouterAgent
       └──→ OldKhdhMatcherAgent
             └──→ KhdhBuilderAgent
                   ├──→ MathAgent (KaTeX + OMML)
                   └──→ VisualAssetAgent (TikZ + Image Prompt)
                         └──→ PeriodPlannerAgent (PERIOD_MAP)
                               └──→ SlideAgent (15-20 slide/tiết)
                                     └──→ CanvaNotebookAgent
                                           └──→ QAAgent (Cổng kiểm soát chất lượng)
                                                 └──→ EXPORT FINAL
```

| STT | Tên Agent | Vai trò chuyên trách |
|:---:|---|---|
| 1 | **SourceIndexerAgent** | Lập chỉ mục tài liệu nguồn PL1, PPCT, SGK, KHDH cũ |
| 2 | **LessonRouterAgent** | Định tuyến mã bài học, số tiết, tuần và SGK locator |
| 3 | **OldKhdhMatcherAgent** | Đối chiếu KHDH cũ, khóa chính sách bảo toàn nội dung gốc |
| 4 | **KhdhBuilderAgent** | Soạn mới hoặc nâng cấp KHDH theo Form V10.1 (CV 5512) |
| 5 | **MathAgent** | Chuẩn hóa TeX Canonical, KaTeX Preview & Word OMML |
| 6 | **VisualAssetAgent** | Sinh mã TikZ/Overleaf và prompt tạo ảnh minh họa |
| 7 | **PeriodPlannerAgent** | Chia KHDH thành PERIOD_MAP độc lập theo từng tiết PPCT |
| 8 | **SlideAgent** | Xây dựng 15–20 slide sư phạm (mặc định 18 slide) mỗi tiết |
| 9 | **CanvaNotebookAgent** | Xuất Canva Prompt độc lập và Slide Deck Markdown |
| 10 | **QAAgent** | Cổng kiểm soát chất lượng toàn pipeline, định tuyến lỗi |

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Local

### 1. Yêu cầu hệ thống
- Node.js 18.18+ hoặc Node.js 20+
- npm hoặc pnpm / yarn

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
```bash
cp .env.example .env.local
```
Điền `GOOGLE_AI_API_KEY` trong `.env.local` nếu muốn sử dụng API key mặc định của server. Người dùng cũng có thể nhập API Key trực tiếp trên giao diện web.

### 4. Khởi chạy Development Server
```bash
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).

---

## 🔐 Bảng Biến Môi Trường (Environment Variables)

| Tên biến | Loại | Mặc định | Mô tả |
|---|:---:|---|---|
| `GOOGLE_AI_API_KEY` | Server Secret | `""` | Khóa Google AI Gemini API |
| `GOOGLE_AI_MODEL` | Server Secret | `gemini-3.8-flash` | Mô hình chính (Ưu tiên Gemini 3.8 Flash ➔ 3.7 Flash ➔ 3.6 Flash ➔ 2.5 Flash ➔ 2.0 Flash ➔ 1.5 Flash) |
| `GOOGLE_AI_FLASH_MODEL` | Server Secret | `gemini-3.8-flash-lite` | Mô hình nhẹ cho tác vụ test key (Ưu tiên 3.8 Flash-Lite ➔ 3.7 Flash-Lite ➔ 2.5 Flash-Lite ➔ 1.5 Flash-8B) |
| `AUTH_SECRET` | Server Secret | `""` | Khóa bí mật ký JWT |
| `NEXT_PUBLIC_APP_NAME` | Public | `KHDH Auto V10.1` | Tên hiển thị ứng dụng |
| `NEXT_PUBLIC_APP_URL` | Public | `http://localhost:3000` | URL ứng dụng |
| `SCHOOL_NAME` | Server Config | `TRƯỜNG THCS QUANG TRUNG` | Tên trường mặc định |
| `DEPARTMENT` | Server Config | `TOÁN TIN` | Tổ bộ môn |
| `TEACHER_NAME` | Server Config | `LÊ TÂM` | Tên giáo viên |

> **Quy tắc an ninh:** Tuyệt đối không commit file `.env.local` lên Git repository.

---

## 🔑 Quản Lý Google AI API Key Phía Client
- **Session Storage (Mặc định - Khuyên dùng):** API Key chỉ lưu trong tab trình duyệt hiện tại, tự động xóa sạch khi đóng trình duyệt.
- **Local Storage:** Chỉ lưu khi người dùng chủ động chọn "Ghi nhớ key trên thiết bị này".
- **Masking:** Key hiển thị dạng ẩn `••••••••abcd` trên giao diện.
- **Kiểm tra kết nối:** Nút kiểm tra API Key gọi request ping siêu nhẹ đến Google AI để xác thực ngay lập tức.

---

## 📦 Hướng Dẫn Build & Deploy Production

### 1. Build Production
```bash
npm run build
```

### 2. Chạy Production Server
```bash
npm run start
```

### 3. Deploy lên Vercel
1. Đẩy mã nguồn lên GitHub/GitLab.
2. Import project vào Vercel.
3. Trong mục **Environment Variables**, thêm:
   - `GOOGLE_AI_API_KEY`: API Key Gemini của bạn
   - `AUTH_SECRET`: Chuỗi ngẫu nhiên tối thiểu 32 ký tự
   - `SCHOOL_NAME`, `DEPARTMENT`, `TEACHER_NAME` (tùy chọn)
4. Nhấn **Deploy**.

---

## 🛡️ Danh Sách Kiểm Tra An Ninh (Security Checklist)
- [x] `.env.local` đã nằm trong `.gitignore`, không bao giờ lọt vào Git.
- [x] `.env.example` không chứa bất kỳ API key hay mật khẩu thật nào.
- [x] API Key được bảo vệ bằng sessionStorage phía client và giải mã an toàn ở server.
- [x] Middleware bảo mật với đầy đủ HTTP Headers (CSP, X-Frame-Options, XSS Protection, HSTS).
- [x] Chống click kép (double-click prevention) & hỗ trợ nút Hủy (AbortController).
- [x] Giới hạn tần suất gọi API (Rate Limiting: 30 requests/phút).
- [x] Không log bất kỳ API key hay token nào ra console trong môi trường production.
- [x] Production build hoàn tất thành công 100% không có lỗi TypeScript hay Lint.

