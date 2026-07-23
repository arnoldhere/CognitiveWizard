import io
import re
import logging
from typing import Any, Dict, List
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

logger = logging.getLogger(__name__)

# Colors
PRIMARY = colors.HexColor("#0D9488")      # Teal
PRIMARY_DARK = colors.HexColor("#0F766E") # Dark Teal
SECONDARY = colors.HexColor("#06B6D4")    # Cyan
ACCENT = colors.HexColor("#F97316")       # Coral
TEXT_DARK = colors.HexColor("#0F2027")    # Charcoal
TEXT_LIGHT = colors.HexColor("#4A6572")   # Muted Gray
BG_SOFT = colors.HexColor("#F0FBF8")      # Mint Soft
BORDER_COLOR = colors.HexColor("#CCFBF1") # Soft Border


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to add 'Page X of Y' and standard header/footer.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_LIGHT)

        # Footer divider line
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(36, 40, 612 - 36, 40)

        # Footer Text
        footer_text = "CognitiveWizard AI Roadmap • Generated with Reference Retriever Agent"
        self.drawString(36, 26, footer_text)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 36, 26, page_str)
        self.restoreState()


def clean_text(text: str) -> str:
    if not text:
        return ""
    # Escapes HTML special chars for ReportLab Paragraphs
    text = str(text)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return text


def generate_roadmap_pdf(content_data: Dict[str, Any], topic_name: str = "") -> bytes:
    """
    Build a high-quality, professional PDF for an AI Roadmap using ReportLab.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        "PDFTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY_DARK,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "PDFSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=TEXT_LIGHT,
        spaceAfter=12,
    )

    section_heading = ParagraphStyle(
        "PDFSectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=PRIMARY_DARK,
        spaceBefore=14,
        spaceAfter=8,
    )

    phase_header_style = ParagraphStyle(
        "PDFPhaseHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.white,
    )

    topic_title_style = ParagraphStyle(
        "PDFTopicTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=PRIMARY_DARK,
    )

    body_style = ParagraphStyle(
        "PDFBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
    )

    muted_body_style = ParagraphStyle(
        "PDFMutedBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=TEXT_LIGHT,
    )

    link_style = ParagraphStyle(
        "PDFLink",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=SECONDARY,
    )

    story = []

    # 1. Header Banner
    title = clean_text(content_data.get("title") or topic_name or "AI Learning Roadmap")
    desc = clean_text(
        content_data.get("description")
        or "A structured milestone roadmap generated with AI and reference retriever intelligence."
    )
    goal = clean_text(content_data.get("goal") or "Master Core Concepts")
    difficulty = clean_text(content_data.get("skill_level") or "Intermediate")
    learning_style = clean_text(content_data.get("learning_style") or "Visual & Project-based")

    story.append(Paragraph(title, title_style))
    story.append(
        Paragraph(
            f"Topic: <b>{clean_text(topic_name or title)}</b> | Skill Level: <b>{difficulty}</b> | Style: <b>{learning_style}</b>",
            subtitle_style,
        )
    )
    story.append(Paragraph(desc, body_style))
    story.append(Spacer(1, 10))

    # Meta Grid Box
    meta_table_data = [
        [
            Paragraph(f"<b>Primary Goal:</b> {goal}", body_style),
            Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%b %d, %Y')}", body_style),
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[360, 180])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_SOFT),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # 2. Learning Phases & Milestones
    story.append(Paragraph("Learning Milestones & Phases", section_heading))
    story.append(
        HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10, spaceBefore=0)
    )

    phasewise = content_data.get("phasewise_modules") or []
    modules = content_data.get("modules") or []

    phases_to_render = []
    if phasewise:
        for idx, pm in enumerate(phasewise):
            p_title = pm.get("phase") or f"Phase {idx + 1}"
            sub_mods = pm.get("modules") or []
            first_m = sub_mods[0] if sub_mods else {}
            t_list = []
            for m in sub_mods:
                t_list.extend(m.get("topics") or [])
            phases_to_render.append(
                {
                    "title": p_title,
                    "est_time": first_m.get("estimated_time") or "1-2 Weeks",
                    "description": first_m.get("description") or "",
                    "topics": t_list or first_m.get("topics") or [],
                    "deliverables": first_m.get("deliverables") or first_m.get("practical_tasks") or [],
                }
            )
    elif modules:
        for idx, m in enumerate(modules):
            phases_to_render.append(
                {
                    "title": m.get("title") or f"Phase {idx + 1}",
                    "est_time": m.get("estimated_time") or "Flexible",
                    "description": m.get("description") or m.get("details") or "",
                    "topics": m.get("topics") or [],
                    "deliverables": m.get("deliverables") or m.get("key_takeaways") or [],
                }
            )

    for p_idx, phase in enumerate(phases_to_render):
        phase_elements = []

        # Phase Header Banner
        p_title_text = clean_text(phase["title"])
        p_time_text = clean_text(phase["est_time"])
        header_table = Table(
            [
                [
                    Paragraph(f"Phase {p_idx + 1}: {p_title_text}", phase_header_style),
                    Paragraph(
                        f"<font color='#FFFFFF'>Est. Time: {p_time_text}</font>",
                        ParagraphStyle("RAlign", parent=phase_header_style, alignment=2),
                    ),
                ]
            ],
            colWidths=[400, 140],
        )
        header_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), PRIMARY),
                    ("PADDING", (0, 0), (-1, -1), 6),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        phase_elements.append(header_table)

        # Description if present
        if phase["description"]:
            phase_elements.append(Spacer(1, 4))
            phase_elements.append(
                Paragraph(f"<i>{clean_text(phase['description'])}</i>", muted_body_style)
            )

        # Topics Table
        topics = phase.get("topics") or []
        if topics:
            phase_elements.append(Spacer(1, 6))
            topic_rows = []
            for t in topics:
                t_name = clean_text(t.get("name") if isinstance(t, dict) else str(t))
                t_details = clean_text(
                    t.get("details") or t.get("description") or t.get("content") or ""
                    if isinstance(t, dict)
                    else ""
                )
                t_task = clean_text(t.get("practical_task") or "" if isinstance(t, dict) else "")

                row_cell = [
                    Paragraph(f"• <b>{t_name}</b>", topic_title_style),
                ]
                if t_details:
                    row_cell.append(Paragraph(t_details, body_style))
                if t_task:
                    row_cell.append(
                        Paragraph(f"<font color='#0D9488'><b>Task:</b> {t_task}</font>", body_style)
                    )

                topic_rows.append([row_cell])

            t_table = Table(topic_rows, colWidths=[540])
            t_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFAFA")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#F3F4F6")),
                        ("PADDING", (0, 0), (-1, -1), 6),
                    ]
                )
            )
            phase_elements.append(t_table)

        # Deliverables
        deliverables = phase.get("deliverables") or []
        if deliverables:
            phase_elements.append(Spacer(1, 4))
            deliv_texts = []
            for d in deliverables:
                d_str = clean_text(d if isinstance(d, str) else d.get("title", ""))
                deliv_texts.append(f"✓ {d_str}")
            deliv_p = Paragraph(
                f"<b>Deliverables:</b> { ' | '.join(deliv_texts) }", muted_body_style
            )
            phase_elements.append(deliv_p)

        phase_elements.append(Spacer(1, 10))
        story.append(KeepTogether(phase_elements))

    # 3. Curated References (Agent Output)
    references = content_data.get("references") or {}
    if references and any(references.values()):
        story.append(Spacer(1, 8))
        story.append(Paragraph("Agent-Curated Reference Resources", section_heading))
        story.append(
            HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=10, spaceBefore=0)
        )

        cat_names = {
            "youtube": "Video Tutorials (YouTube)",
            "article": "Curated Articles & Guides",
            "official_docs": "Official Documentation",
            "course": "Courses & Repositories",
            "research_paper": "Research Papers",
        }

        ref_rows = []
        for cat_key, cat_label in cat_names.items():
            items = references.get(cat_key) or []
            if not items:
                continue

            ref_rows.append(
                [Paragraph(f"<b>{cat_label}</b>", topic_title_style), Paragraph("", body_style)]
            )
            for item in items[:4]:  # limit to top 4 per cat
                r_title = clean_text(item.get("title") or "Resource Link")
                r_url = clean_text(item.get("url") or "")
                r_desc = clean_text(item.get("description") or "")

                link_html = f"<a href='{r_url}'><u>{r_title}</u></a>" if r_url else r_title
                desc_text = f" - {r_desc[:90]}..." if len(r_desc) > 90 else (f" - {r_desc}" if r_desc else "")

                ref_rows.append(
                    [
                        Paragraph(f"• {link_html}{desc_text}", body_style),
                        Paragraph(item.get("source") or "", muted_body_style),
                    ]
                )

        if ref_rows:
            ref_table = Table(ref_rows, colWidths=[420, 120])
            ref_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), BG_SOFT),
                        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E6F7F3")),
                        ("PADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            story.append(ref_table)
            story.append(Spacer(1, 14))

    # 4. Capstone Project
    story.append(
        KeepTogether(
            [
                Paragraph("Capstone Showcase Project", section_heading),
                HRFlowable(
                    width="100%", thickness=1, color=PRIMARY, spaceAfter=8, spaceBefore=0
                ),
                Paragraph(
                    f"Synthesize everything learned in this <b>{title}</b> roadmap into a full-stack open-source showcase project.",
                    body_style,
                ),
                Spacer(1, 4),
                Paragraph(
                    "<b>Key Deliverables:</b> Live application demo | GitHub repository | README setup guide & unit tests",
                    muted_body_style,
                ),
            ]
        )
    )

    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
