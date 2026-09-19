# 07_QA_COMMANDS_V10.1.MD
# QA + COMMAND CENTER V10.1.1

# I. LỆNH GIÁO VIÊN

```text
KHOI_DONG
DANH_MUC
TRANG_THAI
TUAN [N]
SOAN_XUAT [MÃ]
SOAN_MOI [MÃ]
NANG_CAP [MÃ]
RA_SOAT_NHANH
KIEM_TRA_TOAN
XUAT_WORD_OMML
TAO_SLIDE_NGHIEN_CUU
CANVA_TIET [PPCT]
XUAT_CANVA_PROMPT
SOAN_XUAT_CANVA [MÃ]
CANVA_SLIDE [PPCT] [SO_SLIDE]
TIEP_THEO
```

# II. LỆNH MẶC ĐỊNH HẰNG NGÀY

`SOAN_XUAT [MÃ]`

Ví dụ:

`SOAN_XUAT 01`

# III. MỘT CHẠM KHDH → CANVA

`SOAN_XUAT_CANVA [MÃ]`

Tự chạy:

`KHDH → QA → PERIOD_MAP → 15–20 SLIDE/TIẾT → PROMPT CANVA → QA`

# IV. QA PIPELINE

```text
SOURCE_QA
→ PPCT_QA
→ CONTENT_QA
→ FORMAT_QA
→ PERIOD_QA
→ VISUAL_ASSET_QA
→ MATH_SOURCE_QA
→ OMML_QA (nếu xuất Word)
→ SLIDE_QA
→ CANVA_QA
```

# V. CONTENT QA

Kiểm tra:
- đúng bài;
- I.1 chỉ liệt kê tên kiến thức ngắn gọn;
- không chép YCCĐ;
- mục tiêu ↔ hoạt động ↔ sản phẩm;
- NLS đúng bài;
- không thêm dữ kiện ngoài nguồn.

# VI. FORMAT QA

- tiêu đề đúng;
- bảng tiến trình đúng 2 cột;
- đủ 4 bước;
- bài nhiều tiết chia đúng PPCT;
- không cột thứ ba.

# VII. DELTA QA

Khi `RA_SOAT_NHANH`:
- không viết lại toàn bộ KHDH;
- chỉ báo phần sai/cần sửa;
- kiểm tra phần thay đổi + liên kết bắt buộc.

Nếu đạt:

`QA_OK`

# VIII. SLIDE QA

Mỗi tiết:
- 15–20 slide;
- đúng PPCT;
- đúng nội dung tiết;
- có mở/kết nối, hoạt động, chốt, luyện tập/vận dụng, exit;
- không dồn/lặp.

Đạt:

`SLIDE_PERIOD_QA_OK`

Toàn bài:

`SLIDE_LESSON_QA_OK`

# IX. CANVA QA

- số deck = số tiết;
- mỗi deck 15–20 prompt;
- mỗi slide = 1 code block độc lập;
- không thay dữ kiện/công thức;
- prompt đủ text, bố cục, tương tác, sản phẩm, style.

Đạt:

`CANVA_PERIOD_QA_OK + CANVA_LESSON_QA_OK`

# X. FAIL CLOSED

Nếu nguồn xung đột:

`SOURCE_CONFLICT`

Nếu Word chưa tạo được OMML:

`MATH_EXPORT_BLOCKED`

Không tuyên bố FINAL khi chưa đạt điều kiện.



# X-A. VISUAL ASSET QA V10.1

Kiểm tra:
- nội dung cần hình chính xác có code TikZ/Overleaf;
- code nằm ngay dưới nội dung cần vẽ;
- code không đổi dữ kiện;
- nội dung cần ảnh minh họa có prompt ảnh;
- prompt ảnh nằm ngay dưới nội dung;
- không gom code/prompt xuống cuối;
- slide/Canva kế thừa asset đúng PPCT.

Đạt:

`VISUAL_ASSET_QA_OK`
