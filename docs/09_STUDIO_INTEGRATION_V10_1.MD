# 09_STUDIO_INTEGRATION_V10.1.MD
# STUDIO / WEBAPP INTEGRATION – V10.1.1

# I. KIẾN TRÚC

Studio/WebApp nên tách 4 tầng:

```text
SOURCE LAYER
PL1 + PPCT + SGK + KHDH cũ

AI LAYER
LESSON ROUTER + KHDH BUILDER + SLIDE/CANVA PLANNER

MATH/EXPORT LAYER
KaTeX preview + OMML converter + DOCX exporter

QA LAYER
source/content/math/layout/slide/canva
```

# II. DATA MODEL CÔNG THỨC

Khuyến nghị lưu công thức dạng object:

```json
{
  "type": "math",
  "display": "inline",
  "tex": "x^2-5x+6=0"
}
```

Từ cùng `tex`:
- web → KaTeX;
- Word → OMML.

Nếu dữ liệu hiện là Markdown `$...$`, parser V10 xử lý ở export layer.

# III. NÚT XUẤT WORD

Không chỉ lưu raw AI text.

Pseudo-flow:

```text
validateMathSource()
buildDocxDraft()
convertMathToOmml()
validateOmmlDocx()
renderCheck()
if PASS → downloadFinalDocx()
else → MATH_EXPORT_BLOCKED
```

# IV. BACKEND OMML

Khuyến nghị:
- Python + Pandoc + `tools/OMML_ENGINE_V10.py`;
- hoặc service TeXMath → OMML tương đương.

Không lấy HTML KaTeX rồi chụp ảnh đưa vào Word.

# V. ENDPOINT GỢI Ý

```text
POST /api/export-khdh-word
POST /api/generate-period-slides
POST /api/export-canva-prompts
```

# VI. SLIDE/CANVA

Backend phải sử dụng `PERIOD_RECORD`:

`1 PERIOD_RECORD → 1 deck 15–20 slide → 15–20 Canva prompts`

Không chia deck bằng số trang máy móc sau khi đã sinh nội dung.

# VII. FAIL-CLOSED

Không dùng:

```text
convert OMML lỗi → vẫn tải file chứa LaTeX
```

Phải dùng:

```text
convert lỗi → MATH_EXPORT_BLOCKED → báo vị trí lỗi → sửa → chạy lại
```

# VIII. TEST TỐI THIỂU

Math:
- inline;
- phân số;
- căn;
- mũ/chỉ số;
- hệ phương trình;
- ma trận;
- `\mathbb{R}`;
- chuỗi suy luận dài trong bảng.

KHDH:
- 1 tiết;
- 2 tiết;
- 4 tiết;
- PPCT không liên tiếp;
- tên bài lặp;
- có/không KHDH cũ.

Slide/Canva:
- đúng 15–20 slide mỗi tiết;
- số deck = số tiết;
- không lẫn nội dung giữa tiết.



# IX. TRIỂN KHAI THỰC TẾ TRONG GOOGLE AI STUDIO BUILD MODE

Google AI Studio Build mode dùng web app full-stack với server runtime Node.js. Vì vậy:

## Phương án A – Khuyến nghị cho AI Studio
Dùng converter OMML chạy Node.js ở server:
- package `latex-to-omml`, hoặc
- thư viện DOCX có hỗ trợ OMML/native Math.

Luồng:

`Markdown/TeX source → parse math → LaTeX-to-OMML → DOCX native → MATH_QA`

## Phương án B – Python engine
`tools/OMML_ENGINE_V10.py` dùng tốt khi:
- chạy local;
- chạy server riêng;
- Cloud Run/backend có Python + Pandoc.

Không mặc định giả định AI Studio Node runtime có sẵn Python/Pandoc.

# X. VISUAL ASSET LAYER

App phải phân biệt:

```json
{
  "type": "tikz",
  "source": "\\\\begin{tikzpicture}..."
}
```

và:

```json
{
  "type": "image_prompt",
  "prompt": "..."
}
```

Quy tắc:
- TikZ là nguồn chuẩn cho hình Toán chính xác.
- Có thể biên dịch TikZ thành SVG/PNG để preview/chèn slide.
- Prompt ảnh dùng cho minh họa thực tế, không thay TikZ.
- Asset phải gắn `lesson_id`, `ppct`, `activity_id` để không lẫn tiết.

# XI. ENDPOINT V10.1 GỢI Ý

```text
POST /api/index-sources
POST /api/generate-khdh
POST /api/export-khdh-word
POST /api/compile-tikz
POST /api/generate-period-slides
POST /api/export-canva-prompts
POST /api/run-qa
```
