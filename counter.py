"""글자수 세기 - 자소서나 리포트의 글자수를 세어주는 작은 도구."""

import sys


def count_chars(text):
    """공백을 포함한 전체 글자수를 센다."""
    return len(text)


def count_chars_no_space(text):
    """공백을 제외한 글자수를 센다. 띄어쓰기뿐 아니라 줄바꿈과 탭도 뺀다."""
    return len("".join(text.split()))


def count_words(text):
    """단어 개수를 센다. 연속된 공백이나 줄바꿈은 구분자 하나로 본다."""
    return len(text.split())


def count_lines(text):
    """줄 수를 센다. 맨 끝의 줄바꿈은 새로운 줄로 세지 않는다."""
    return len(text.splitlines())


def summarize(text):
    """모든 지표를 한 번에 계산해 사전으로 돌려준다."""
    return {
        "공백 포함": count_chars(text),
        "공백 제외": count_chars_no_space(text),
        "단어": count_words(text),
        "줄": count_lines(text),
    }


def main():
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            text = f.read()
    else:
        text = sys.stdin.read()

    for label, value in summarize(text).items():
        print(f"{label}: {value}")


if __name__ == "__main__":
    main()
