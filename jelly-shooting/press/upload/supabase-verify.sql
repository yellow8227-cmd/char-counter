-- 젤리모 · 지킴막이 실제 시험 (SQL Editor 에 붙여넣고 Run)
-- 아래 세 줄은 "전부 에러가 나야" 정상입니다. 하나씩 따로 돌려 보세요.

-- ① 10초에 9억 점 → 막혀야 함
insert into scores(name,score,mode,dur,pop) values ('테스트',999999999,'normal',10,10);

-- ② 🔥 버티기 판인데 시간과 값이 다름 → 막혀야 함
insert into scores(name,score,mode,dur,pop) values ('테스트',5000,'fire_time',5,10);

-- ③ 남의 기록 고치기 → 0 rows (정책이 없어서 아무것도 안 바뀜)
update scores set score = 999999 where name = '아무개';

-- ④ 진짜 기록은 그대로 들어가야 함 (이건 성공해야 정상)
insert into scores(name,score,mode,dur,pop) values ('테스트',12400,'normal',180,420);
delete from scores where name = '테스트';   -- 뒷정리 (대시보드에서는 지워집니다)
