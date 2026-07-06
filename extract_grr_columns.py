# -*- coding: utf-8 -*-
"""
GaiaStat2grrConfig의 A열 헤더만 테스트 로그 CSV에서 추출하여 새 CSV로 저장.
대용량(200MB+) 파일을 메모리 스트리밍으로 처리.
"""

import csv
import sys
from pathlib import Path


def load_config_headers(config_path: str) -> list[str]:
    """GaiaStat2grrConfig CSV에서 A열 헤더 목록 로드. 1~3행은 메타이므로 4행부터 A열만 수집."""
    headers = []
    with open(config_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        for i, row in enumerate(reader):
            if i < 3:  # 1~3행 스킵
                continue
            if row and row[0].strip():
                headers.append(row[0].strip())
    return headers


def extract_columns(
    config_path: str,
    log_path: str,
    output_path: str,
    *,
    buffer_size: int = 256 * 1024,
) -> None:
    """
    config의 헤더에 해당하는 컬럼만 로그에서 추출해 output CSV로 저장.
    전체 파일을 한 번에 올리지 않고 행 단위로 스트리밍.
    """
    wanted = load_config_headers(config_path)

    with open(log_path, "r", encoding="utf-8-sig", newline="", buffering=buffer_size) as inf, open(
        output_path, "w", encoding="utf-8-sig", newline="", buffering=buffer_size
    ) as outf:
        reader = csv.reader(inf)
        writer = csv.writer(outf)
        log_headers = next(reader)

        # 테스트 로그 1행(헤더)에서 원하는 헤더의 인덱스 수집 (config 순서 유지)
        name_to_index = {name: i for i, name in enumerate(log_headers)}
        indices_in_order = []
        for h in wanted:
            if h in name_to_index:
                indices_in_order.append((h, name_to_index[h]))

        if not indices_in_order:
            raise ValueError(
                "테스트 로그에 GaiaStat2grrConfig 헤더와 일치하는 컬럼이 없습니다. "
                "헤더 이름/인코딩을 확인하세요."
            )

        out_headers = [h for h, _ in indices_in_order]
        index_list = [i for _, i in indices_in_order]
        writer.writerow(out_headers)

        for row in reader:
            if len(row) <= max(index_list):
                out_row = [row[i] if i < len(row) else "" for i in index_list]
            else:
                out_row = [row[i] for i in index_list]
            writer.writerow(out_row)


def _get_base_folder() -> Path:
    """스크립트 또는 exe가 있는 폴더 반환 (PyInstaller exe에서도 동작)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def main():
    folder = _get_base_folder()
    config_path = folder / "GaiaStat2grrConfig.csv"

    if not config_path.exists():
        print("GaiaStat2grrConfig.csv를 찾을 수 없습니다.", file=sys.stderr)
        sys.exit(1)

    # 인자: [테스트로그.csv] [출력.csv] (둘 다 생략 시 폴더에서 로그 자동 선택)
    if len(sys.argv) >= 2:
        log_path = Path(sys.argv[1])
        if not log_path.is_absolute():
            log_path = folder / log_path
    else:
        candidates = [
            f for f in folder.iterdir()
            if f.suffix.lower() == ".csv" and f.name != "GaiaStat2grrConfig.csv"
        ]
        if not candidates:
            print("테스트 로그 CSV 파일이 없습니다. 사용법: python extract_grr_columns.py <테스트로그.csv> [출력.csv]", file=sys.stderr)
            sys.exit(1)
        log_path = max(candidates, key=lambda p: p.stat().st_size)

    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2])
        if not output_path.is_absolute():
            output_path = folder / output_path
    else:
        output_path = folder / f"{log_path.stem}_grr_only.csv"
        if output_path.exists():
            output_path = folder / f"{log_path.stem}_grr_only_new.csv"

    if not log_path.exists():
        print("테스트 로그 파일을 찾을 수 없습니다:", log_path, file=sys.stderr)
        sys.exit(1)

    print("Config:", config_path.name)
    print("로그:", log_path.name)
    print("출력:", output_path.name)

    headers = load_config_headers(str(config_path))
    print(f"Config 헤더 수: {len(headers)}")

    extract_columns(str(config_path), str(log_path), str(output_path))
    print("완료:", output_path)


if __name__ == "__main__":
    main()
