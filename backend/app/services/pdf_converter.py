"""Markdown-to-PDF converter using fpdf2.

Parses simple markdown (headings, bold, bullets, paragraphs) and renders
them into a clean PDF with Korean font support (Malgun Gothic / fallback).
"""

from __future__ import annotations

import io
import logging
import os
import re
from pathlib import Path

from fpdf import FPDF

logger = logging.getLogger(__name__)

# Candidate Korean-capable TrueType font paths (Windows priority)
_FONT_CANDIDATES = [
    r"C:\Windows\Fonts\malgun.ttf",          # Malgun Gothic (맑은 고딕)
    r"C:\Windows\Fonts\NanumGothic.ttf",      # NanumGothic
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",   # Linux
    "/usr/share/fonts/naver-nanum/NanumGothic.ttf",
]

_BOLD_FONT_CANDIDATES = [
    r"C:\Windows\Fonts\malgunbd.ttf",
    r"C:\Windows\Fonts\NanumGothicBold.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/naver-nanum/NanumGothicBold.ttf",
]


def _find_font(candidates: list[str]) -> str | None:
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


class _ResumePDF(FPDF):
    """Custom FPDF subclass with Korean font and header/footer."""

    def __init__(self, font_path: str, bold_font_path: str | None) -> None:
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)
        self.add_page()

        # Register Korean fonts
        self.add_font("Korean", "", font_path, uni=True)
        self._has_bold = False
        if bold_font_path:
            self.add_font("Korean", "B", bold_font_path, uni=True)
            self._has_bold = True

        self.set_font("Korean", size=10)

    def _set_bold(self) -> None:
        if self._has_bold:
            self.set_font("Korean", "B")
        else:
            self.set_font("Korean", "")

    def _set_normal(self) -> None:
        self.set_font("Korean", "")


def markdown_to_pdf(markdown_text: str) -> bytes:
    """Convert markdown resume text to PDF bytes.

    Supports:  # H1, ## H2, ### H3, **bold**, - bullet lists, paragraphs.
    """
    font_path = _find_font(_FONT_CANDIDATES)
    if not font_path:
        raise RuntimeError(
            "Korean TrueType font not found. "
            "Install Malgun Gothic or NanumGothic."
        )
    bold_path = _find_font(_BOLD_FONT_CANDIDATES)

    pdf = _ResumePDF(font_path, bold_path)

    lines = markdown_text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        i += 1

        # Empty line → small vertical gap
        if not line.strip():
            pdf.ln(3)
            continue

        # Headings
        if line.startswith("### "):
            _render_heading(pdf, line[4:].strip(), size=12)
            continue
        if line.startswith("## "):
            _render_heading(pdf, line[3:].strip(), size=14)
            continue
        if line.startswith("# "):
            _render_heading(pdf, line[2:].strip(), size=18, underline=True)
            continue

        # Horizontal rule
        if re.match(r"^-{3,}$|^\*{3,}$|^_{3,}$", line.strip()):
            y = pdf.get_y()
            pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
            pdf.ln(4)
            continue

        # Bullet list
        if line.lstrip().startswith("- ") or line.lstrip().startswith("* "):
            indent = len(line) - len(line.lstrip())
            text = line.lstrip()[2:]
            _render_bullet(pdf, text, indent_level=indent // 2)
            continue

        # Regular paragraph
        _render_paragraph(pdf, line)

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def _render_heading(
    pdf: _ResumePDF, text: str, size: int, underline: bool = False
) -> None:
    """Render a markdown heading."""
    pdf.ln(4)
    pdf.set_font_size(size)
    pdf._set_bold()
    # Strip any residual bold markers
    text = text.replace("**", "")
    pdf.multi_cell(0, size * 0.55, text)
    if underline:
        y = pdf.get_y()
        pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
        pdf.ln(2)
    pdf.ln(2)
    pdf._set_normal()
    pdf.set_font_size(10)


def _render_bullet(pdf: _ResumePDF, text: str, indent_level: int = 0) -> None:
    """Render a bullet list item."""
    x_offset = pdf.l_margin + 5 + indent_level * 5
    pdf.set_x(x_offset)
    _write_rich_line(pdf, f"\u2022  {text}", width=pdf.w - x_offset - pdf.r_margin)


def _render_paragraph(pdf: _ResumePDF, text: str) -> None:
    """Render a regular paragraph line with inline bold support."""
    _write_rich_line(pdf, text, width=0)


def _write_rich_line(pdf: _ResumePDF, text: str, width: float = 0) -> None:
    """Write a line supporting **bold** inline markers."""
    w = width if width > 0 else (pdf.w - pdf.l_margin - pdf.r_margin)

    # Split on **bold** markers
    parts = re.split(r"(\*\*[^*]+\*\*)", text)
    for part in parts:
        if part.startswith("**") and part.endswith("**"):
            pdf._set_bold()
            pdf.write(5, part[2:-2])
            pdf._set_normal()
        else:
            pdf.write(5, part)
    pdf.ln(6)
