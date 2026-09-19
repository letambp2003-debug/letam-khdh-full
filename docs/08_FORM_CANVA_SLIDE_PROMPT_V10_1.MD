# 08_FORM_CANVA_SLIDE_PROMPT_V10.1.MD
# FORM V10.1.1 – XUẤT TỪNG SLIDE THÀNH PROMPT CANVA DẠNG CODE TEXT

> Mục tiêu: từ KHDH đã QA, tạo 01 bộ prompt Canva riêng cho từng tiết.
> Mỗi tiết = 01 bài trình chiếu riêng = 15–20 slide.
> Mỗi slide = 01 prompt độc lập trong code block.

## I. NGUYÊN TẮC
1. Không tạo một deck chung cho toàn bộ bài nhiều tiết.
2. Bài 2 tiết → 2 deck; bài 4 tiết → 4 deck.
3. Mỗi deck 15–20 slide.
4. Nội dung mỗi deck bám đúng PERIOD_MAP của tiết.
5. Không đưa trước kiến thức của tiết sau.
6. Không lặp nguyên nội dung tiết trước.
7. Không bịa kiến thức, dữ liệu, bài tập, hình SGK hoặc đáp án.
8. Không hiện đáp án trước khi HS làm nhiệm vụ.
9. Slide ưu tiên hoạt động HS, không sao chép giáo án.

## II. NGUỒN
1. KHDH đã QA_OK.
2. PERIOD_MAP.
3. PL1.
4. PPCT.
5. SGK.
6. FORM_SLIDE.

Nếu xung đột: SOURCE_CONFLICT, không tự sửa.

## III. 1 TIẾT = 1 DECK
Mỗi tiết tạo metadata:
```text
DECK_ID:
LESSON_ID:
PPCT:
TEN_BAI:
TEN_TIET:
SO_SLIDE:
MUC_TIEU_TIET:
HOAT_DONG_TIET:
SAN_PHAM_TIET:
NLS_AI_TIET:
```

Tên file:
`CANVA_PPCT_[PPCT]_[TEN_BAI].MD`

## IV. SỐ SLIDE
- Mỗi tiết: 15–20 slide.
- Mặc định: 18 slide/tiết.
- Không tạo slide rỗng để đủ số.

## V. KHUNG 18 SLIDE / 1 TIẾT
1. Tiêu đề tiết.
2. Mục tiêu tiết.
3. Kết nối/khởi động.
4. Câu hỏi lớn.
5. Dự đoán/giả thuyết.
6. Hướng dẫn tự học.
7. Nhiệm vụ khám phá 1.
8. Dữ liệu/hình/ngữ liệu.
9. Phân tích.
10. Báo cáo/phản biện.
11. Kiến thức chốt.
12. Nhiệm vụ khám phá 2/thực hành.
13. NLS/AI/công cụ số nếu có.
14. Kiểm chứng.
15. Luyện tập có hướng dẫn.
16. Luyện tập độc lập.
17. Vận dụng/exit task.
18. Exit ticket/chuyển tiếp; nếu tiết cuối thì tổng kết + tự đánh giá + nhiệm vụ sau bài.

## VI. CANVA STYLE MASTER
```text
Tỷ lệ 16:9 widescreen.
Phong cách giáo dục hiện đại, chuyên nghiệp, sạch.
Ngôn ngữ tiếng Việt chuẩn.
Nền sáng, tương phản cao, 1–2 màu nhấn.
Font sans-serif dễ đọc.
Nhiều khoảng trắng, không nhồi chữ.
Hình ảnh phục vụ kiến thức.
Không tự thêm logo, watermark, slogan.
Không tự thêm đáp án.
Không sửa số liệu, công thức, thuật ngữ.
```

## VII. SCHEMA PROMPT CHUẨN CHO MỖI SLIDE
Mỗi slide xuất thành 01 code block độc lập:

```text
[CANVA_SLIDE_PROMPT]

DECK:
[Tên bài – Tiết PPCT ...]

SLIDE:
[01/18]

LOAI_SLIDE:
[Tiêu đề / Khởi động / Nhiệm vụ / Kiến thức / Luyện tập / Vận dụng / Exit ticket...]

MUC_DICH_SU_PHAM:
[...]

NOI_DUNG_CHINH_XAC:
- [...]
- [...]
- [...]

TEXT_HIEN_THI_TREN_SLIDE:
Tiêu đề: [...]
Nội dung ngắn:
- [...]
- [...]
Câu hỏi/Nhiệm vụ: [...]

BO_CUC:
[2 cột / tiêu đề + hình / cards / sơ đồ / timeline / bảng...]

HINH_ANH_MINH_HOA:
[Mô tả hình hoặc KHÔNG CẦN]

PROMPT_HINH_ANH_NEU_CAN:
[Mô tả ảnh chính xác; không chữ trên ảnh; không thay dữ kiện]

CONG_THUC_TOAN:
[KaTeX/LaTeX nguồn nếu có; KHÔNG CÓ nếu không]

TIKZ_SOURCE:
[Code TikZ/Overleaf nếu slide có hình toán chính xác; KHÔNG CÓ nếu không]

IMAGE_PROMPT:
[Prompt tạo ảnh nếu slide cần ảnh minh họa; KHÔNG CÓ nếu không]

TUONG_TAC_HOC_SINH:
[...]

SAN_PHAM_MONG_DOI:
[...]

THOI_GIAN:
[...] phút

STYLE:
16:9; giáo dục hiện đại; nền sáng; tương phản cao; ít chữ; font dễ đọc; đồng bộ deck.

RANG_BUOC:
- Giữ nguyên nội dung và số liệu.
- Không tự thêm kiến thức hoặc đáp án.
- Không tạo chữ sai chính tả.
- Không nhồi nội dung.
- Không đổi công thức.

[/CANVA_SLIDE_PROMPT]
```

## VIII. PROMPT PHẢI ĐỘC LẬP
Mỗi code block phải đủ thông tin để copy riêng vào Canva.
Không viết: “giữ phong cách slide trước”.
Phải nhắc lại STYLE ngắn gọn trong từng prompt.

## IX. TEXT TRÊN SLIDE
- Tiêu đề: khoảng 8–12 từ khi có thể.
- Nội dung: 3–5 bullet ngắn.
- Nhiệm vụ: nêu làm gì, hình thức, thời gian, sản phẩm.
- Ưu tiên câu hỏi: Vì sao? Em dự đoán gì? Minh chứng nào? Kiểm chứng thế nào?

## X. CÔNG THỨC TOÁN
Trong prompt Canva:
- inline `$...$`
- display `$$...$$`
- theo MATH PROFILE V10
- không custom macro
- không tự đổi ký hiệu.

Nếu Canva không render đúng:
`[CÔNG THỨC CẦN CHÈN BẰNG EQUATION/APP TOÁN TRONG CANVA]`

## XI. HÌNH SGK
Nếu cần đúng hình SGK:
`[CHÈN HÌNH SGK – TRANG ... – HÌNH ...]`
Không tự vẽ lại nếu có nguy cơ sai dữ kiện.

## XII. NLS/AI
Chỉ xuất khi đúng tiết có hoạt động:
```text
Công cụ:
Nhiệm vụ:
Dữ liệu đầu vào:
Sản phẩm:
Cách kiểm chứng:
Lưu ý an toàn/bản quyền:
```

## XIII. PERIOD QA
Mỗi tiết phải đạt:
1. 15–20 prompt.
2. Đúng PPCT.
3. Chỉ nội dung của tiết.
4. Không dồn/lặp.
5. Có mở/kết nối.
6. Có hoạt động trọng tâm.
7. Có sản phẩm HS.
8. Có kiến thức chốt.
9. Có luyện tập/vận dụng/exit.
10. NLS đúng tiết.
11. Công thức không bị sửa.
12. Mỗi slide là 1 code block độc lập.
13. Không có nội dung ngoài nguồn.

Đạt: `CANVA_PERIOD_QA_OK`

## XIV. WHOLE LESSON QA
- Số deck = số tiết.
- Mỗi deck 15–20 slide.
- Các tiết nối tiếp logic.
- Không đưa trước kiến thức.
- Tiết sau có slide kết nối.
- Tiết cuối có tổng kết.

Đạt: `CANVA_LESSON_QA_OK`

## XV. LỆNH
`XUAT_CANVA_PROMPT`
→ KHDH → PERIOD_MAP → deck từng tiết → 15–20 slide/tiết → prompt từng slide → QA.

`CANVA_TIET [PPCT]`
→ tạo riêng một tiết.

`SOAN_XUAT_CANVA [MÃ]`
→ soạn/nâng cấp KHDH → QA → tách tiết → tạo prompt Canva.

`CANVA_SLIDE [PPCT] [SO_SLIDE]`
→ tạo lại một slide cụ thể.

## XVI. ĐẦU RA
Bài 2 tiết:
```text
CANVA_PPCT_3_[TEN_BAI].MD
CANVA_PPCT_4_[TEN_BAI].MD
```

Bài 4 tiết:
```text
CANVA_PPCT_3_[TEN_BAI].MD
CANVA_PPCT_4_[TEN_BAI].MD
CANVA_PPCT_5_[TEN_BAI].MD
CANVA_PPCT_6_[TEN_BAI].MD
```

## XVII. QUY TẮC CHỐT
Không dùng:
`1 bài nhiều tiết → 1 deck lớn`

Phải dùng:
`1 tiết → 1 deck → 15–20 slide → 15–20 prompt Canva độc lập`

Pipeline:
`KHDH → PERIOD_MAP → DECK TIẾT → SLIDE PLAN → CANVA PROMPT CODE TEXT → QA`

---


## QUY TẮC V10.1 CHO TIKZ VÀ ẢNH TRÊN CANVA

- Hình Toán cần chính xác: không yêu cầu Canva “tự vẽ lại” theo trí tưởng tượng.
- Giữ `TIKZ_SOURCE` làm nguồn chuẩn; trong prompt Canva dùng placeholder:
  `[CHÈN HÌNH TOÁN ĐƯỢC KẾT XUẤT TỪ TIKZ]`.
- Ảnh minh họa thực tế: dùng `IMAGE_PROMPT`.
- Nếu Canva không hỗ trợ TikZ trực tiếp, kết xuất TikZ thành SVG/PNG chất lượng cao rồi chèn vào slide.
- Không thay đổi nhãn điểm, số liệu, góc, quan hệ hình học hoặc tọa độ.
