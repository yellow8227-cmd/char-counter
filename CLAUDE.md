# char-counter

## 한국어 글은 humanize-korean 을 거친다

이 저장소에서 **한국어 산문을 쓰거나 고칠 때마다** `.claude/plugins/humanize-korean` 의
규칙을 적용한다. README·분석 문서·컷 카드 설명·커밋 메시지 전부 해당한다.

```bash
# 점수 재기 (risk_band / risk_score)
python3 - <<'PY'
import sys; sys.path.insert(0, '.claude/plugins/humanize-korean/skills/humanize-korean/references')
import metrics_v2, pathlib
print(metrics_v2.compute_all(pathlib.Path('대상.md').read_text(encoding='utf-8'))['risk_band'])
PY

# 고치기 전후 게이트
python3 .claude/plugins/humanize-korean/scripts/verify_gates.py \
    --before 전.md --after 후.md --genre report
```

슬림 룰북: `.claude/skills/humanize-korean/references/quick-rules.md`

### 이 저장소에서 실제로 걸렸던 것

| 패턴 | 무엇 | 처방 |
|---|---|---|
| **C-11** | 연결어미(-고/-며/-라/-니/-어서) 직후 쉼표. 문장의 29%였다 | 쉼표를 뺀다. 열거용 쉼표만 남긴다 |
| **C-8** | 「A가 아니라 B」 대구. 6번 썼다 — 사람 글 실측 0건인 패턴이다 | 하나만 남기고 나머지는 직접 단언으로. 전멸시키지는 않는다 |
| **E-2** | 종결어미 단조 | 문단마다 단문 1~2개 + 긴 문장 1개 |

### 하지 않는 것

- 고유명사·수치·날짜·큰따옴표 안 직접 인용은 손대지 않는다
- 원문에 없던 비유·상투구를 새로 심지 않는다. **빼기만 한다**
- 격식체는 격식체로, 구어는 구어로 — 등급을 올리지도 내리지도 않는다
- 변경률 30% 초과면 경고, 50% 초과면 롤백

### 알려진 오탐

`verify_gates.py` 의 **P3 golden `footnote_*`** 축은 이 저장소에서 항상 FAIL 이 뜬다.
`(C64)` `(p.110~115)` `(1920×1080)` 같은 괄호 참조를 각주 표시로 읽는다.
문서에 실제 각주는 0개다. 이 축은 무시하고 P0·P1·P2·P5 로 판단한다.

## 스토리보드

`storyboard/` — 대본 분석과 컷 카드 덱. 만드는 법은 `storyboard/README.md`.
