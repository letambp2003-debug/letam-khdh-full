# 06_MATH_OMML_V10.1.MD
# MATH PIPELINE V10.1 – KATEX PREVIEW + WORD EQUATION NATIVE OMML

# I. ĐIỂM CHỐT

**KaTeX ≠ OMML.**

- KaTeX: hiển thị công thức trên web.
- OMML: Word Equation native trong DOCX.

Dùng một nguồn canonical:

```text
MATH_CANONICAL (TeXMath/LaTeX profile V10)
        ├──→ KaTeX Preview
        └──→ TeXMath/Pandoc → OMML → DOCX FINAL
```

# II. NGUỒN TOÁN

- inline: `$...$`
- display: `$$...$$`

Không dùng ảnh công thức.
Không dùng Unicode gần đúng để thay cấu trúc toán.

# III. MATH PROFILE V10

Ưu tiên các cấu trúc Toán phổ thông:

```text
^  _
\frac  \dfrac
\sqrt
\left  \right
\begin{cases}...\end{cases}
\begin{aligned}...\end{aligned}
\begin{matrix|pmatrix|bmatrix}...\end{...}
\sum \prod \int \lim
\sin \cos \tan \log \ln
\mathbb
\Rightarrow \Leftrightarrow \to
\le \ge \ne \approx
\overline \bar \hat \vec
Greek symbols
```

Không cho phép trong pipeline FINAL:
- `\newcommand`, `\def`;
- macro tự định nghĩa;
- lệnh phụ thuộc package;
- TikZ trong Equation;
- HTML/SVG trong Equation.

Gặp lệnh ngoài profile:

`UNSUPPORTED_MATH_COMMAND`

và dừng xuất FINAL.

# IV. PHÂN BIỆT MATH VÀ TEXT

Không đặt trong `$...$`:
- HĐ1, HĐ2;
- mã NLS;
- số bài 1.8, 1.9 khi chỉ là mã;
- số trang;
- nhãn “PT (1)”.

# V. XUẤT WORD

## Route A – Direct OMML

`MATH_CANONICAL → OMML → DOCX`

## Route B – Auto Postprocess

`DOCX_DRAFT chứa MATH_CANONICAL → OMML_ENGINE_V10 → DOCX_FINAL`

Không có fallback “giữ LaTeX trong Word”.

Nếu engine không sẵn sàng:

`MATH_EXPORT_BLOCKED`

# VI. DOCX FINAL BẮT BUỘC

- không `$`, `$$`, `\(`, `\)`, `\[`, `\]`;
- không `\frac`, `\begin`, `\sqrt`, `\Rightarrow` thô;
- công thức là `m:oMath` / `m:oMathPara`;
- Word chỉnh sửa được Equation;
- không dùng ảnh;
- giữ đúng phân số, căn, chỉ số, hệ, ma trận, tập số, mũi tên.

# VII. CHỐNG TRÀN BẢNG

Word Equation không wrap tốt trong cột hẹp.

Chuỗi suy luận dài phải tách tại:
- `\Rightarrow`;
- `\Leftrightarrow`;
- điểm logic phù hợp.

Không tách giữa:
- tử/mẫu;
- căn;
- hệ;
- ma trận.

# VIII. MATH SOURCE QA

Trước xuất:

```yaml
delimiter_balance: OK
unsupported_math_commands: 0
unbalanced_braces: 0
failed_parse_nodes: 0
```

Đạt: `MATH_SOURCE_OK`

# IX. MATH DOCX QA

Sau xuất:

```yaml
remaining_math_delimiters: 0
remaining_raw_latex: 0
unsupported_math_commands: 0
failed_math_nodes: 0
omml_native: true
equation_as_image: false
table_overflow: false
```

Đạt: `MATH_QA_OK`

Chỉ `MATH_QA_OK` mới được gọi là DOCX FINAL.
