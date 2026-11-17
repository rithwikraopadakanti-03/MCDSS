"""
pdf_exporter.py
Generates professional PDF reports for MCDSS decision analysis using ReportLab.
"""
import io
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_pdf_report(report_data: Dict[str, Any]) -> bytes:
    """
    Generates a professional PDF report from MCDSS decision data.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Custom Styles ──────────────────────────────────────────────
    title_style = ParagraphStyle(
        "MCDSSTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#6C63FF"),
        spaceAfter=6,
        alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "MCDSSSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#888888"),
        spaceAfter=4,
        alignment=TA_CENTER,
    )
    section_style = ParagraphStyle(
        "MCDSSSection",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#6C63FF"),
        spaceBefore=12,
        spaceAfter=6,
        borderPad=4,
    )
    body_style = ParagraphStyle(
        "MCDSSBody",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#333333"),
        spaceAfter=4,
        leading=14,
    )
    badge_style = ParagraphStyle(
        "MCDSSBadge",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#FFFFFF"),
        backColor=colors.HexColor("#6C63FF"),
        spaceAfter=4,
        alignment=TA_CENTER,
    )

    decision_name = report_data.get("decision_name", "MCDSS Decision")
    timestamp = datetime.now().strftime("%B %d, %Y %H:%M")

    # ── Cover Header ───────────────────────────────────────────────
    story.append(Paragraph("MCDSS — AI Decision Report", title_style))
    story.append(Paragraph(f"{decision_name}", subtitle_style))
    story.append(Paragraph(f"Generated: {timestamp}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#6C63FF")))
    story.append(Spacer(1, 6 * mm))

    # ── Confidence Summary ─────────────────────────────────────────
    confidence = report_data.get("confidence", {})
    if confidence:
        story.append(Paragraph("AI Confidence & Certainty", section_style))
        c_pct = confidence.get("certainty_percentage", 0)
        c_desc = confidence.get("confidence_desc", "N/A")
        reasons = confidence.get("reasons", [])
        story.append(Paragraph(f"<b>Confidence Level:</b> {c_desc} ({c_pct}%)", body_style))
        for r in reasons:
            story.append(Paragraph(f"• {r}", body_style))
        story.append(Spacer(1, 4 * mm))

    # ── Recommendation Summary ─────────────────────────────────────
    explanations = report_data.get("explanations", {})
    if explanations:
        story.append(Paragraph("Recommendation Summary", section_style))
        summary = explanations.get("recommendation_summary", "N/A")
        story.append(Paragraph(summary, body_style))
        story.append(Spacer(1, 4 * mm))

    # ── Ranked Results Table ───────────────────────────────────────
    ranked = report_data.get("ranked_alternatives", [])
    if ranked:
        story.append(Paragraph("Ranked Alternatives", section_style))
        table_data = [["Rank", "Alternative", "Utility Score", "CSP Status"]]
        for i, alt in enumerate(ranked, 1):
            score = alt.get("search_rank_utility", alt.get("utility_score", 0.0))
            status = alt.get("csp_status", "PASSED")
            table_data.append([
                str(i),
                alt.get("name", "—"),
                f"{score:.4f}",
                status
            ])

        t = Table(table_data, colWidths=[15 * mm, 60 * mm, 40 * mm, 40 * mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6C63FF")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F5F4FF"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 4 * mm))

    # ── Criteria & Weights ─────────────────────────────────────────
    criteria = report_data.get("criteria", {})
    weights = report_data.get("weights", {})
    if criteria:
        story.append(Paragraph("Criteria & Weights", section_style))
        crit_data = [["Criterion", "Type", "Weight", "Range"]]
        total_w = sum(weights.values()) or 1
        for cid, cinfo in criteria.items():
            w = weights.get(cid, 0)
            crit_data.append([
                cinfo.get("name", cid),
                cinfo.get("type", "benefit").capitalize(),
                f"{(w/total_w)*100:.1f}%",
                f"{cinfo.get('min','?')} – {cinfo.get('max','?')}"
            ])
        ct = Table(crit_data, colWidths=[55 * mm, 30 * mm, 30 * mm, 40 * mm])
        ct.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2D2B55")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F5F4FF"), colors.white]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(ct)
        story.append(Spacer(1, 4 * mm))

    # ── Constraint Analysis ────────────────────────────────────────
    failed = report_data.get("failed_alternatives", [])
    if failed:
        story.append(Paragraph("Constraint Rejections (CSP Analysis)", section_style))
        for alt in failed:
            story.append(Paragraph(
                f"<b>✗ {alt.get('name','?')}</b> — rejected due to constraint violations:",
                body_style
            ))
            for v in alt.get("violations", []):
                story.append(Paragraph(
                    f"  • {v.get('constraint_desc','?')} (actual value: {v.get('actual_value','?')})",
                    body_style
                ))
        story.append(Spacer(1, 4 * mm))

    # ── Strength Analysis ──────────────────────────────────────────
    strengths = explanations.get("strengths_analysis", [])
    if strengths:
        story.append(Paragraph("Strengths Analysis", section_style))
        for item in strengths:
            story.append(Paragraph(f"<b>{item.get('alternative_name','?')}</b>", body_style))
            for s in item.get("strengths", []):
                story.append(Paragraph(f"  • {s}", body_style))
        story.append(Spacer(1, 4 * mm))

    # ── Trade-off Analysis ─────────────────────────────────────────
    tradeoff = explanations.get("tradeoff_analysis", "")
    if tradeoff:
        story.append(Paragraph("Trade-off Analysis", section_style))
        story.append(Paragraph(tradeoff, body_style))
        story.append(Spacer(1, 4 * mm))

    # ── AI Reasoning Logic ─────────────────────────────────────────
    reasoning = explanations.get("reasoning_logic", "")
    if reasoning:
        story.append(Paragraph("AI Reasoning & Search Logic", section_style))
        story.append(Paragraph(reasoning, body_style))

    # ── Footer ─────────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CCCCCC")))
    story.append(Paragraph(
        "Generated by MCDSS — AI-Powered Multi-Criteria Decision Support System",
        subtitle_style
    ))

    doc.build(story)
    return buffer.getvalue()
