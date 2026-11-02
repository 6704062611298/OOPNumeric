# -*- coding: utf-8 -*-
"""Builds FastNumeric_Report.docx - รูปแบบเดียวกับ OuterSpace_Report_v2
(Leelawadee UI, หัวข้อน้ำเงินเข้ม, ตารางหัว shaded, กล่องโค้ด Consolas, เลขหน้า footer)
โค้ดตัวอย่างทั้งหมดดึงจากซอร์สจริงใน server/src
"""
import os
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

SRC = r"C:\Users\intel\Desktop\FastNumeric\server\src"
IMG = r"C:\Users\intel\Desktop\FastNumeric\report\shots"
OUT = r"C:\Users\intel\Desktop\FastNumeric\report\FastNumeric_Report.docx"

FONT = "Leelawadee UI"
CODE_FONT = "Consolas"
PENDING = "[ต้องเพิ่มเติมข้อมูล]"

doc = Document()

# ------------------------------------------------------------------ styles

def set_font(style_or_run, name, size=None, bold=None, color=None):
    f = style_or_run.font
    f.name = name
    el = style_or_run.element if hasattr(style_or_run, "element") else style_or_run._element
    rpr = el.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    for k in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        fonts.set(qn(k), name)
    if size is not None:
        f.size = Pt(size)
        szcs = rpr.find(qn("w:szCs"))
        if szcs is None:
            szcs = OxmlElement("w:szCs")
            rpr.append(szcs)
        szcs.set(qn("w:val"), str(int(size * 2)))
    if bold is not None:
        f.bold = bold
        bcs = rpr.find(qn("w:bCs"))
        if bold and bcs is None:
            rpr.append(OxmlElement("w:bCs"))
    if color is not None:
        f.color.rgb = color


normal = doc.styles["Normal"]
set_font(normal, FONT, 11)
normal.paragraph_format.space_after = Pt(4)
normal.paragraph_format.line_spacing = 1.2

for lvl, size in ((1, 17), (2, 13.5), (3, 12)):
    st = doc.styles["Heading %d" % lvl]
    set_font(st, FONT, size, True, RGBColor(0x1F, 0x2A, 0x44))
    st.paragraph_format.space_before = Pt(12 if lvl > 1 else 0)
    st.paragraph_format.space_after = Pt(5)
    st.paragraph_format.keep_with_next = True

cap = doc.styles["Caption"]
set_font(cap, FONT, 9.5, False, RGBColor(0x33, 0x33, 0x33))
cap.font.italic = False

from docx.enum.style import WD_STYLE_TYPE
tcap = doc.styles.add_style("Table Caption", WD_STYLE_TYPE.PARAGRAPH)
tcap.base_style = doc.styles["Normal"]
set_font(tcap, FONT, 10, True, RGBColor(0x33, 0x33, 0x33))
tcap.paragraph_format.keep_with_next = True
tcap.paragraph_format.space_before = Pt(6)

for name in ("List Bullet", "List Number"):
    set_font(doc.styles[name], FONT, 11)

sec = doc.sections[0]
sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
sec.left_margin, sec.right_margin = Cm(2.8), Cm(2.0)
sec.top_margin, sec.bottom_margin = Cm(2.3), Cm(2.0)

# ------------------------------------------------------------------ helpers

fig_no = {}
tab_no = {}
chapter = [0]


def para(text="", bold=False, align=None, size=None, indent=True, style=None):
    p = doc.add_paragraph(style=style)
    if indent and style is None:
        p.paragraph_format.first_line_indent = Cm(1.0)
    if align is not None:
        p.alignment = align
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_runs(p, text, bold, size)
    return p


def add_runs(p, text, bold=False, size=None):
    import re
    parts = re.split(r"(`[^`]+`|\*\*[^*]+\*\*)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("`"):
            r = p.add_run(part[1:-1])
            set_font(r, CODE_FONT, (size or 11) - 1)
        elif part.startswith("**"):
            r = p.add_run(part[2:-2])
            set_font(r, FONT, size, True)
        else:
            r = p.add_run(part)
            set_font(r, FONT, size, bold or None)


def bullet(text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Cm(1.2 + 0.8 * level)
    add_runs(p, text)
    return p


def numbered(items):
    for i, t in enumerate(items, 1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(1.6)
        p.paragraph_format.first_line_indent = Cm(-0.6)
        add_runs(p, "%d. %s" % (i, t))


def h1(text):
    chapter[0] += 1
    fig_no[chapter[0]] = 0
    tab_no[chapter[0]] = 0
    p = doc.add_heading(level=1)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("บทที่ %d\n%s" % (chapter[0], text))
    set_font(r, FONT, 17, True, RGBColor(0x1F, 0x2A, 0x44))


def h2(text):
    p = doc.add_heading(level=2)
    r = p.add_run(text)
    set_font(r, FONT, 13.5, True, RGBColor(0x1F, 0x2A, 0x44))


def h3(text):
    p = doc.add_heading(level=3)
    r = p.add_run(text)
    set_font(r, FONT, 12, True, RGBColor(0x1F, 0x2A, 0x44))


def figure(file, caption, width_cm):
    path = os.path.join(IMG, file)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(path, width=Cm(width_cm))
    fig_no[chapter[0]] += 1
    c = doc.add_paragraph(style="Caption")
    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_runs(c, "รูปที่ %d.%d %s" % (chapter[0], fig_no[chapter[0]], caption), size=9.5)
    return "%d.%d" % (chapter[0], fig_no[chapter[0]])


def figure_row(items, width_cm, caption):
    t = doc.add_table(rows=2, cols=len(items))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    labels = "กขคงจฉ"
    for i, (file, label) in enumerate(items):
        c = t.cell(0, i)
        cp = c.paragraphs[0]
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cp.add_run().add_picture(os.path.join(IMG, file), width=Cm(width_cm))
        lp = t.cell(1, i).paragraphs[0]
        lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(lp, "(%s) %s" % (labels[i], label), size=9)
    fig_no[chapter[0]] += 1
    c = doc.add_paragraph(style="Caption")
    c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_runs(c, "รูปที่ %d.%d %s" % (chapter[0], fig_no[chapter[0]], caption), size=9.5)
    return "%d.%d" % (chapter[0], fig_no[chapter[0]])


def shade(cell, hex_color):
    tcpr = cell._element.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcpr.append(shd)


def table(caption, header, rows, widths=None, size=9.5):
    tab_no[chapter[0]] += 1
    c = doc.add_paragraph(style="Table Caption")
    c.alignment = WD_ALIGN_PARAGRAPH.LEFT
    add_runs(c, "ตารางที่ %d.%d %s" % (chapter[0], tab_no[chapter[0]], caption), bold=True, size=10)
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(header):
        cell = t.rows[0].cells[i]
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(cell.paragraphs[0], h, bold=True, size=size)
        shade(cell, "DCE6F2")
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].paragraphs[0].paragraph_format.first_line_indent = Cm(0)
            for j, line in enumerate(str(v).split("\n")):
                pp = cells[i].paragraphs[0] if j == 0 else cells[i].add_paragraph()
                pp.paragraph_format.space_after = Pt(0)
                add_runs(pp, line, size=size)
    trpr = t.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement("w:tblHeader")
    th.set(qn("w:val"), "true")
    trpr.append(th)
    if widths:
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return t


def code(text, title=None):
    t = doc.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    cell = t.rows[0].cells[0]
    shade(cell, "F5F6F8")
    lines = text.rstrip("\n").split("\n")
    first = True
    if title:
        p = cell.paragraphs[0]
        r = p.add_run(title)
        set_font(r, FONT, 9, True, RGBColor(0x55, 0x55, 0x66))
        p.paragraph_format.space_after = Pt(2)
        first = False
    for line in lines:
        p = cell.paragraphs[0] if first else cell.add_paragraph()
        first = False
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line.replace("\t", "    ") or " ")
        set_font(r, CODE_FONT, 8)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def src(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8") as f:
        return f.read().split("\n")


def method(rel, signature, strip_doc=True):
    lines = src(rel)
    start = next(i for i, l in enumerate(lines) if signature in l)
    depth, out, opened = 0, [], False
    for l in lines[start:]:
        out.append(l)
        depth += l.count("{") - l.count("}")
        if "{" in l:
            opened = True
        if opened and depth <= 0:
            break
        if not opened and l.rstrip().endswith(";"):
            break
    indent = min(len(l) - len(l.lstrip()) for l in out if l.strip())
    return "\n".join(l[indent:] for l in out)


def lines_of(rel, first_contains, last_contains):
    lines = src(rel)
    a = next(i for i, l in enumerate(lines) if first_contains in l)
    b = next(i for i in range(a, len(lines)) if last_contains in lines[i])
    chunk = lines[a:b + 1]
    indent = min(len(l) - len(l.lstrip()) for l in chunk if l.strip())
    return "\n".join(l[indent:] for l in chunk)


def page_break():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ------------------------------------------------------------------ cover

def cover_line(text, size, bold=False, space=6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(space)
    r = p.add_run(text)
    set_font(r, FONT, size, bold)
    return p

doc.add_paragraph()
cover_line("รายงานโครงงาน", 20, True)
cover_line("FastNumeric", 32, True, 2)
cover_line("เว็บแอปพลิเคชันคำนวณวิธีเชิงตัวเลขพร้อมแสดงขั้นตอนการคำนวณ", 14, False, 18)
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run().add_picture(os.path.join(IMG, "dashboard.png"), width=Cm(6.5))
cover_line("จัดทำโดย", 14, True)
cover_line("%s   รหัสนักศึกษา %s" % (PENDING, PENDING), 13)
cover_line("%s   รหัสนักศึกษา %s" % (PENDING, PENDING), 13, space=24)
cover_line("เสนอ", 14, True)
cover_line("อาจารย์ %s" % PENDING, 13, space=24)
cover_line("รายงานนี้เป็นส่วนหนึ่งของรายวิชา %s" % PENDING, 13)
cover_line("ภาควิชา %s   คณะ %s" % (PENDING, PENDING), 13)
cover_line("มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ", 13)
cover_line("ภาคการศึกษาที่ %s ปีการศึกษา %s" % (PENDING, PENDING), 13)

body = doc.add_section(WD_SECTION.NEW_PAGE)
for s in doc.sections[1:]:
    s.footer.is_linked_to_previous = False
fp = doc.sections[1].footer.paragraphs[0]
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
rf = fp.add_run()
b = OxmlElement("w:fldChar"); b.set(qn("w:fldCharType"), "begin")
i = OxmlElement("w:instrText"); i.set(qn("xml:space"), "preserve"); i.text = "PAGE"
e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), "end")
rf._r.append(b); rf._r.append(i); rf._r.append(e)
set_font(rf, FONT, 10)

# ================================================================== CHAPTER 1
h1("บทนำ")

h2("1.1 ที่มาและความสำคัญของโปรเจ็ค")
para("ในการเรียนวิชาวิธีเชิงตัวเลข (Numerical Methods) ผู้เรียนต้องคำนวณคำตอบของปัญหาทางคณิตศาสตร์หลายประเภท "
     "เช่น การหารากของสมการ การแก้ระบบสมการเชิงเส้น การแทรกและการคาดคะเนค่า ตลอดจนการหาพื้นที่ใต้เส้นโค้งและอนุพันธ์เชิงตัวเลข "
     "ซึ่งแต่ละวิธีต้องทำการคำนวณซ้ำ ๆ จำนวนมาก ถ้าทำด้วยมือจะเสียเวลามากและเกิดข้อผิดพลาดได้ง่าย "
     "นอกจากนี้ผู้เรียนยังควรเข้าใจ **ขั้นตอนการคำนวณ** ของแต่ละวิธี ไม่ใช่แค่คำตอบสุดท้ายเท่านั้น")
para("โครงงาน **FastNumeric** จึงเป็นเว็บแอปพลิเคชันสำหรับคำนวณวิธีเชิงตัวเลขจำนวน 6 หมวด 11 วิธี "
     "โดยโปรแกรมไม่เพียงแสดงคำตอบสุดท้าย แต่แสดง **ขั้นตอนการคำนวณ** และ **ตารางการทำซ้ำ (Iteration Table)** ครบทุกขั้นตอน "
     "ผู้ใช้สามารถตรวจสอบการคำนวณย้อนกลับได้ทีละรอบ เหมาะกับการใช้ตรวจคำตอบและทบทวนวิธีทำของผู้เรียน "
     "และโปรแกรมยังบันทึกประวัติการคำนวณลงฐานข้อมูล นับจำนวนครั้งที่คำนวณโจทย์เดิม และสรุปสถิติบนหน้า Dashboard")
para("ด้านการพัฒนา โปรแกรมถูกออกแบบด้วยหลัก**การเขียนโปรแกรมเชิงวัตถุ (Object-Oriented Programming: OOP)** อย่างเต็มรูปแบบ "
     "ทั้งการซ่อนรายละเอียด (Encapsulation) การสืบทอดคุณสมบัติ (Inheritance) ความเป็นนามธรรม (Abstraction) "
     "รูปแบบพฤติกรรมหลากหลาย (Polymorphism) และการประกอบวัตถุ (Composition) "
     "เพื่อให้ระบบแยกชั้นความรับผิดชอบชัดเจนระหว่างชั้นรับข้อมูล ชั้นอัลกอริทึม และชั้นแสดงผล/จัดเก็บ "
     "ทำให้เพิ่มวิธีคำนวณใหม่ได้โดยไม่ต้องแก้โค้ดเดิม")

h2("1.2 ประเภทของโครงการ")
table("ประเภทของโครงการ ภาษา และเทคโนโลยีที่ใช้",
      ["หัวข้อ", "รายละเอียด"],
      [
          ["ประเภทของโปรแกรม", "เว็บแอปพลิเคชันประเภทพัฒนาซอฟต์แวร์ประยุกต์ (Application Development) "
           "ทำงานบนเว็บเบราว์เซอร์ ประกอบด้วยส่วนติดต่อผู้ใช้ (Frontend) ส่วนประมวลผล (Backend) และฐานข้อมูล"],
          ["ภาษาที่ใช้", "JavaScript (Node.js ฝั่งเซิร์ฟเวอร์ และ React ฝั่งผู้ใช้)"],
          ["เทคโนโลยีที่ใช้", "React 19 + Vite + Tailwind CSS (Frontend), Node.js + Express (REST API), "
           "SQLite ผ่าน node:sqlite (ฐานข้อมูล), Docker + Docker Compose (การติดตั้ง), Git (จัดการเวอร์ชัน)"],
          ["ข้อจำกัดที่ตั้งใจ", "ไม่ใช้ไลบรารีคำนวณสำเร็จรูปสำหรับอัลกอริทึมทั้ง 11 วิธี เขียนเองทั้งหมด "
           "และไม่ใช้ eval() ในการแปลงสมการ f(x) เพื่อความปลอดภัย"],
      ], widths=[3.6, 12.4])

h2("1.3 ประโยชน์")
numbered([
    "คำนวณวิธีเชิงตัวเลขได้ถูกต้อง รวดเร็ว ครอบคลุม 6 หมวด 11 วิธีที่ใช้เรียนในรายวิชาวิธีเชิงตัวเลข",
    "แสดงขั้นตอนการคำนวณและตารางการทำซ้ำทุกวิธี ช่วยให้ผู้เรียนเข้าใจกลไกของอัลกอริทึม ไม่ใช่แค่คำตอบ",
    "ตรวจคำตอบการบ้านหรือการคำนวณด้วยมือได้รวดเร็ว ลดข้อผิดพลาดจากการคำนวณซ้ำ ๆ",
    "บันทึกประวัติการคำนวณลงฐานข้อมูล นับจำนวนครั้งที่คำนวณโจทย์เดิม และสรุปสถิติให้เห็นภาพรวม",
    "เป็นตัวอย่างการนำหลัก OOP (Encapsulation, Inheritance, Abstraction, Polymorphism, Composition) "
    "ไปใช้กับโจทย์จริงด้านคณิตศาสตร์ เช่น การแยกชั้นอัลกอริทึมออกจากการแสดงผล",
])

h2("1.4 ขอบเขตของโครงการ")
para("ขอบเขตของโครงการครอบคลุมการคำนวณวิธีเชิงตัวเลข 6 หมวด 11 วิธี พร้อมระบบประวัติการคำนวณและ Dashboard สรุปสถิติ "
     "โดยตรวจสอบกับซอร์สโค้ดจริงของโปรแกรม")
h3("1.4.1 ฟังก์ชันของโปรแกรม")
table("ฟังก์ชันการคำนวณของแต่ละหมวด",
      ["หมวด", "วิธีคำนวณ", "คุณสมบัติที่พัฒนา"],
      [
          ["Root of Equation", "Bisection, Newton-Raphson",
           "หารากของสมการ f(x) = 0 แสดงตารางการทำซ้ำ ตรวจเงื่อนไข f(XL)·f(XU) < 0 และเงื่อนไขความลู่เข้า"],
          ["Linear Algebra", "Gauss Elimination",
           "แก้ระบบสมการเชิงเส้น n ตัวแปร (n = 2–6) ด้วยการตัดตัวแปรแบบ Partial Pivoting ตรวจเมทริกซ์เอกฐน"],
          ["Interpolation", "Linear, Lagrange", "หาค่าระหว่างจุดจากตาราง (x, y) ตรวจว่า x อยู่ในช่วงข้อมูลหรือไม่"],
          ["Extrapolation", "Linear", "คาดคะเนค่านอกช่วงข้อมูล ตรวจว่า x ต้องอยู่นอกช่วงจริง"],
          ["Integration", "Trapezoidal, Simpson's 1/3",
           "หาพื้นที่ใต้เส้นโค้งจากตารางจุด ตรวจว่า Simpson ต้องมีจำนวนช่วงเป็นเลขคู่ รองรับกรณี a > b"],
          ["Differentiation", "Forward, Backward, Central",
           "หาอนุพันธ์เชิงตัวเลขจากตารางจุด ตรวจว่าจุดที่เลือกมีเพื่อนบ้านครบตามสูตร"],
      ], widths=[3.4, 4.2, 8.4], size=9)
h3("1.4.2 คุณสมบัติเชิงระบบ")
bullet("กรอกสมการ f(x) ได้โดยตรง เช่น `x^3 - x - 2` โปรแกรมแยกวิเคราะห์สมการเองด้วย Expression Parser ที่เขียนขึ้นเอง (ไม่ใช้ eval)")
bullet("กำหนดค่า Tolerance และ Max Iterations ได้ พร้อมค่าเริ่มต้นที่เหมาะสม")
bullet("จัดการข้อผิดพลาดเป็นภาษาไทยที่อธิบายสาเหตุ เช่น หารด้วยศูนย์, เมทริกซ์เอกฐน, ไม่ลู่เข้า")
bullet("บันทึกประวัติการคำนวณลง SQLite นับโจทย์ซ้ำ (หมวด + วิธี + อินพุตเดิม) ลบรายการได้")
bullet("หน้า Dashboard สรุปสถิติ: จำนวนโจทย์, จำนวนครั้งที่คำนวณ, สัดส่วนตามหมวด, โจทย์ยอดนิยม")
bullet("ติดตั้งด้วย Docker Compose พร้อม health check และ named volume สำหรับเก็บฐานข้อมูลถาวร")
h3("1.4.3 ตารางเวลาการดำเนินโครงการ")
table("แผนการดำเนินโครงการ 6 สัปดาห์",
      ["กิจกรรม", "สัปดาห์ 1", "สัปดาห์ 2", "สัปดาห์ 3", "สัปดาห์ 4", "สัปดาห์ 5", "สัปดาห์ 6"],
      [
          ["ศึกษาโจทย์และวิธีเชิงตัวเลขทั้ง 11 วิธี", "✓", "", "", "", "", ""],
          ["ออกแบบโครงสร้างคลาส (OOP) และ REST API", "", "✓", "", "", "", ""],
          ["พัฒนาคลาสอัลกอริทึม + Expression Parser", "", "✓", "✓", "", "", ""],
          ["พัฒนาฐานข้อมูลและระบบประวัติการคำนวณ", "", "", "✓", "✓", "", ""],
          ["พัฒนาส่วนติดต่อผู้ใช้ (React + Tailwind)", "", "", "✓", "✓", "", ""],
          ["เขียนชุดทดสอบและตรวจสอบผลลัพธ์", "", "", "", "✓", "✓", ""],
          ["จัดทำ Docker / เอกสาร / รายงาน", "", "", "", "", "✓", "✓"],
      ], widths=[6.0, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5], size=9)

# ================================================================== CHAPTER 2
page_break()
h1("การพัฒนา")

h2("2.1 ภาพรวมของระบบ")
para("FastNumeric เป็นเว็บแอปพลิเคชันแบบ 3 ชั้น (Three-tier) ประกอบด้วย **ชั้นรับข้อมูล** (ฟอร์ม React สร้างจาก meta ของแต่ละวิธี), "
     "**ชั้นอัลกอริทึม** (คลาสวิธีคำนวณ 11 วิธีสืบทอดจากคลาสนามธรรม BaseMethod) และ **ชั้นแสดงผล/จัดเก็บ** "
     "(ResultView แสดงผลจากโครงสร้างผลลัพธ์มาตรฐาน, history.js บันทึกลง SQLite) "
     "การทำงานเริ่มจากผู้ใช้เลือกวิธีคำนวณและกรอกอินพุต ฝั่งเซิร์ฟเวอร์ตรวจอินพุตที่ด่าน validation "
     "แล้วเรียก `method.solve(input)` ผลลัพธ์ที่ได้มีโครงสร้างมาตรฐานเดียวกันทุกวิธี "
     "ได้แก่ `{ answer, steps, table, meta }` จึงแสดงผลด้วยหน้าจอเดียวกันได้ทั้ง 11 วิธี และบันทึกประวัติลงฐานข้อมูลโดยอัตโนมัติ")
table("หน้าที่ของไฟล์หลักในแต่ละส่วนของระบบ",
      ["ไฟล์ / ส่วน", "หน้าที่"],
      [
          ["algorithms/BaseMethod.js", "คลาสนามธรรมของทุกวิธีคำนวณ เก็บ meta (key, หมวด, ชื่อ, นิยามฟิลด์อินพุต) "
           "และประกาศเมธอดนามธรรม solve() ให้คลาสลูก implement"],
          ["algorithms/roots.js, linear.js, interpolation.js, extrapolation.js, integration.js, differentiation.js",
           "คลาสวิธีคำนวณจริง 11 วิธี สืบทอดจาก BaseMethod แต่ละคลาสรับผิดชอบเฉพาะคณิตศาสตร์ของตัวเอง"],
          ["algorithms/registry.js", "ศูนย์กลางลงทะเบียนวัตถุวิธีคำนวณทั้งหมดใน Map "
           "พร้อมเมธอด listMethods() สำหรับสร้าง UI อัตโนมัติ"],
          ["expression/parser.js", "แปลงสมการ f(x) จากสตริงเป็นฟังก์ชันด้วย Tokenizer + Recursive Descent Parser (ไม่ใช้ eval)"],
          ["validation/index.js", "ด่านตรวจอินพุตกลาง (asFloat, asInt, asPoints, asMatrix, asExpression) "
           "โยน ValidationError พร้อมข้อความไทย"],
          ["database/db.js + history.js", "ชั้นเข้าถึงข้อมูล: ตาราง problem + calculation ใน SQLite นับโจทย์ซ้ำด้วย input hash"],
          ["routes/index.js", "REST API: GET /api/methods, POST /api/calculate, GET /api/history, GET /api/stats"],
          ["client (React)", "MethodInput สร้างฟอร์มอัตโนมัติจาก meta.fields, ResultView แสดงคำตอบ/ขั้นตอน/ตาราง"],
      ], widths=[5.4, 10.6], size=9)

h2("2.2 คลาสไดอะแกรม พร้อมคำอธิบาย")
para("โครงสร้างคลาสหลักของระบบออกแบบตามหลักการแบ่งชั้น โดยคลาสนามธรรม **BaseMethod** เป็นแม่ของคลาสวิธีคำนวณทั้ง 11 วิธี "
     "และมี **registry.js** เป็นศูนย์กลางประกอบ (compose) วัตถุทุกวิธีเข้าด้วยกัน รูปที่ 2.1 แสดงความสัมพันธ์ของคลาสส่วนอัลกอริทึม "
     "สังเกตว่าวิธีอนุพันธ์ทั้งสามตัว (Forward / Backward / Central) มาจากคลาสเดียวกันคือ `DifferenceMethod` "
     "แต่ถูกสร้างเป็น 3 วัตถุด้วยค่า kind ต่างกัน")
figure("class-diagram.png", "Class Diagram ของระบบ FastNumeric (ส่วนอัลกอริทึม)", 14.5)
para("ความสัมพันธ์หลักในรูปที่ 2.1 ได้แก่ คลาสวิธีคำนวณทุกคลาส**สืบทอด** (Inheritance) จาก `BaseMethod` "
     "และ `registry.js` **ประกอบวัตถุ** (Composition) ของวิธีคำนวณทั้ง 11 วัตถุเข้าเป็นระบบเดียว "
     "ส่วน `routes` (REST API) เข้าถึงวิธีคำนวณผ่าน `getMethod(key)` เท่านั้น ไม่รู้จักคลาสใดโดยตรง "
     "ทำให้เพิ่มวิธีใหม่ได้โดยสร้างคลาสใหม่ `extends BaseMethod` แล้วเพิ่มบรรทัดเดียวใน registry.js")

h2("2.3 รูปแบบการพัฒนา Application")
para("โครงงานนี้พัฒนาแบบเพิ่มทีละส่วน (Iterative and Incremental Development) "
     "เริ่มจากแกนหลักที่คำนวณได้จริงขนาดเล็ก แล้วเพิ่มวิธีคำนวณ ฐานข้อมูล และหน้าจอทีละชั้น "
     "โดยแต่ละรอบมีการวางแผน ออกแบบ เขียนโค้ด ทดสอบ และแก้ไข รายละเอียดแต่ละขั้นตอนมีดังนี้")
numbered([
    "**Planning** กำหนดขอบเขต 6 หมวด 11 วิธี และข้อจำกัด: เขียนอัลกอริทึมเองทั้งหมด ไม่ใช้ eval() "
    "และข้อความ error ต้องเป็นภาษาไทยที่อธิบายสาเหตุได้",
    "**Analyze / Design** ออกแบบคลาสนามธรรม BaseMethod และโครงสร้างผลลัพธ์มาตรฐาน "
    "กำหนดกฎการพึ่งพาระหว่างชั้น (อัลกอริทึมไม่รู้จัก HTTP และฐานข้อมูล validation เป็นด่านเดียวของอินพุต)",
    "**Implementation รอบที่ 1** คลาสอัลกอริทึมทั้ง 11 วิธี + Expression Parser + ระบบ validation",
    "**Implementation รอบที่ 2** ฐานข้อมูล SQLite (ตาราง problem / calculation) และ REST API ทั้งหมด",
    "**Implementation รอบที่ 3** หน้าเว็บ React: เลือกวิธี, ฟอร์มอัตโนมัติจาก meta, หน้าผลลัพธ์, ประวัติ, Dashboard",
    "**Testing และแก้ไข** ทดสอบอัลกอริทึมด้วยโจทย์ที่รู้คำตอบจริง ทดสอบกรณี error และทดสอบผ่านหน้าเว็บจริง "
    "พบและแก้บั๊กระหว่าง Frontend กับ Backend อย่างน้อย 1 จุด (ดังรายละเอียดในบทที่ 3)",
])
para("โปรแกรมเริ่มทำงานจากไฟล์ `server/src/index.js` ซึ่งสร้างแอป Express, เปิด CORS ตามค่า environment "
     "และต่อ Router หลักจาก `routes/index.js` ฝั่งหน้าเว็บสร้างด้วย Vite "
     "เมื่อติดตั้งด้วย Docker Compose จะ build หน้าเว็บเป็นไฟล์ static แล้วเสิร์ฟผ่าน Nginx พร้อม reverse proxy ไปยังเซิร์ฟเวอร์ Node.js")

h2("2.4 อธิบายส่วนของโปรแกรมที่มี (หลักการ OOP)")

h3("2.4.1 Constructor")
para("คลาสวิธีคำนวณทุกคลาสกำหนดข้อมูลเฉพาะของตัวเองไว้ใน constructor แล้วส่งต่อให้คลาสแม่ผ่าน `super(...)` "
     "ตัวอย่างคลาส `BisectionMethod` กำหนดว่าอินพุตของวิธีมีอะไรบ้าง (สมการ, ช่วง XL–XU, Tolerance, Max Iterations) "
     "ข้อมูล fields นี้ถูกส่งต่อไปถึง Frontend ผ่าน API `GET /api/methods` เพื่อสร้างฟอร์มกรอกข้อมูลของแต่ละวิธีโดยอัตโนมัติ "
     "— เพิ่มวิธีใหม่ก็ได้ฟอร์มใหม่ทันทีโดยไม่ต้องแก้ Frontend")
code(method("algorithms/roots.js", "constructor() {"), "algorithms/roots.js – BisectionMethod.constructor")

h3("2.4.2 Encapsulation")
para("ข้อมูลภายในคลาสและโมดูลถูกซ่อนไว้ ภายนอกเข้าถึงผ่านเมธอดที่กำหนดเท่านั้น "
     "`registry.js` ซ่อนโครงสร้างเก็บวัตถุ (Map) ไว้ภายใน ภายนอกเรียกผ่านฟังก์ชัน `register` / `getMethod` / `listMethods` "
     "และป้องกัน key ซ้ำตั้งแต่ตอนลงทะเบียน:")
code(method("algorithms/registry.js", "function register(method)"), "algorithms/registry.js – register")
para("นอกจากนี้ชั้น validation ยังทำหน้าที่เป็น **ด่านเดียว** ในการตรวจอินพุตทุกชนิด "
     "(จุดทศนิยม, จำนวนเต็ม, ตารางจุด, เมทริกซ์, สมการ) โค้ดคำนวณจึงไม่ต้องตรวจข้อมูลเองซ้ำ ๆ อีก "
     "และ BaseMethod ซ่อนเงื่อนไขบังคับของ meta (ต้องมี key, category, name) ไว้ในตัว:")
code(method("algorithms/BaseMethod.js", "constructor(meta)"), "algorithms/BaseMethod.js – constructor")

h3("2.4.3 Composition")
para("`registry.js` ประกอบวัตถุวิธีคำนวณทั้ง 11 วัตถุเข้าเป็นระบบเดียว "
     "สังเกตว่าวิธีอนุพันธ์ทั้งสามตัวมาจากคลาสเดียวกันคือ `DifferenceMethod` แต่ถูกสร้างเป็น 3 วัตถุด้วยค่า kind ต่างกัน:")
code(lines_of("algorithms/registry.js", "[", "].forEach(register);"), "algorithms/registry.js – ลงทะเบียนวิธีคำนวณทั้ง 11 วิธี")
para("แต่ละคลาสวิธีคำนวณยัง **ประกอบ** วัตถุอื่นเข้ามาใช้ เช่น ทุกคลาสรับวัตถุฟังก์ชัน f(x) "
     "ที่ได้จาก expression parser มาใช้คำนวณโดยไม่สนใจว่า parser เขียนอย่างไรภายใน "
     "และฝั่งฐานข้อมูล `history.js` ประกอบวัตถุ `db` จาก `db.js` เข้ามาใช้")
table("ความสัมพันธ์แบบ Composition ที่สำคัญ",
      ["ส่วนที่ประกอบ", "ถือครอง", "ความหมาย"],
      [
          ["registry.js", "วัตถุวิธีคำนวณ 11 วัตถุ ใน Map", "ศูนย์กลางระบบ เพิ่มวิธีใหม่ที่จุดเดียว"],
          ["คลาสวิธีคำนวณทุกคลาส", "ฟังก์ชัน f(x) จาก expression parser", "อัลกอริทึมใช้ parser โดยไม่รู้รายละเอียดภายใน"],
          ["routes/index.js", "registry, history, validation", "ชั้น API ประกอบทุกระบบเข้าด้วยกัน"],
          ["history.js", "db จาก database/db.js", "ชั้นเข้าถึงข้อมูลแยกจากชั้น API"],
          ["หน้าเว็บ React", "MethodInput, ResultView, Dashboard", "แต่ละหน้าจอเป็น Component อิสระต่อกัน"],
      ], widths=[4.4, 5.6, 6.0], size=9)

h3("2.4.4 Polymorphism")
para("REST API ปลายทางเดียว `POST /api/calculate` ใช้คำนวณได้ทั้ง 11 วิธี — โค้ดเรียก `method.solve(parsed)` "
     "เพียงบรรทัดเดียว แต่พฤติกรรมจริงขึ้นอยู่กับว่า method เป็นวัตถุของคลาสใด "
     "(Bisection ก็แบ่งครึ่งช่วง, Gauss ก็ตัดตัวแปร) เรียกว่า Dynamic Binding:")
code(lines_of("routes/index.js", "const method = getMethod(methodKey);",
              "result = method.solve(parsed);")
     + "\n  } catch (e) {\n    return res.status(e.status || 400).json({ error: e.message });\n  }",
     "routes/index.js – โค้ดชุดเดียว ใช้กับวิธีใดก็ได้ (Polymorphism)")
para("Polymorphism ยังทำให้ผลลัพธ์มีรูปแบบเดียวกันทุกวิธี ทุก solve() คืน `{ answer, steps, table, meta }` "
     "หน้า ResultView จึงแสดงผลได้ทั้ง 11 วิธีโดยไม่ต้องมีเงื่อนไขแยกวิธี")

h3("2.4.5 Abstraction และ Inheritance")
para("`BaseMethod` เป็นคลาสนามธรรม: ประกาศเมธอด `solve()` ไว้ให้คลาสลูกสืบทอดและเขียนทับ (override) ตามสูตรของตัวเอง "
     "ใครลืม implement โปรแกรมจะโยน error ทันที:")
code(method("algorithms/BaseMethod.js", "solve(_input)"), "algorithms/BaseMethod.js – เมธอดนามธรรม")
para("คลาสลูกทุกตัวสืบทอด (`extends`) จาก `BaseMethod` ได้คุณสมบัติร่วมโดยอัตโนมัติ "
     "ได้แก่ โครงสร้าง meta แบบเดียวกัน, การตรวจ meta ใน constructor ของคลาสแม่, การถูกเก็บใน registry "
     "และรูปแบบผลลัพธ์มาตรฐานที่ ResultView นำไปแสดงผลได้ทุกวิธี คลาสลูกเพิ่มเฉพาะคณิตศาสตร์ของตัวเอง:")
code("class BisectionMethod extends BaseMethod { ... }\n"
     "class NewtonRaphsonMethod extends BaseMethod { ... }\n"
     "class GaussEliminationMethod extends BaseMethod { ... }\n"
     "// ... คลาสวิธีคำนวณอื่น ๆ อีก 8 คลาส extends BaseMethod เช่นเดียวกัน",
     "การประกาศคลาสที่ใช้การสืบทอด")

h2("2.5 หน้าจอโปรแกรม")
para("หน้าจอทั้งหมดพัฒนาด้วย React + Tailwind CSS แบ่งเป็น 4 หน้าหลัก ได้แก่ Dashboard (สรุปสถิติ), "
     "Calculator (เลือกวิธี + ฟอร์มกรอก + ผลลัพธ์), History (ประวัติการคำนวณ) และรายละเอียดโจทย์ "
     "ฟอร์มกรอกอินพุตของแต่ละวิธีถูกสร้าง**อัตโนมัติ**จาก meta.fields ที่ API ส่งมา "
     "ฟิลด์แต่ละชนิด (สมการ, ตัวเลข, ตารางจุด, เมทริกซ์) มี Component ของตัวเอง "
     "เช่น MatrixEditor สำหรับกรอกเมทริกซ์ที่ขยาย/ย่อขนาดได้ และมีการตรวจอินพุตเบื้องต้นฝั่ง client ก่อนส่งไปยังเซิร์ฟเวอร์")
figure_row([("calculator-select.png", "หน้าเลือกวิธีคำนวณ 6 หมวด 11 วิธี"),
            ("calculator-bisection.png", "ฟอร์มอัตโนมัติของวิธี Bisection")], 7.2,
           "หน้าจอหลักของโปรแกรม (ภาพหน้าจอจริง)")
figure_row([("calculator-gauss.png", "ฟอร์มเมทริกซ์ (MatrixEditor)"),
            ("result-bisection.png", "ผลลัพธ์ Bisection พร้อมตารางการทำซ้ำ")], 7.2,
           "การกรอกอินพุตและการแสดงผลลัพธ์")
table("องค์ประกอบของแต่ละหน้าจอ",
      ["หน้าจอ", "องค์ประกอบสำคัญ"],
      [
          ["Dashboard", "การ์ดสรุปจำนวนโจทย์และจำนวนครั้งที่คำนวณ, สัดส่วนการใช้งานแยกตามหมวด, "
           "รายการโจทย์ยอดนิยม 5 อันดับ (ข้อมูลทั้งหมดอ่านจาก SQLite จริง)"],
          ["Calculator – เลือกวิธี", "แสดงหมวดทั้ง 6 หมวดพร้อมวิธีในหมวด รายการอ่านจาก GET /api/methods โดยตรง "
           "(ไม่มีรายการแข็งในโค้ด) เพิ่มวิธีใหม่ที่เซิร์ฟเวอร์แล้วหน้าเว็บแสดงเพิ่มทันที"],
          ["Calculator – ฟอร์มอินพุต", "สร้างอัตโนมัติจาก meta.fields: ช่องสมการ f(x), ช่องตัวเลข, ตารางจุด (เพิ่ม/ลบแถวได้), "
           "MatrixEditor (เลือกขนาด n แล้วกรอก A และ b) พร้อมปุ่มคำนวณ"],
          ["Calculator – ผลลัพธ์", "แสดงคำตอบสุดท้าย, ขั้นตอนวิธีทำทีละส่วน (สูตร, การทำซ้ำ, การแทนค่า), "
           "ตารางการทำซ้ำเต็ม และป้ายเตือนกรณีคำตอบเป็นค่าประมาณ"],
          ["History", "รายการโจทย์ที่เคยคำนวณ (หมวด วิธี อินพุต จำนวนครั้ง เวลาล่าสุด) เปิดดูรายละเอียดและลบรายการได้"],
      ], widths=[4.2, 11.8], size=9)

h2("2.6 อธิบาย REST API และการจัดการเหตุการณ์")
para("การสื่อสารระหว่าง Frontend กับ Backend ใช้ REST API ภายใต้ `/api` ทั้งหมด "
     "เมื่อผู้ใช้กดปุ่ม **คำนวณ** หน้าเว็บส่ง `POST /api/calculate` พร้อม `{ method, input }` "
     "ฝั่งเซิร์ฟเวอร์ทำงานตามลำดับ: (1) ค้นหาวัตถุวิธีคำนวณจาก registry, (2) ตรวจและแปลงอินพุตทีละฟิลด์ตาม field.type "
     "ที่ด่าน validation, (3) เรียก `method.solve(parsed)`, (4) บันทึกลงฐานข้อมูล "
     "และ (5) ส่งผลลัพธ์กลับ — ถ้าขั้นใดผิดพลาดจะตอบ HTTP 400 พร้อมข้อความไทยอธิบายสาเหตุ")
table("ปลายทาง REST API และหน้าที่",
      ["ปลายทาง", "เมธอด", "หน้าที่"],
      [
          ["/api/methods", "GET", "รายการหมวดและวิธีคำนวณพร้อม meta.fields (ใช้สร้างฟอร์มอัตโนมัติ)"],
          ["/api/calculate", "POST", "ตรวจอินพุต คำนวณด้วย method.solve() แล้วบันทึกประวัติลง SQLite"],
          ["/api/history", "GET", "รายการโจทย์ล่าสุด พร้อมจำนวนครั้งที่คำนวณของแต่ละโจทย์ (รองรับ limit / offset)"],
          ["/api/history/:id", "GET", "รายละเอียดโจทย์ ประวัติการคำนวณทุกครั้ง และผลลัพธ์ล่าสุด"],
          ["/api/history/:id", "DELETE", "ลบโจทย์และประวัติการคำนวณทั้งหมดของโจทย์นั้น"],
          ["/api/stats", "GET", "สถิติสำหรับ Dashboard: จำนวนโจทย์, จำนวนครั้ง, แยกตามหมวด, โจทย์ยอดนิยม"],
      ], widths=[4.0, 2.2, 9.8], size=9)
para("ฝั่งหน้าเว็บจัดการเหตุการณ์ด้วย React hooks เป็นหลัก "
     "การเปลี่ยนค่าในฟอร์ม (onChange) อัปเดต state ของ Component ทันทีและตรวจความถูกต้องเบื้องต้น "
     "การกดปุ่มคำนวณ (onSubmit) ส่ง request แล้วแสดงสถานะกำลังโหลดจนได้ผลตอบ "
     "กรณีเซิร์ฟเวอร์ตอบ error หน้าเว็บแสดงกล่องข้อความไทยที่ได้จาก API ให้ผู้ใช้แก้อินพุตแล้วส่งใหม่ได้ทันที "
     "นอกจากนี้หน้าเว็บยังตรวจว่า response จาก API มีโครงสร้างครบก่อนนำไปแสดงผล "
     "เพื่อป้องกันหน้าเว็บพังเมื่อเซิร์ฟเวอร์ยังไม่พร้อม")

h2("2.7 อธิบายอัลกอริทึมที่สำคัญในโปรแกรม")
h3("2.7.1 Expression Parser (แยกวิเคราะห์สมการโดยไม่ใช้ eval)")
para("เพื่อความปลอดภัยและเพื่อให้ข้อความ error อ่านเข้าใจได้ โปรแกรมแยกวิเคราะห์สมการ f(x) จากสตริง "
     "ด้วย Tokenizer + Recursive Descent Parser ที่เขียนขึ้นเอง รองรับตัวดำเนินการ + − * / ^ วงเล็บ "
     "ฟังก์ชัน sin cos tan sqrt exp ln log abs ค่าคงที่ pi, e และการคูณละเครื่องหมาย (เช่น 2x, 3(x+1)) "
     "Tokenizer แปลงสตริงเป็นชุดโทเคนก่อน ถ้าพบอักขระที่ไม่รู้จักจะโยน ExprError พร้อมตำแหน่งที่ผิด:")
code(method("expression/parser.js", "function tokenize(src)"), "expression/parser.js – tokenize")
para("จากนั้นคลาส `Parser` ใช้หลัก Recursive Descent แบ่งสมการตามลำดับความสำคัญของตัวดำเนินการ "
     "(expr → term → power → unary → atom) ให้ได้ AST แล้วเดินต้นไม้เพื่อประเมินค่าที่ x ใด ๆ ได้")

h3("2.7.2 Bisection Method — การทำซ้ำแบบแบ่งครึ่งช่วง")
para("ก่อนทำซ้ำโปรแกรมตรวจเงื่อนไขบังคับก่อน ได้แก่ XL ต้องน้อยกว่า XU และ f(XL)·f(XU) ต้องมีเครื่องหมายต่างกัน "
     "ถ้าเครื่องหมายเดียวกันจะแจ้งว่า **ไม่มีการเปลี่ยนเครื่องหมายในช่วงนี้ จึงใช้ Bisection ไม่ได้ (ลองเปลี่ยนช่วง)** "
     "แกนของการทำซ้ำคือหาจุดกึ่งกลาง XR = (XL + XU) / 2 แล้วเลือกครึ่งที่มีการเปลี่ยนเครื่องหมายไว้ต่อ "
     "วัดความคลาดเคลื่อนด้วย |(XR ใหม่ − XR เดิม) / XR ใหม่| × 100 จนน้อยกว่า Tolerance:")
code(lines_of("algorithms/roots.js", "const rows = [];", "prev = root;"), "algorithms/roots.js – BisectionMethod.solve (ส่วนการทำซ้ำ)")
para("ทุกรอบการทำซ้ำถูกเก็บลงตาราง (XL, XU, XR, f(XL), f(XR), Error %) "
     "เพื่อแสดงให้ผู้ใช้เห็นการลู่เข้าของคำตอบทีละรอบ")

h3("2.7.3 Gauss Elimination — การตัดตัวแปรแบบ Partial Pivoting")
para("แก้ระบบสมการ AX = b ด้วย Forward Elimination โดยทุกคอลัมน์จะเลือกแถวที่มีค่าสัมบูรณ์มากที่สุดเป็น pivot ก่อน (Partial Pivoting) "
     "เพื่อลดปัญหา floating point error และตรวจว่า pivot ไม่ใกล้ศูนย์ (เมทริกซ์เอกฐน) "
     "จากนั้นตัดตัวแปรแถวล่างด้วย Rᵢ ← Rᵢ − m·Rpivot แล้วปิดท้ายด้วยการแทนค่าย้อนกลับ (Back Substitution) "
     "ทุกขั้นตอนถูกบันทึกเป็นเมทริกซ์ข้อความเพื่อแสดงวิธีทำให้ผู้ใช้:")
code(lines_of("algorithms/linear.js", "// Forward Elimination", "A[i][k] = 0;") + "\n      }",
     "algorithms/linear.js – Forward Elimination พร้อม Partial Pivoting")
code(lines_of("algorithms/linear.js", "// Back Substitution", "x[i] = s / A[i][i];") + "\n    }",
     "algorithms/linear.js – Back Substitution")

h3("2.7.4 Newton-Raphson — อนุพันธ์เชิงตัวเลข")
para("สูตร Newton-Raphson ต้องการอนุพันธ์ f'(x) โปรแกรมคำนวณด้วย central difference ความแม่นยำสูง "
     "โดยให้ h แปรผันตามขนาดของ x และตรวจกรณี f'(x) = 0 เพื่อแจ้งผู้ใช้ให้เปลี่ยนค่าเริ่มต้น X0 แทนการพัง:")
code(lines_of("algorithms/roots.js", "const df = (x)", "(2 * h);"), "algorithms/roots.js – อนุพันธ์เชิงตัวเลข")

h3("2.7.5 การนับโจทย์ซ้ำด้วย SHA-256 Hash")
para("เพื่อให้โจทย์เดิมไม่ถูกบันทึกซ้ำในตารางประวัติ โปรแกรมสร้าง hash จาก (หมวด + วิธี + อินพุต) "
     "โดยเรียง key ของอินพุตก่อนเสมอ เพื่อให้ `{a, b}` กับ `{b, a}` ให้ hash เดียวกัน "
     "hash นี้ใช้เป็น UNIQUE constraint ของตาราง problem โจทย์เดิมจะเพิ่มเพียง **จำนวนครั้งที่คำนวณ**:")
code(method("database/history.js", "function hashInput"), "database/history.js – hashInput")

# ================================================================== CHAPTER 3
page_break()
h1("สรุปผลและข้อเสนอแนะ")
para("โครงงาน FastNumeric พัฒนาเว็บแอปพลิเคชันคำนวณวิธีเชิงตัวเลขได้สำเร็จตามขอบเขตหลัก "
     "ครอบคลุม 6 หมวด 11 วิธีครบถ้วน แสดงขั้นตอนการคำนวณและตารางการทำซ้ำทุกวิธี "
     "มีระบบประวัติการคำนวณที่นับโจทย์ซ้ำ และ Dashboard สรุปสถิติ "
     "โครงสร้างโปรแกรมแบ่งชั้นชัดเจนตามหลักการเขียนโปรแกรมเชิงวัตถุทุกหลักการ "
     "และเพิ่มวิธีคำนวณใหม่ได้โดยแก้โค้ดเพียง 2 จุด (คลาสใหม่ + บรรทัด register)")

h2("3.1 ปัญหาที่พบระหว่างการพัฒนา")
table("ปัญหาที่พบระหว่างพัฒนาและแนวทางแก้ไข",
      ["ปัญหา", "สาเหตุ", "แนวทางแก้ไข (หลักฐาน)"],
      [
          ["การใช้ eval() กับสมการ f(x) เสี่ยงต่อความปลอดภัยและข้อความ error อ่านไม่เข้าใจ",
           "eval ประเมินโค้ด JavaScript ใด ๆ ได้ และ SyntaxError ของเอนจินไม่ได้เล่าว่าผู้ใช้กรอกผิดตรงไหน",
           "เขียน Expression Parser เอง (Tokenizer + Recursive Descent) แปลง error เป็นข้อความไทยระบุตำแหน่งอักขระที่ผิด "
           "เช่น 'ไม่รู้จักอักขระ @ ที่ตำแหน่งที่ 3' (expression/parser.js)"],
          ["หน้าเว็บแก้ระบบสมการด้วย Gauss ไม่ได้ ขึ้น 'รูปแบบข้อมูลเมทริกซ์ไม่ถูกต้อง'",
           "Frontend ส่ง key เมทริกซ์เป็น A (พิมพ์ใหญ่) แต่ asMatrix ฝั่งเซิร์ฟเวอร์รับเฉพาะ a (พิมพ์เล็ก)",
           "ปรับ asMatrix ให้รับทั้ง m.a และ m.A (validation/index.js) ทดสอบผ่านหน้าเว็บและ API จริง"],
          ["หน้าเว็บขึ้น 'Cannot read properties of null' เมื่อ API ยังไม่ตอบ",
           "โค้ดฝั่ง client เข้าถึงข้อมูล response ก่อนที่ request จะเสร็จหรือเมื่อ response ไม่มีโครงสร้างที่คาดไว้",
           "ตั้ง Vite dev proxy ให้ /api ไปยังเซิร์ฟเวอร์ Express และตรวจ response ก่อน setState (เช่น Array.isArray(d.categories))"],
          ["วิธี Simpson ต้องการจำนวนช่วงเป็นเลขคู่ แต่ผู้ใช้กรอกเลขคี่ได้",
           "อัลกอริทึม Simpson's 1/3 ใช้สูตรกับช่วงคู่เท่านั้น ถ้ารับเลขคี่แล้วผลลัพธ์จะผิดโดยไม่รู้ตัว",
           "ตรวจที่ด่าน validation แล้วแจ้งข้อความไทยพร้อมคำแนะนำให้กรอกใหม่ (validation/index.js)"],
          ["Newton-Raphson ไม่ลู่เข้าเมื่อ f'(x) = 0 หรือเริ่มที่จุดที่ไม่เหมาะสม",
           "สูตรต้องหารด้วย f'(x) ซึ่งเป็นศูนย์ได้ และการลู่เข้าขึ้นกับจุดเริ่มต้น",
           "ตรวจ d0 === 0 แล้วแจ้ง 'ลองเปลี่ยนค่าเริ่มต้น X0' กรณีครบรอบสูงสุดแสดงป้ายเตือนว่าคำตอบเป็นค่าประมาณ (roots.js)"],
          ["โจทย์เดิมถูกบันทึกซ้ำ ๆ ทำให้ตารางประวัติรก",
           "การบันทึกทุกครั้งไม่แยกว่าเป็นโจทย์เดิมหรือโจทย์ใหม่",
           "ใช้ SHA-256 hash ของ (หมวด + วิธี + อินพุตที่เรียง key แล้ว) เป็น UNIQUE constraint "
           "โจทย์เดิมจะเพิ่มแค่จำนวนครั้งที่คำนวณ (history.js)"],
      ], widths=[4.4, 5.0, 6.6], size=9)
para("หมายเหตุ: ปัญหาข้างต้นสรุปจากประสบการณ์การพัฒนาจริงและสามารถชี้ตำแหน่งโค้ดที่เกี่ยวข้องได้ทุกข้อ "
     "โดยเฉพาะปัญหาเมทริกซ์ A/a เป็นบั๊กระหว่าง Frontend กับ Backend ที่พบและแก้ไขจริงระหว่างการทดสอบ")

h2("3.2 จุดเด่นของโปรแกรมที่ไม่เหมือนใคร")
numbered([
    "**แสดงขั้นตอนการคำนวณครบทุกวิธี** ไม่ใช่แค่คำตอบ — เช่น Gauss Elimination แสดง Augmented Matrix ตั้งต้น "
    "การสลับแถวแบบ Partial Pivoting การตัดตัวแปรทีละคอลัมน์ และการแทนค่าย้อนกลับให้เห็นทุกขั้น",
    "**ฟอร์มอินพุตสร้างอัตโนมัติจากข้อมูล (Data-driven UI)** นิยามฟิลด์ของแต่ละวิธีอยู่ที่ meta.fields ของคลาส "
    "หน้าเว็บอ่านจาก API แล้วสร้างฟอร์มเอง เพิ่มวิธีใหม่ที่เซิร์ฟเวอร์ก็มีหน้าใช้งานทันทีโดยไม่แก้ Frontend",
    "**Expression Parser เขียนเองโดยไม่ใช้ eval()** ปลอดภัยและให้ข้อความ error ภาษาไทยระบุตำแหน่งอักขระที่ผิด "
    "รองรับฟังก์ชันคณิตศาสตร์ ค่าคงที่ และการคูณละเครื่องหมาย",
    "**จัดการข้อผิดพลาดเป็นภาษาไทยที่บอกทางแก้** ทุกกรณีผิดพลาด (ช่วงไม่เปลี่ยนเครื่องหมาย, เมทริกซ์เอกฐน, "
    "จำนวนช่วงเลขคี่, f'(x) = 0) มีข้อความอธิบายสาเหตุและคำแนะนำ ไม่ใช่ stack trace",
    "**ประวัติการคำนวณที่นับโจทย์ซ้ำอัตโนมัติ** ใช้ SHA-256 hash แยกโจทย์เดิม/ใหม่ ผู้ใช้เห็นว่าโจทย์ไหนคำนวณบ่อย "
    "และ Dashboard สรุปสถิติจากข้อมูลจริง",
    "**ติดตั้งได้ด้วยคำสั่งเดียว** Docker Compose build ทั้งหน้าเว็บและเซิร์ฟเวอร์ พร้อม health check "
    "และ named volume ทำให้ข้อมูลไม่หายเมื่อรีสตาร์ทคอนเทนเนอร์",
])
para("รูปที่ 3.1 ถึง 3.4 เป็นภาพหน้าจอจริงของโปรแกรมที่แสดงจุดเด่นดังกล่าว")
figure("dashboard.png", "หน้า Dashboard — สถิติการใช้งานและโจทย์ยอดนิยม อ่านจาก SQLite จริง", 13.0)
figure("result-gauss.png", "ผลลัพธ์ Gauss Elimination — คำตอบ x1=2, x2=3, x3=−1 พร้อมวิธีทำทีละขั้น", 13.0)
figure("result-bisection-table.png", "ตารางการทำซ้ำ Bisection ลู่เข้าหาราก ≈ 1.521380 พร้อม Error (%) ที่ลดลงทุกรอบ", 13.0)
figure("history-detail.png", "รายละเอียดโจทย์ — แสดงจำนวนครั้งที่คำนวณ อินพุตเดิม และผลลัพธ์ล่าสุด", 13.0)

h2("3.3 การทดสอบระบบ")
para("ระบบผ่านการทดสอบดังนี้: (1) ทดสอบอัลกอริทึมทั้ง 11 วิธีด้วยโจทย์ที่รู้คำตอบจริง "
     "เช่น Bisection และ Newton-Raphson ของ x³ − x − 2 = 0 ได้ราก ≈ 1.521380, "
     "Gauss ระบบ 3×3 ได้ x = (2, 3, −1), Simpson ของ x² บน [0, 1] ได้ 1/3 แม่นถึงหลักทศนิยมที่คาดหมาย "
     "(2) ทดสอบกรณี error (หารด้วยศูนย์, เมทริกซ์เอกฐน, f(XL)·f(XU) > 0, x ซ้ำในตารางจุด, จำนวนช่วงเลขคี่ ฯลฯ) "
     "ระบบแจ้งข้อความไทยถูกต้องทุกกรณีและไม่ทำให้เซิร์ฟเวอร์ล้ม "
     "(3) ทดสอบผ่านหน้าเว็บจริงครบทุกวิธี รวมถึงกรณีเมทริกซ์ที่เคยพบบั๊ก A/a "
     "และ (4) ทดสอบการนับโจทย์ซ้ำและการคงอยู่ของข้อมูลหลังรีสตาร์ทเซิร์ฟเวอร์ (ข้อมูลเก็บในไฟล์ SQLite บน volume) ผ่านครบ")

h2("3.4 คำแนะนำสำหรับการพัฒนาต่อ")
numbered([
    "**เพิ่มการวาดกราฟ f(x)** พร้อมประมาณการตำแหน่งราก เพื่อช่วยผู้ใช้เลือกช่วง XL–XU ที่เหมาะสมก่อนคำนวณ",
    "**เพิ่มวิธีคำนวณขั้นสูง** เช่น Secant Method, Gauss-Jordan, Newton's Divided Difference Interpolation "
    "ซึ่งทำได้ง่ายจากโครงสร้างเดิม: สร้างคลาสใหม่ extends BaseMethod แล้วเพิ่มบรรทัด register ใน registry.js",
    "**เพิ่มการล็อกอินผู้ใช้** เพื่อแยกประวัติการคำนวณของแต่ละคนและเก็บสถิติรายบุคคล",
    "**ส่งออกผลลัพธ์เป็น PDF หรือรูปภาพ** เพื่อให้ผู้ใช้แนบขั้นตอนการคำนวณลงรายงานของตนเองได้โดยตรง",
    "**เพิ่มชุดทดสอบอัตโนมัติ** (เช่น Vitest / Supertest) ครอบคลุมทั้งอัลกอริทึมและ API "
    "เพื่อให้มั่นใจว่าการแก้โค้ดในอนาคตไม่ทำให้วิธีเดิมเสีย",
])

doc.save(OUT)
print("saved", OUT)
