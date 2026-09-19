# 04_FORM_SLIDE_15_20_MOI_TIET.MD
# FORM SLIDE V10.1 – 1 TIẾT = 1 DECK = 15–20 SLIDE

> Slide là công cụ dẫn dắt hoạt động học, không phải bản chép KHDH.

# I. QUY TẮC KHÓA

1. **Mỗi tiết học tạo một bài trình chiếu riêng.**
2. **Mỗi bài trình chiếu có 15–20 slide.**
3. Mặc định: **18 slide/tiết**.
4. Bài 2 tiết → 2 deck; bài 4 tiết → 4 deck.
5. Không tạo 1 deck lớn cho toàn bài nhiều tiết.
6. Không tạo toàn bộ slide rồi mới ép chia tiết.
7. Phải lập `PERIOD_MAP` trước.

# II. NGUỒN

1. KHDH đã `QA_OK`.
2. PERIOD_MAP.
3. PL1 để kiểm tra mục tiêu/NLS.
4. PPCT để xác định tiết.
5. SGK để kiểm tra nội dung/dữ kiện/hình.

# III. PERIOD_MAP

Ví dụ:

```yaml
LESSON_ID: ...
PPCT_AUTO: [3,4]
PERIODS:
  - PPCT: 3
    TITLE: Phương pháp thế - phần 1
    OBJECTIVES: [...]
    ACTIVITIES: [...]
    PRODUCTS: [...]
  - PPCT: 4
    TITLE: Phương pháp thế - phần 2
    OBJECTIVES: [...]
    ACTIVITIES: [...]
    PRODUCTS: [...]
```

Không tạo slide khi chưa xác định được nội dung riêng của từng tiết.

# IV. CẤU TRÚC 18 SLIDE MẶC ĐỊNH CHO MỖI TIẾT

## Slide 01 – Tiêu đề tiết
- Tên bài, PPCT, trọng tâm của tiết.

## Slide 02 – Mục tiêu tiết
- 2–4 mục tiêu của riêng tiết.

## Slide 03 – Khởi động/Kết nối
- Tiết đầu: tình huống mở đầu.
- Tiết sau: kết nối sản phẩm tiết trước.

## Slide 04 – Câu hỏi lớn
- Một vấn đề trung tâm.

## Slide 05 – Dự đoán/Giả thuyết
- HS nêu dự đoán trước khám phá.

## Slide 06 – Hướng dẫn tự học
- tìm gì;
- nguồn nào;
- ghi gì;
- sản phẩm gì;
- kiểm chứng thế nào.

## Slide 07 – Nhiệm vụ khám phá 1
- nhiệm vụ + hình thức + thời gian + sản phẩm.

## Slide 08 – Dữ liệu/Hình/Ngữ liệu
- đúng nguồn; không tự đổi dữ kiện.

## Slide 09 – Phân tích
- so sánh, phát hiện quy luật, trả lời “Vì sao?”.

## Slide 10 – Báo cáo/Phản biện
- trình bày sản phẩm, nhận xét chéo.

## Slide 11 – Kiến thức chốt
- ngắn, chính xác, chỉ chốt sau khám phá.

## Slide 12 – Nhiệm vụ khám phá 2/Thực hành
- tăng mức độc lập.

## Slide 13 – NLS/AI/Công cụ số (nếu có)
- công cụ → nhiệm vụ → sản phẩm → kiểm chứng.

## Slide 14 – Kiểm chứng
- đối chiếu SGK/lập luận/công cụ.

## Slide 15 – Luyện tập có hướng dẫn
- 1–2 nhiệm vụ trọng tâm.

## Slide 16 – Luyện tập độc lập
- HS tự làm; có tiêu chí.

## Slide 17 – Vận dụng/Exit task
- tình huống thực tiễn hoặc nhiệm vụ tổng hợp.

## Slide 18 – Exit ticket/Chuyển tiếp
- điều đã hiểu;
- điều chưa rõ;
- chuẩn bị tiết sau.

Nếu là tiết cuối: Slide 18 = **Tổng kết – Tự đánh giá – Nhiệm vụ sau bài**.

# V. CO GIÃN 15–20 SLIDE

Có thể gộp/tách dựa trên hoạt động thật:
- 15–17 slide: tiết ít hoạt động nhưng vẫn đủ chu trình.
- 18 slide: mặc định.
- 19–20 slide: khi có 2 hoạt động nghiên cứu lớn hoặc nhiều dữ liệu.

Không tạo slide rỗng để đủ số.

# VI. NGUYÊN TẮC TỰ HỌC / NGHIÊN CỨU

Mỗi tiết có hình thành kiến thức nên ưu tiên chu trình:

`CÂU HỎI → DỰ ĐOÁN → THU THẬP/QUAN SÁT → PHÂN TÍCH → KIỂM CHỨNG → KẾT LUẬN`

Không viết chung chung “Hãy tìm hiểu...”. Phải nêu:
- tìm điều gì;
- đọc phần nào;
- dùng từ khóa nào nếu tìm số;
- ghi dữ liệu gì;
- sản phẩm gì;
- kiểm chứng bằng gì.

# VII. QUY TẮC NỘI DUNG

- 1 slide = 1 ý chính/nhiệm vụ/câu hỏi/sản phẩm.
- Ít chữ, nhiều khoảng trắng.
- Không sao chép nguyên bảng KHDH.
- Không hiện đáp án trước nhiệm vụ.
- Không đưa kiến thức tiết sau vào tiết trước.
- Không lặp lại toàn bộ mục tiêu bài ở mọi tiết.

# VIII. CÔNG THỨC/HÌNH

- Công thức slide dùng MATH_CANONICAL `$...$` hoặc `$$...$$`.
- Hình SGK chính xác: ghi locator trang/hình nếu cần.
- Hình minh họa mới: tạo prompt ảnh riêng, không thay số liệu.

# IX. NLS/AI

Chỉ xuất ở đúng tiết có hoạt động NLS/AI.

Ưu tiên:

`HỎI → ĐỌC → ĐỐI CHIẾU → KIỂM TRA → SỬA → KẾT LUẬN`

# X. PERIOD QA

Mỗi tiết chỉ đạt khi:

```text
15 <= SO_SLIDE <= 20
PPCT đúng
mục tiêu đúng tiết
không lẫn tiết khác
có mở/kết nối
có hoạt động trọng tâm
có sản phẩm HS
có kiến thức chốt
có luyện tập/vận dụng/exit
NLS đúng tiết
không dồn nội dung
```

Đạt: `SLIDE_PERIOD_QA_OK`

# XI. WHOLE LESSON QA

- số deck = SO_TIET_AUTO;
- mỗi deck 15–20 slide;
- tiết sau kết nối tiết trước;
- không lặp/đưa trước kiến thức;
- tiết cuối tổng kết bài.

Đạt: `SLIDE_LESSON_QA_OK`

# XII. ĐẦU RA

Tên deck:

`SLIDE_PPCT_[PPCT]_[TEN_BAI]`

Ví dụ bài 4 tiết:

```text
SLIDE_PPCT_3_[TEN_BAI]
SLIDE_PPCT_4_[TEN_BAI]
SLIDE_PPCT_5_[TEN_BAI]
SLIDE_PPCT_6_[TEN_BAI]
```

---


# QUY TẮC KẾ THỪA HÌNH VẼ / ẢNH TỪ KHDH V10.1

Khi KHDH có `Code TikZ / Overleaf` hoặc `Prompt tạo ảnh` đặt dưới một nội dung:

1. Slide thuộc đúng hoạt động/tiết phải kế thừa asset đó.
2. Không chuyển asset sang tiết khác.
3. Nếu là hình học/đồ thị cần chính xác:
   - giữ nguyên `TIKZ_SOURCE`;
   - slide ghi vị trí `[CHÈN HÌNH TỪ TIKZ]`;
   - không tự tạo ảnh AI thay thế hình toán chính xác.
4. Nếu là ảnh minh họa:
   - kế thừa prompt ảnh;
   - được rút gọn để dùng cho Canva nhưng không thay đổi dữ kiện.
5. Nếu một slide cần cả hai:
   `NỘI DUNG → TIKZ_SOURCE → IMAGE_PROMPT`.
6. QA bắt buộc kiểm tra asset đúng PPCT và đúng hoạt động.
