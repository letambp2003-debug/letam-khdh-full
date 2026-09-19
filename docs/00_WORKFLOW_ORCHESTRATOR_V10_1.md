# WORKFLOW ORCHESTRATOR V10.1

> Tầng điều phối, không tính vào 10 Agent chuyên môn.

## 1. Mục tiêu
Quản lý thứ tự, trạng thái, retry, timeout, handoff, lock và rollback.  
Không tự thực hiện nghiệp vụ chuyên môn thuộc 10 Agent.

## 2. Pipeline chính
```text
SourceIndexerAgent
→ LessonRouterAgent
→ OldKhdhMatcherAgent
→ KhdhBuilderAgent
→ [MathAgent || VisualAssetAgent]
→ QA PRECHECK
→ PeriodPlannerAgent
→ SlideAgent
→ CanvaNotebookAgent
→ QAAgent
→ EXPORT FINAL
```

## 3. Gate
- SourceIndexerAgent phải pass trước LessonRouterAgent.
- LessonRouterAgent phải có PPCT status hợp lệ.
- OldKhdhMatcherAgent phải xác định mode.
- KhdhBuilderAgent tạo draft.
- MathAgent và VisualAssetAgent chạy song song khi có request.
- Không chạy PeriodPlannerAgent khi KHDH/content/visual/math source còn blocking error.
- Không chạy CanvaNotebookAgent trước SlideAgent.
- Không export trước `FINAL_QA_OK`.

## 4. Retry
Mỗi lỗi phải retry đúng owner:
```yaml
MAX_RETRY_PER_AGENT: 2
ON_CONFLICT: REQUIRE_USER_CONFIRMATION
ON_BLOCKED: STOP_WORKFLOW
ON_WARNING: CONTINUE_IF_NON_BLOCKING
```

## 5. Lock
Sau mỗi phase đạt QA:
```text
LOCK_SOURCE
LOCK_ROUTE
LOCK_KHDH_BASE
LOCK_PERIOD_MAP
LOCK_SLIDE_PLAN
```

Agent sau không được sửa module đã lock, trừ khi QA phát hiện lỗi phụ thuộc.

## 6. Job State
```json
{
  "job_id": "JOB-...",
  "lesson_id": "...",
  "current_agent": "...",
  "phase": 1,
  "status": "RUNNING",
  "locks": [],
  "warnings": [],
  "errors": [],
  "artifacts": {}
}
```

## 7. Lệnh người dùng
```text
KHOI_DONG
DANH_MUC
SOAN_XUAT [MÃ]
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

## 8. Mapping
- `KHOI_DONG` → SourceIndexerAgent
- `SOAN_XUAT` → Route → Match → Builder → Math/Visual → QA
- `TAO_SLIDE_NGHIEN_CUU` → PeriodPlannerAgent → SlideAgent → QA
- `XUAT_CANVA_PROMPT` → CanvaNotebookAgent → QA
- `XUAT_WORD_OMML` → MathAgent → QA
- `RA_SOAT_NHANH` → QAAgent với DELTA_QA
