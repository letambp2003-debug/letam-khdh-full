# 03_FORM_KHDH_V11_4PHAN_KHONG_TACHTIET.MD
# KHDH AUTO V11 FINAL — FORM KẾ HOẠCH BÀI DẠY 4 PHẦN, KHÔNG TÁCH TIẾT

> **Mục đích:** Dùng làm phiên bản FORM thay thế cho bản nâng cấp **KHDH AUTO V11 FINAL**, áp dụng khi bài nhiều tiết **không cần tách thành từng TIẾT [PPCT] trong phần trình bày cuối**, mà giữ một tiến trình thống nhất gồm 4 phần A–B–C–D.  
> **Nguồn cấu trúc:** tái cấu trúc từ mẫu KHDH thực tế có các phần: Mục tiêu → Thiết bị dạy học và học liệu → Tiến trình A/B/C/D → Hướng dẫn về nhà → Kế hoạch đánh giá.  
> **Ưu tiên:** đúng nguồn, dễ đọc, dễ xuất Word, dễ tách theo PPCT, dễ tạo Slide/Canva/NotebookLM.

---

# 0. SYSTEM RULES — KHÔNG XUẤT RA KHDH CUỐI

```yaml
FORM_MODE: FOUR_SECTION_CONTINUOUS
```

## 0.1. Thứ tự ưu tiên nguồn

1. `PL1` → bài học, số tiết, YCCĐ nội bộ, NLS.
2. `PPCT` → PPCT, tuần, thứ tự thực dạy.
3. `SGK` → kiến thức, ví dụ, bài tập, dữ kiện, hình/ngữ liệu.
4. `KHDH cũ` → bảo toàn nội dung khi nâng cấp.
5. `03_FORM_KHDH_V11_4PHAN_KHONG_TACHTIET.MD` → cấu trúc/trình bày, không phải nguồn kiến thức.

## 0.2. Quy tắc đọc nguồn

```text
INDEX_ONCE = ON
READ_SLICE_ONLY = ON
NO_ECHO = ON
DELTA_QA = ON
STOP_ON_CONFLICT = ON
```

- Không suy đoán khi nguồn thiếu/xung đột.
- Không tự sửa PL1/PPCT/SGK/KHDH cũ.
- Không đưa kiến thức ngoài nguồn được phép.
- Không dùng PPCT làm khóa duy nhất của bài học.
- Bài nhiều tiết **không bắt buộc tách thành từng `TIẾT [PPCT]` trong KHDH xuất cuối**. Hệ thống chỉ cần bảo đảm tổng thời lượng đúng số tiết và tiến trình đầy đủ 4 phần A–B–C–D.

## 0.3. LESSON RUNTIME nội bộ

```yaml
LESSON_RUNTIME:
  lesson_id:
  subject:
  grade:
  school_year:
  semester:
  strand:
  chapter:
  lesson_title:
  ppct_auto: []
  so_tiet_auto:
  tuan_auto: []
  sgk_locator: []
  old_khdh_match:
  mode: "SOAN_MOI|NANG_CAP"
  source_status:
```

---

# 0.4. QUY ƯỚC TRÌNH BÀY DẤU GẠCH

- Khi mô tả form hoặc khi AI xuất KHDH cuối, các ý liệt kê trong phần nội dung phải trình bày bằng dấu gạch ngang `-` ở đầu dòng.
- Không dùng ký hiệu bullet chấm tròn `•`.
- Nếu cần minh họa mẫu trong file Markdown, ưu tiên hiển thị dấu gạch ngang dạng literal: `\-`.
- Quy tắc này áp dụng cho các phần: Kiến thức, Năng lực, Phẩm chất, Thiết bị dạy học và học liệu, Hướng dẫn về nhà và các mục nội dung tương tự.

---

# 1. PHẦN ĐẦU KHDH

```text
TRƯỜNG: [TÊN TRƯỜNG]
TỔ: [TÊN TỔ CHUYÊN MÔN]

Họ tên giáo viên: [HỌ VÀ TÊN]

[TÊN BÀI / CHỦ ĐỀ]

Môn học: [MÔN] – Lớp: [LỚP]
Thời lượng: [SỐ TIẾT] tiết
PPCT: [DANH SÁCH PPCT]
Tuần: [TUẦN]
```

> **SYSTEM RULE:**  
> - Dữ liệu trên phải lấy từ nguồn tương ứng; không tự gõ lại nếu hệ thống đã xác định được.  
> - Nếu PPCT/tuần chưa xác minh: không xuất trạng thái FINAL.

---

# I. MỤC TIÊU

## 1. Kiến thức

\- [Tên nội dung kiến thức 1]
\- [Tên nội dung kiến thức 2]
\- [Tên nội dung kiến thức 3]
\- [...]

> **QUY TẮC KHÓA — KIẾN THỨC NGẮN GỌN**
>
> - Chỉ liệt kê **tên các nội dung kiến thức chính**.
> - Mỗi ý là một cụm từ ngắn, ưu tiên khoảng **2–12 từ**.
> - Không giải thích.
> - Không định nghĩa.
> - Không ghi công thức.
> - Không đưa ví dụ/bài tập.
> - Không dùng câu dạng YCCĐ như: *nhận biết được, trình bày được, thực hiện được, vận dụng được...*
> - Không chép nguyên YCCĐ từ PL1.
> - YCCĐ chỉ dùng làm checklist nội bộ.
> - Nội dung chi tiết phải triển khai ở **III. TIẾN TRÌNH DẠY HỌC**.

### Mẫu đúng

```text
\- Đơn thức và đơn thức thu gọn.
\- Bậc của đơn thức.
\- Đa thức và bậc của đa thức.
\- Cộng, trừ đa thức.
```

---

## 2. Năng lực

### a) Năng lực chung

\- [Tự chủ và tự học: ...]
\- [Giao tiếp và hợp tác: ...]
\- [Giải quyết vấn đề và sáng tạo: ...]

> Chỉ ghi những năng lực thực sự được hình thành qua hoạt động của bài.

### b) Năng lực đặc thù môn học

\- [Năng lực tư duy và lập luận ...]
\- [Năng lực mô hình hóa ...]
\- [Năng lực giải quyết vấn đề ...]
\- [Năng lực giao tiếp ...]
\- [Năng lực sử dụng công cụ/phương tiện ...]

> Mỗi năng lực phải gắn với thao tác/sản phẩm có thật trong bài.

### c) Năng lực số / AI

```text
[MÃ NLS]: [Mô tả ngắn nhiệm vụ số]
[MÃ NLS]: [Mô tả ngắn nhiệm vụ số]
```

**Mẫu ánh xạ nội bộ:**

```yaml
NLS:
  - code:
    tool:
    task:
    product:
    verify:
```

> **QUY TẮC:**  
> - Chỉ dùng mã NLS có nguồn.  
> - Không tự tạo mã.  
> - Không tạo “hoạt động AI” hình thức.  
> - Nếu dùng AI/công cụ số, quy trình phải ưu tiên:
>
> `HỎI/TRA CỨU → ĐỌC → ĐỐI CHIẾU NGUỒN → KIỂM TRA → PHÁT HIỆN SAI → SỬA → KẾT LUẬN CỦA HS`

---

## 3. Phẩm chất

\- **Chăm chỉ:** [Biểu hiện cụ thể trong bài.]
\- **Trách nhiệm:** [Biểu hiện cụ thể trong bài.]
\- [Phẩm chất khác nếu nguồn và hoạt động có căn cứ.]

---

# II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU

## 1. Giáo viên

\- [TV/màn hình/máy chiếu.]
\- [Máy tính/kết nối mạng.]
\- [Phần mềm/công cụ số.]
\- [Phiếu học tập/bảng nhóm.]
\- [Học liệu/thiết bị khác.]

## 2. Học sinh

\- [SGK/vở/đồ dùng học tập.]
\- [Thiết bị số nếu thật sự cần.]
\- [Thẻ/công cụ/phần mềm nếu có.]
\- [Nhiệm vụ chuẩn bị ở nhà.]

> **SYSTEM RULE:** Thiết bị phải gắn với hoạt động thực tế; không liệt kê công cụ không dùng.

---

# III. TIẾN TRÌNH DẠY HỌC

> **QUY TẮC V11 — PHIÊN BẢN KHÔNG TÁCH TIẾT**
>
> - Một bài nhiều tiết vẫn là **01 KHDH**.
> - Trong bản KHDH xuất cuối **không bắt buộc chia thành các tiêu đề TIẾT [PPCT]**.
> - Toàn bộ tiến trình phải được tổ chức thống nhất thành đúng 4 phần:
>
>   `A. HOẠT ĐỘNG KHỞI ĐỘNG`
>
>   `B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC`
>
>   `C. HOẠT ĐỘNG LUYỆN TẬP`
>
>   `D. HOẠT ĐỘNG VẬN DỤNG`
>
> - Hệ thống phải bảo đảm **tổng thời lượng thực hiện phù hợp với số tiết của bài**.
> - Có thể phân bổ thời lượng nội bộ theo từng tiết/PPCT, nhưng không bắt buộc hiển thị các mốc tiết trong KHDH cuối.
> - Mỗi hoạt động dùng đúng **2 cột**:
>
> `HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN`
>
> - Không thêm cột NLS/AI.
> - NLS/AI được tích hợp ngay trong nhiệm vụ tương ứng.
> - Nếu phục vụ sinh slide, hệ thống vẫn được phép lập `PERIOD_MAP` nội bộ, nhưng `PERIOD_MAP` **không chi phối bố cục hiển thị của KHDH**.

---

## PHÂN BỔ THỜI LƯỢNG CHO BÀI NHIỀU TIẾT

> **SYSTEM RULE — KHÔNG NHẤT THIẾT XUẤT RA**
>
> Hệ thống phải tính tổng thời lượng theo:
>
> `TỔNG THỜI LƯỢNG = SỐ TIẾT × THỜI LƯỢNG 1 TIẾT`
>
> Ví dụ với 2 tiết, nếu mỗi tiết 45 phút:
>
> `TỔNG = 90 phút`
>
> Phải phân bổ thời gian hợp lý cho 4 phần A–B–C–D và các hoạt động con.
>
> Mẫu nội bộ:
>
> ```yaml
> TIME_PLAN:
>   total_periods: 2
>   minutes_per_period: 45
>   total_minutes: 90
>   sections:
>     A_KHOI_DONG: 8
>     B_HINH_THANH_KIEN_THUC: 32
>     C_LUYEN_TAP: 30
>     D_VAN_DUNG: 15
>     CHUYEN_TIEP_DU_PHONG: 5
> ```
>
> - Không bắt buộc hiển thị mốc “Tiết 1/Tiết 2”.
> - Nếu một hoạt động kéo dài qua ranh giới tiết, có thể tiếp tục liền mạch.
> - Không được làm mất hoạt động chỉ để ép khớp thời lượng.
> - Tổng thời gian phải hợp lý với số tiết đã xác định từ PL1/PPCT.

---

## A. HOẠT ĐỘNG KHỞI ĐỘNG

### a) Mục tiêu

- [Mục tiêu cụ thể của hoạt động.]

### b) Nội dung

- [Nhiệm vụ/tình huống/trò chơi/câu hỏi khởi động.]

### c) Sản phẩm

- [Câu trả lời/sản phẩm/dự đoán của HS.]

### d) Tổ chức thực hiện

| HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN |
|---|---|
| **Bước 1. Chuyển giao nhiệm vụ**  <br>- GV: [...]  <br>- HS: [...]  <br><br>**Bước 2. Thực hiện nhiệm vụ**  <br>- [...]  <br><br>**Bước 3. Báo cáo, thảo luận**  <br>- [...]  <br><br>**Bước 4. Kết luận, nhận định**  <br>- [...] | - [Sản phẩm/câu trả lời/dự đoán.] |

---

## B. HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC

> Với bài **luyện tập chung** hoặc bài ôn tập, phần B vẫn giữ tên **HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC**, nhưng nội dung bên trong có thể tổ chức theo hướng **hệ thống hóa – củng cố – luyện tập trọng tâm** tùy bản chất bài học.

## Hoạt động [SỐ]. [TÊN HOẠT ĐỘNG]

### a) Mục tiêu

- [Kiến thức/kĩ năng/năng lực cần đạt qua hoạt động.]

### b) Nội dung

- [Ví dụ/bài tập/ngữ liệu/nhiệm vụ đúng nguồn.]
- [SGK – trang ... nếu có.]

### c) Sản phẩm

- [Bài giải/bảng nhóm/phiếu học tập/kết luận.]

### d) Tổ chức thực hiện

| HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN |
|---|---|
| **Bước 1. Chuyển giao nhiệm vụ**  <br>- GV: [...]  <br>- HS: [...]  <br><br>**Bước 2. Thực hiện nhiệm vụ**  <br>- HĐ cá nhân: [...]  <br>- HĐ cặp đôi/nhóm: [...]  <br>- GV quan sát/hỗ trợ: [...]  <br><br>**Bước 3. Báo cáo, thảo luận**  <br>- HS trình bày: [...]  <br>- HS nhận xét/phản biện: [...]  <br><br>**Bước 4. Kết luận, nhận định**  <br>- GV chuẩn hóa/chốt: [...] | - [Kết quả đúng.]  <br>- [Kết luận kiến thức.]  <br>- [Sản phẩm học tập.] |

---

# QUY TẮC HÌNH VẼ / ẢNH MINH HỌA — ÁP DỤNG NGAY TRONG HOẠT ĐỘNG

## 1. Bài toán hình / đồ thị / hình toán cần chính xác

Nếu ngay trong `b) Nội dung` hoặc nhiệm vụ có:
- hình học;
- tam giác/tứ giác/đường tròn;
- hệ trục tọa độ;
- đồ thị;
- bảng biến thiên;
- sơ đồ toán học;
- biểu đồ/hình cần đúng dữ kiện,

thì **ngay dưới nội dung cần vẽ** phải đặt:

**Code TikZ / Overleaf:**

```tikz
% Viết code đầy đủ ở đây
% Phải biên dịch được trên Overleaf
```

### Quy tắc TikZ

- Đúng nhãn điểm.
- Đúng dữ kiện.
- Đúng quan hệ vuông góc/song song/góc/toạ độ.
- Không ghi “vẽ hình tương tự”.
- Không dùng ảnh AI thay cho hình Toán cần chính xác.
- Nếu cần đúng hình SGK nhưng thiếu dữ liệu tái tạo:

```text
[CHÈN HÌNH SGK – TRANG ... – HÌNH ...]
```

---

## 2. Nội dung cần ảnh minh họa

Nếu nhiệm vụ cần:
- tình huống thực tiễn;
- bối cảnh đời sống;
- vật thể;
- dụng cụ;
- hiện tượng;
- ảnh khởi động/vận dụng,

thì **ngay dưới nội dung đó** đặt:

**Prompt tạo ảnh:**

```text
PROMPT TẠO ẢNH:
[Mô tả rõ chủ thể, bối cảnh, bố cục/góc nhìn, phong cách giáo dục, dữ kiện phải giữ; không chèn chữ nếu không cần; không tự thêm dữ kiện.]
```

---

## 3. Nếu cần cả hình chính xác và ảnh minh họa

Bắt buộc theo thứ tự:

```text
NỘI DUNG
→ CODE TIKZ / OVERLEAF
→ PROMPT TẠO ẢNH
```

Không gom code/prompt xuống cuối hoạt động, cuối tiết hoặc cuối tài liệu.

---

# QUY TẮC CÔNG THỨC TOÁN

Trong Markdown/chat:

- Inline: `$...$`
- Display:

```text
$$...$$
```

Pipeline:

```text
MATH_CANONICAL
├──→ KaTeX Preview
└──→ OMML Word Equation native
```

- Không biến công thức thành ảnh.
- Không tự đổi biểu thức/dữ kiện.
- DOCX FINAL không được còn raw LaTeX.
- Nếu không chuyển được OMML: `MATH_EXPORT_BLOCKED`.

---

## C. HOẠT ĐỘNG LUYỆN TẬP

### a) Mục tiêu

- [Củng cố/vận dụng trực tiếp kiến thức trọng tâm.]
- [NLS/công cụ số nếu có căn cứ.]

### b) Nội dung

- [Bài tập SGK/SBT/phiếu học tập/trắc nghiệm.]
- [Chỉ rõ nguồn và trang nếu có.]

### c) Sản phẩm học tập

- [Bài giải.]
- [Phiếu/bảng nhóm.]
- [Kết quả công cụ số nếu có.]

### d) Tổ chức thực hiện

| HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN |
|---|---|
| **Bước 1. Chuyển giao nhiệm vụ**  <br>- GV: [...]  <br>- Nếu dùng công cụ số: hướng dẫn [...]  <br>- HS: [...]  <br><br>**Bước 2. Thực hiện nhiệm vụ**  <br>- [...]  <br><br>**Bước 3. Báo cáo, thảo luận**  <br>- [...]  <br><br>**Bước 4. Kết luận, nhận định**  <br>- Chữa bài, chốt đáp án, chỉ ra lỗi thường gặp. | - [Đáp án/kết quả.]  <br>- [Sản phẩm số nếu có.]  <br>- [Lỗi sai cần lưu ý.] |

> Nếu có trắc nghiệm, đáp án nên đặt ở **Sản phẩm dự kiến** hoặc phần dành cho GV; không hiển thị trước khi HS thực hiện nhiệm vụ.

---

## D. HOẠT ĐỘNG VẬN DỤNG

### a) Mục tiêu

- [Vận dụng kiến thức vào bài toán/tình huống thực tế.]
- [Tra cứu/tìm kiếm/kiểm chứng nếu có.]

### b) Nội dung

- [Bài toán/tình huống vận dụng.]

### c) Sản phẩm

- [Bài giải.]
- [Kết luận.]
- [Sản phẩm số/học liệu nếu có.]

### d) Tổ chức thực hiện

| HOẠT ĐỘNG CỦA GV VÀ HS | SẢN PHẨM DỰ KIẾN |
|---|---|
| **Bước 1. Chuyển giao nhiệm vụ**  <br>- [...]  <br><br>**Bước 2. Thực hiện nhiệm vụ**  <br>- [...]  <br><br>**Bước 3. Báo cáo, thảo luận**  <br>- [...]  <br><br>**Bước 4. Kết luận, nhận định**  <br>- [...] | - [Kết quả vận dụng.]  <br>- [Minh chứng/sản phẩm.] |

---

# IV. HƯỚNG DẪN VỀ NHÀ

\- Ghi nhớ: [nội dung cần nhớ].  
\- Hoàn thành: [bài tập/nhiệm vụ].  
\- Chuẩn bị: [bài học tiếp theo].  
\- [Nhiệm vụ tra cứu/tự học nếu có.]

> Không giao nhiệm vụ số/Internet nếu không phục vụ mục tiêu bài.

---

# V. KẾ HOẠCH ĐÁNH GIÁ NỘI DUNG CỦA BÀI/CHỦ ĐỀ

| Mục đích đánh giá | Hình thức | Phương pháp | Công cụ | Ghi chú |
|---|---|---|---|---|
| Đánh giá thường xuyên | [Cá nhân/cặp đôi/nhóm...] | [Quan sát/vấn đáp/kiểm tra viết ngắn/phân tích sản phẩm...] | [Phiếu quan sát/phiếu đánh giá/câu hỏi trắc nghiệm/bảng kiểm...] | [Mục đích điều chỉnh hoạt động dạy học.] |
| [Nếu có] | [...] | [...] | [...] | [...] |

> **QUY TẮC:** Bảng đánh giá phải liên kết được với sản phẩm học sinh trong tiến trình; không tạo bảng đánh giá “để đủ form”.

---

# VI. PERIOD_MAP / TIME_MAP — NỘI BỘ, KHÔNG BẮT BUỘC HIỂN THỊ TRONG KHDH

```yaml
PERIOD_MAP:
  lesson_id:
  total_periods:
  ppct: []
  weeks: []
  total_minutes:
  internal_periods:
    - ppct:
      minute_range:
      activity_refs: []
      products: []
      math_assets: []
      tikz_assets: []
      image_prompts: []
      slide_target: 18
```

> Dùng cho:
>
> `KHDH 4 PHẦN → PERIOD_MAP NỘI BỘ → 15–20 SLIDE/TIẾT → CANVA PROMPT → NOTEBOOKLM MD`
>
> **Lưu ý:** PERIOD_MAP chỉ phục vụ vận hành hệ thống/slide; KHDH cuối vẫn giữ cấu trúc A–B–C–D thống nhất, không bắt buộc hiển thị từng tiết.

---

# VII. VISUAL ASSET RECORD — NỘI BỘ

## TikZ

```yaml
TIKZ_ASSET:
  id:
  lesson_id:
  ppct:
  activity_id:
  source_anchor:
  source:
  compile_status:
```

## Image Prompt

```yaml
IMAGE_PROMPT_ASSET:
  id:
  lesson_id:
  ppct:
  activity_id:
  source_anchor:
  prompt:
```

---

# VIII. QA BẮT BUỘC CHO FORM_NEW

## 1. SOURCE_QA

- [ ] Đúng PL1.
- [ ] Đúng PPCT.
- [ ] Đúng SGK.
- [ ] Đúng KHDH cũ nếu nâng cấp.
- [ ] Không thêm dữ kiện ngoài nguồn.

## 2. TARGET_QA

- [ ] I.1 Kiến thức chỉ là danh mục ngắn.
- [ ] Không chép YCCĐ vào Kiến thức.
- [ ] Năng lực gắn với hoạt động.
- [ ] Phẩm chất gắn với biểu hiện.

## 3. FORMAT_QA

- [ ] Tiến trình chỉ dùng 2 cột.
- [ ] Mỗi hoạt động đủ a/b/c/d.
- [ ] Tổ chức thực hiện đủ 4 bước.
- [ ] Bài nhiều tiết có tổng thời lượng đúng số tiết và giữ cấu trúc A–B–C–D.

## 4. VISUAL_ASSET_QA

- [ ] Bài cần hình chính xác có TikZ.
- [ ] TikZ đặt ngay dưới nội dung.
- [ ] Nội dung cần ảnh có prompt ảnh.
- [ ] Prompt đặt ngay dưới nội dung.
- [ ] Không dùng ảnh AI thay hình Toán chính xác.
- [ ] Asset đúng PPCT/activity.

## 5. MATH_QA

- [ ] Math canonical hợp lệ.
- [ ] Không đổi dữ kiện.
- [ ] KaTeX preview OK nếu dùng preview.
- [ ] DOCX FINAL dùng OMML native.
- [ ] `remaining_raw_latex = 0`.

## 6. PERIOD/TIME_QA

- [ ] Tổng số tiết đúng PL1/PPCT.
- [ ] Tổng thời lượng phù hợp số tiết.
- [ ] KHDH cuối giữ đúng 4 phần A–B–C–D.
- [ ] Không bắt buộc xuất tiêu đề `TIẾT [PPCT]`.
- [ ] PERIOD_MAP nội bộ (nếu dùng) vẫn ánh xạ đúng PPCT để phục vụ slide.
- [ ] Không lẫn nội dung giữa các period nội bộ.

## 7. FINAL

Chỉ đạt:

```text
FORM_NEW_QA_OK
```

khi các lớp QA bắt buộc đều đạt.

---

# IX. QUY TẮC NÂNG CẤP KHDH CŨ

Nếu `MODE = NANG_CAP`:

```yaml
PRESERVE:
  structure: true
  content: true
  questions: true
  exercises: true
  source_data: true
  math: true
  images: true
  tables: true
  products: true
  activity_order: true
```

Được phép bổ sung:
- bảo đảm đúng số tiết và tổng thời lượng; có thể lập PERIOD_MAP nội bộ mà không hiển thị tiêu đề từng tiết;
- NLS/AI có nguồn;
- math canonical/OMML metadata;
- TikZ cho hình cần chính xác;
- prompt ảnh minh họa;
- QA metadata;
- chuẩn hóa form 2 cột.

Không được:
- rút gọn nội dung cũ trái yêu cầu;
- đổi bài tập;
- đổi số liệu;
- thay đáp án;
- đảo thứ tự hoạt động;
- “viết hay hơn” bằng cách thay nội dung nguồn.

---

# X. QUY TẮC ĐẦU RA

## KHDH

```text
TIET_[PPCT1_PPCT2_...]_[TEN_BAI].DOCX
```

## Slide

```text
1 PPCT = 1 deck = 15–20 slide
```

## Canva

```text
1 slide = 1 CANVA_SLIDE_PROMPT code block
```

## NotebookLM

```text
1 PPCT = 1 NOTEBOOKLM_SLIDE_DECK.md
```

---

# XI. LỆNH HỆ THỐNG TƯƠNG THÍCH

```text
KHOI_DONG
DANH_MUC
SOAN_XUAT [MÃ]
SOAN_MOI [MÃ]
NANG_CAP [MÃ]
RA_SOAT_NHANH
KIEM_TRA_TOAN
XUAT_WORD_OMML
TAO_SLIDE_NGHIEN_CUU
CANVA_TIET [PPCT]
XUAT_CANVA_PROMPT
CANVA_SLIDE [PPCT] [SO_SLIDE]
TIEP_THEO
```

---

# XII. GHI CHÚ THỰC THI CHO AGENT

- `KhdhBuilderAgent` dùng FORM_NEW làm form chính.
- `MathAgent` chỉ xử lý math node.
- `VisualAssetAgent` chỉ xử lý TikZ/prompt ảnh.
- `PeriodPlannerAgent` không phụ thuộc vào tiêu đề `TIẾT [PPCT]`; phải suy ra `PERIOD_MAP` nội bộ từ PPCT, thời lượng, hoạt động và sản phẩm.
- `SlideAgent` dùng `PERIOD_MAP`.
- `CanvaNotebookAgent` kế thừa math/visual asset đúng tiết.
- `QAAgent` kiểm tra toàn bộ trước FINAL.
