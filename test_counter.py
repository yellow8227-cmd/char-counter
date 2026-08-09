"""counter.py가 글자수를 제대로 세는지 확인하는 테스트."""

import unittest

from counter import (
    count_chars,
    count_chars_no_space,
    count_lines,
    count_words,
    summarize,
)


class CountCharsTest(unittest.TestCase):
    def test_공백을_포함해서_센다(self):
        self.assertEqual(count_chars("가나 다라"), 5)

    def test_빈_문자열은_0이다(self):
        self.assertEqual(count_chars(""), 0)


class CountCharsNoSpaceTest(unittest.TestCase):
    def test_공백을_뺀다(self):
        self.assertEqual(count_chars_no_space("가나 다라"), 4)

    def test_줄바꿈과_탭도_뺀다(self):
        self.assertEqual(count_chars_no_space("가나\n다라\t마"), 5)

    def test_빈_문자열은_0이다(self):
        self.assertEqual(count_chars_no_space("   \n  "), 0)


class CountWordsTest(unittest.TestCase):
    def test_공백으로_나눈다(self):
        self.assertEqual(count_words("가나 다라"), 2)

    def test_줄바꿈도_단어를_나눈다(self):
        self.assertEqual(count_words("가나\n다라"), 2)

    def test_공백이_여러_개여도_하나로_본다(self):
        self.assertEqual(count_words("가나   다라"), 2)

    def test_빈_문자열은_0이다(self):
        self.assertEqual(count_words(""), 0)

    def test_공백뿐이면_0이다(self):
        self.assertEqual(count_words("   "), 0)


class CountLinesTest(unittest.TestCase):
    def test_줄바꿈이_없으면_한_줄이다(self):
        self.assertEqual(count_lines("한 줄짜리"), 1)

    def test_줄바꿈_개수만큼_늘어난다(self):
        self.assertEqual(count_lines("첫 줄\n둘째 줄"), 2)

    def test_마지막_줄바꿈은_새_줄로_세지_않는다(self):
        self.assertEqual(count_lines("첫 줄\n둘째 줄\n"), 2)

    def test_윈도우_줄바꿈도_처리한다(self):
        self.assertEqual(count_lines("첫 줄\r\n둘째 줄"), 2)

    def test_빈_문자열은_0이다(self):
        self.assertEqual(count_lines(""), 0)


class SummarizeTest(unittest.TestCase):
    def test_네_가지_지표를_모두_돌려준다(self):
        결과 = summarize("안녕 하세요\n반갑습니다\n")
        self.assertEqual(
            결과,
            {
                "공백 포함": 13,
                "공백 제외": 10,
                "단어": 3,
                "줄": 2,
            },
        )


if __name__ == "__main__":
    unittest.main()
