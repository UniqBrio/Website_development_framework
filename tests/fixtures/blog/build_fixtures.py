#!/usr/bin/env python3
"""Build the blog-ingestion test fixtures (standard library only).

    python tests/fixtures/blog/build_fixtures.py <output dir>

Every document here is SYNTHETIC and named FIXTURE-* in its text, so a fixture can
never be mistaken for customer content. They are built at test time rather than
committed, so the repository carries no opaque binaries.
"""
import json
import os
import struct
import sys
import zipfile
import zlib

OUT = sys.argv[1]


def write(rel, data):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(data if isinstance(data, bytes) else data.encode("utf-8"))
    return path


def png(width, height, rgb):
    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)
    row = b"\x00" + bytes(rgb) * width
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(row * height)) + chunk(b"IEND", b"")


def gif(width, height, frames):
    """An animated GIF with `frames` one-colour frames and a looping extension."""
    out = b"GIF89a" + struct.pack("<HHBBB", width, height, 0x80, 0, 0) + bytes([0, 0, 0, 255, 255, 255])
    out += b"\x21\xff\x0bNETSCAPE2.0\x03\x01\x00\x00\x00"
    for i in range(frames):
        out += b"\x21\xf9\x04\x00\x0a\x00\x00\x00"
        out += b"\x2c" + struct.pack("<HHHHB", 0, 0, width, height, 0)
        out += b"\x02\x02" + (b"\x4c\x01" if i % 2 else b"\x44\x01") + b"\x00"
    return out + b"\x3b"


def mp4(width, height, seconds):
    def box(kind, body):
        return struct.pack(">I", len(body) + 8) + kind + body
    mvhd = box(b"mvhd", b"\x00" * 12 + struct.pack(">II", 1000, seconds * 1000) + b"\x00" * 80)
    tkhd = box(b"tkhd", b"\x00" * 76 + struct.pack(">II", width << 16, height << 16))
    return box(b"ftyp", b"isom\x00\x00\x02\x00isomiso2mp41") + box(b"moov", mvhd + box(b"trak", tkhd)) + box(b"mdat", b"\x00" * 64)


def zipdoc(rel, parts):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, body in parts.items():
            zf.writestr(name, body)
    return path


COVER, CHART, PHOTO = png(1200, 630, (30, 60, 140)), png(800, 450, (150, 70, 30)), png(640, 360, (20, 110, 80))
W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"'
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def p(text, style=None, extra=""):
    ppr = '<w:pPr><w:pStyle w:val="%s"/>%s</w:pPr>' % (style, extra) if style or extra else ""
    if not style and extra:
        ppr = "<w:pPr>%s</w:pPr>" % extra
    return "<w:p>%s<w:r><w:t xml:space=\"preserve\">%s</w:t></w:r></w:p>" % (ppr, text)


def drawing(rid, descr, cx=7620000, cy=4000500):
    return ('<w:p><w:r><w:drawing><wp:inline><wp:extent cx="%d" cy="%d"/><wp:docPr id="1" name="Picture" descr="%s"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic><pic:blipFill><a:blip r:embed="%s"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>') % (cx, cy, descr, rid)


def build_docx():
    num = '<w:numPr><w:ilvl w:val="%d"/><w:numId w:val="%d"/></w:numPr>'
    body = "".join([
        p("FIXTURE How Academies Cut Fee Leakage", "Title"),
        p("A practical look at three fixes", "Subtitle"),
        drawing("rId10", "Dashboard showing fee collections"),
        '<w:p><w:r><w:t xml:space="preserve">Fee leakage costs the average academy </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>12.5%</w:t></w:r>'
        '<w:r><w:t xml:space="preserve"> of revenue, according to </w:t></w:r><w:hyperlink r:id="rId20"><w:r><w:t>the 2025 report</w:t></w:r></w:hyperlink>'
        '<w:r><w:t>.</w:t></w:r><w:r><w:footnoteReference w:id="2"/></w:r></w:p>',
        '<w:p><w:r><w:t xml:space="preserve">A deleted </w:t></w:r><w:del w:id="1" w:author="x"><w:r><w:delText>REMOVED-WORD </w:delText></w:r></w:del><w:ins w:id="2" w:author="x"><w:r><w:t>inserted </w:t></w:r></w:ins><w:r><w:t>sentence.</w:t></w:r></w:p>',
        p("Where the money goes", "Heading1"),
        p("Missed reminders", None, num % (0, 1)), p("Manual receipts", None, num % (0, 1)), p("Paper receipts get lost", None, num % (1, 1)), p("Untracked discounts", None, num % (0, 1)),
        p("First bullet", None, num % (0, 2)), p("Second bullet", None, num % (0, 2)),
        p("The numbers", "Heading2"),
        drawing("rId11", "image2.png"),
        p("Figure 1: Leakage by cause", "Caption"),
        '<w:tbl><w:tblPr><w:tblLook w:firstRow="1"/></w:tblPr>' + "".join(
            "<w:tr>%s</w:tr>" % "".join("<w:tc><w:p><w:r><w:t>%s</w:t></w:r></w:p></w:tc>" % cell for cell in row)
            for row in (("Cause", "Share", "Fix"), ("Reminders", "48%", "Automate"), ("Receipts", "31%", "Digital"))) + "</w:tbl>",
        '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="5000000" cy="3000000"/><wp:docPr id="3" name="Chart"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId30"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>',
        p("A quoted remark from an owner.", "Quote"),
        p("print('fixture')", "Code"), p("  indented()", "Code"),
        p("[VIDEO: demo.mp4]"),
        p("Conclusion", "Heading1"), p("Start with reminders."),
        p("References", "Heading1"), p("FIXTURE internal survey, 2025."),
    ])
    styles = '<w:styles %s>%s</w:styles>' % (W, "".join(
        '<w:style w:type="paragraph" w:styleId="%s"><w:name w:val="%s"/>%s</w:style>' % (sid, name, extra) for sid, name, extra in (
            ("Title", "Title", ""), ("Subtitle", "Subtitle", ""), ("Heading1", "heading 1", ""), ("Heading2", "heading 2", ""), ("Caption", "caption", "<w:rPr><w:b/></w:rPr>"),
            ("Quote", "Quote", "<w:rPr><w:i/></w:rPr>"), ("Code", "Source Code", ""))))
    numbering = ('<w:numbering %s><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>'
                 '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>'
                 '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>') % W
    footnotes = '<w:footnotes %s><w:footnote w:type="separator" w:id="0"><w:p/></w:footnote><w:footnote w:id="2"><w:p><w:r><w:t>FIXTURE survey of 40 academies.</w:t></w:r></w:p></w:footnote></w:footnotes>' % W
    chart = ('<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>Renewals by quarter</a:t></a:r></a:p></c:rich></c:tx></c:title>'
             '<c:plotArea><c:barChart><c:barDir val="col"/><c:ser><c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>2025</c:v></c:pt></c:strCache></c:strRef></c:tx>'
             '<c:cat><c:strRef><c:strCache><c:ptCount val="3"/><c:pt idx="0"><c:v>Q1</c:v></c:pt><c:pt idx="1"><c:v>Q2</c:v></c:pt><c:pt idx="2"><c:v>Q3</c:v></c:pt></c:strCache></c:strRef></c:cat>'
             '<c:val><c:numRef><c:numCache><c:ptCount val="3"/><c:pt idx="0"><c:v>66</c:v></c:pt><c:pt idx="1"><c:v>71.5</c:v></c:pt><c:pt idx="2"><c:v>77.250000000000001</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>')
    rels = ('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId10" Type="%s/image" Target="media/image1.png"/><Relationship Id="rId11" Type="%s/image" Target="media/image2.png"/>'
            '<Relationship Id="rId20" Type="%s/hyperlink" Target="https://example.org/report" TargetMode="External"/>'
            '<Relationship Id="rId30" Type="%s/chart" Target="charts/chart1.xml"/></Relationships>') % (REL, REL, REL, REL)
    core = ('<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '<dc:title>Stale template title</dc:title><dc:creator>Template Author</dc:creator></cp:coreProperties>')
    return {"[Content_Types].xml": "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>", "word/document.xml": "<w:document %s><w:body>%s</w:body></w:document>" % (W, body),
            "word/styles.xml": styles, "word/numbering.xml": numbering, "word/footnotes.xml": footnotes, "word/charts/chart1.xml": chart,
            "word/_rels/document.xml.rels": rels, "word/media/image1.png": COVER, "word/media/image2.png": CHART, "docProps/core.xml": core}


def build_pptx():
    P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'

    def sp(kind, paras):
        return '<p:sp><p:nvSpPr><p:cNvPr id="2" name="x"/><p:cNvSpPr/><p:nvPr><p:ph type="%s"/></p:nvPr></p:nvSpPr><p:txBody><a:bodyPr/>%s</p:txBody></p:sp>' % (
            kind, "".join('<a:p><a:pPr lvl="%d"/><a:r><a:t>%s</a:t></a:r></a:p>' % (lvl, t) for lvl, t in paras))

    def slide(shapes):
        return "<p:sld %s><p:cSld><p:spTree>%s</p:spTree></p:cSld></p:sld>" % (P, shapes)
    pic = '<p:pic><p:nvPicPr><p:cNvPr id="5" name="Picture" descr="Progress note example"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/></p:blipFill><p:spPr><a:xfrm><a:off x="100" y="4000000"/><a:ext cx="6096000" cy="3429000"/></a:xfrm></p:spPr></p:pic>'
    rel = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">%s</Relationships>'
    return {
        "[Content_Types].xml": "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>",
        "ppt/presentation.xml": '<p:presentation %s><p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst></p:presentation>' % P,
        "ppt/_rels/presentation.xml.rels": rel % ('<Relationship Id="rId1" Type="%s/slide" Target="slides/slide1.xml"/><Relationship Id="rId2" Type="%s/slide" Target="slides/slide2.xml"/>' % (REL, REL)),
        "ppt/slides/slide1.xml": slide(sp("ctrTitle", [(0, "FIXTURE Retention Playbook")]) + sp("subTitle", [(0, "Five habits of academies that keep students")])),
        "ppt/slides/slide2.xml": slide(sp("title", [(0, "Habit one: weekly progress notes")]) + sp("body", [(0, "Send one note per student"), (1, "Keep it under 50 words"), (0, "Parents reply within a day")]) + pic),
        "ppt/slides/_rels/slide2.xml.rels": rel % ('<Relationship Id="rId2" Type="%s/image" Target="../media/image1.png"/>' % REL),
        "ppt/media/image1.png": PHOTO,
    }


def build_xlsx():
    S = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    rows = [("Month", "Collected", "Rate"), ("Jan", 125000.5, 0.825), ("Feb", 131200, 0.871)]
    cells = ""
    for r, row in enumerate(rows, 1):
        cells += '<row r="%d">' % r
        for c, value in enumerate(row):
            ref = "ABC"[c] + str(r)
            cells += ('<c r="%s" t="inlineStr"><is><t>%s</t></is></c>' % (ref, value)) if isinstance(value, str) else ('<c r="%s" s="%d"><v>%r</v></c>' % (ref, c, value))
        cells += "</row>"
    return {
        "[Content_Types].xml": "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>",
        "xl/workbook.xml": '<workbook %s><sheets><sheet name="Collections" sheetId="1" r:id="rId1"/></sheets></workbook>' % S,
        "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="%s/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' % REL,
        "xl/styles.xml": '<styleSheet %s><numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%%"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="4"/><xf numFmtId="164"/></cellXfs></styleSheet>' % S,
        "xl/worksheets/sheet1.xml": "<worksheet %s><sheetData>%s</sheetData></worksheet>" % (S, cells),
    }


def build_odt():
    ns = ('xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
          'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" '
          'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"')
    body = ('<text:p text:style-name="Title">FIXTURE Scheduling Without Clashes</text:p><text:p text:style-name="Standard">Rooms are booked <text:span text:style-name="T1">twice</text:span> a week on average, see '
            '<text:a xlink:href="https://example.org/study">the study</text:a>.</text:p><text:h text:outline-level="1">Why clashes happen</text:h>'
            '<text:list text:style-name="L1"><text:list-item><text:p>Shared rooms</text:p><text:list><text:list-item><text:p>Studio B</text:p></text:list-item></text:list></text:list-item><text:list-item><text:p>Late changes</text:p></text:list-item></text:list>'
            '<text:p><draw:frame svg:width="10cm" svg:height="5.625cm"><draw:image xlink:href="Pictures/room.png"/><svg:desc>Weekly room timetable</svg:desc></draw:frame></text:p>'
            '<table:table><table:table-header-rows><table:table-row><table:table-cell><text:p>Room</text:p></table:table-cell><table:table-cell><text:p>Clashes</text:p></table:table-cell></table:table-row></table:table-header-rows>'
            '<table:table-row><table:table-cell><text:p>Studio A</text:p></table:table-cell><table:table-cell><text:p>3</text:p></table:table-cell></table:table-row></table:table>')
    content = ('<office:document-content %s><office:automatic-styles><style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>'
               '<text:list-style style:name="L1"><text:list-level-style-number text:level="1" style:num-format="1"/><text:list-level-style-bullet text:level="2" text:bullet-char="-"/></text:list-style>'
               '</office:automatic-styles><office:body><office:text>%s</office:text></office:body></office:document-content>') % (ns, body)
    return {"mimetype": "application/vnd.oasis.opendocument.text", "content.xml": content, "Pictures/room.png": PHOTO}


def pdf(objects):
    out, offsets = b"%PDF-1.4\n", []
    for i, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + (body if isinstance(body, bytes) else body.encode("latin-1")) + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offsets)
    return out + b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)


def stream(data, extra=""):
    data = data if isinstance(data, bytes) else data.encode("latin-1")
    return b"<< /Length %d %s >>\nstream\n" % (len(data), extra.encode()) + data + b"\nendstream"


def build_pdfs():
    lines = [(24, 72, 720, "FIXTURE Parent Communication Guide"), (11, 72, 690, "Clear messages reduce missed classes. This first paragraph runs over"),
             (11, 72, 676, "two lines so that line joining is exercised."), (16, 72, 640, "Weekly rhythm"), (11, 72, 618, "- Monday reminder"), (11, 72, 604, "- Friday summary"),
             (11, 72, 570, "Channel"), (11, 250, 570, "Open rate"), (11, 72, 556, "WhatsApp"), (11, 250, 556, "92%"), (11, 72, 542, "Email"), (11, 250, 542, "41%"),
             (11, 72, 300, "Figure 1: Message timeline")]
    text = "".join("BT /F1 %d Tf %d %d Td (%s) Tj ET\n" % line for line in lines) + "q 240 0 0 135 72 330 cm /Im1 Do Q\n"
    image = stream(zlib.compress(bytes([40, 90, 160]) * (64 * 36)), "/Type /XObject /Subtype /Image /Width 64 /Height 36 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode")
    write("pdf/guide.pdf", pdf(["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> /XObject << /Im1 6 0 R >> >> >>",
                                stream(text), "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", image]))
    scan = stream(zlib.compress(bytes([235]) * (100 * 130)), "/Type /XObject /Subtype /Image /Width 100 /Height 130 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode")
    write("scanned/scan.pdf", pdf(["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                                   "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>",
                                   stream("q 612 0 0 792 0 0 cm /Im1 Do Q\n"), scan]))


MARKDOWN = """---
title: FIXTURE Automating Fee Reminders
subtitle: What changed in ninety days
author: Fixture Author
date: 2026-10-02
description: How one fixture academy automated reminders.
tags: [fees, automation]
---

# FIXTURE Automating Fee Reminders

Collections rose from 82.5% to 91% in one quarter[^1]. Costs fell by *exactly* ₹1,25,000.

![Monthly collections chart](images/fee-chart.png "Collections")
*Figure 1: Collections by month*

## How the process works

The flow has three steps, shown in process.gif below.

1. Schedule
2. Remind
   - by WhatsApp
   - by email
3. Reconcile

[VIDEO: demo.mp4]

## Pricing comparison

| Plan | Price |
|------|-------|
| Starter | ₹999 |
| Growth | ₹2,499 |

> Quoted, word for word.

```python
total = 82.5 * 2  # a < b && c > d
```

https://youtu.be/dQw4w9WgXcQ

Download the [checklist](checklist.txt) or read [more](https://example.org/more).

## Conclusion

Start small.

## Get started

[Book a walkthrough](https://example.org/demo)

[^1]: FIXTURE internal data, 2026.
"""


def package(folder, with_missing=False):
    body = MARKDOWN + ("\n![Not supplied](images/not-there.png)\n" if with_missing else "")
    write(folder + "/post.md", body)
    write(folder + "/cover.png", COVER)
    write(folder + "/images/fee-chart.png", CHART)
    write(folder + "/images/process.gif", gif(120, 80, 5))
    write(folder + "/pricing-comparison.png", png(300, 200, (190, 20, 90)))
    write(folder + "/team-offsite.png", png(900, 500, (30, 70, 30)))
    write(folder + "/demo.mp4", mp4(640, 360, 12))
    write(folder + "/demo.png", PHOTO)
    write(folder + "/demo.en.srt", "1\n00:00:00,000 --> 00:00:01,500\nFIXTURE caption\n")
    write(folder + "/checklist.txt", "FIXTURE checklist\n")


def main():
    package("package")
    package("package-missing", with_missing=True)
    zipdoc("docx/leakage.docx", build_docx())
    write("docx/demo.mp4", mp4(1280, 720, 30))
    zipdoc("pptx/retention.pptx", build_pptx())
    zipdoc("xlsx/collections.xlsx", build_xlsx())
    zipdoc("odt/scheduling.odt", build_odt())
    build_pdfs()
    write("rtf/notes.rtf", r"{\rtf1\ansi\ansicpg1252{\fonttbl{\f0 Arial;}}{\stylesheet{\s1 heading 1;}{\s2 Title;}}{\info{\title Stale}}"
          r"\pard\s2 FIXTURE Attendance Notes\par\pard Marked \b present\b0  by 9\'e9 am, see {\field{\*\fldinst HYPERLINK \"https://example.org/rtf\"}{\fldrslt the policy}}.\par"
          r"\pard\s1 Rules\par\pard{\listtext\'b7\tab}First rule\par\pard{\listtext\'b7\tab}Second rule\par"
          r"\trowd\intbl Day\cell Count\cell\row\trowd\intbl Mon\cell 18\cell\row\pard Unicode " + "\\" + "u8377?500 fee." + r"\par}")
    write("txt/plain.txt", "FIXTURE Plain Text Post\n=======================\n\nA first paragraph that mentions 2 * 3 * 4 and snake_case_name untouched.\n\n# A marked heading\n\n- one\n- two\n\n[IMAGE: diagram.png]\n\nClosing line with https://example.org/plain inside.\n")
    write("txt/diagram.png", PHOTO)
    write("html/post.html", "<!doctype html><html lang=\"en-IN\"><head><title>FIXTURE HTML Post | Site</title><meta name=\"description\" content=\"Fixture description.\">"
          "<meta name=\"author\" content=\"Fixture Writer\"><script>alert(1)</script></head><body><nav><a href=\"/\">Home</a></nav><article><h1>FIXTURE HTML Post</h1>"
          "<p onclick=\"steal()\">Safe <strong>bold</strong> and a <a href=\"javascript:alert(1)\">bad link</a> and a <a href=\"https://example.org/ok\">good link</a>.</p>"
          "<figure><img src=\"shot.png\" alt=\"Settings screen\" width=\"640\" height=\"360\"><figcaption>The settings screen</figcaption></figure>"
          "<iframe src=\"https://www.youtube.com/embed/abc123XYZ_-\" title=\"Walkthrough\"></iframe><iframe src=\"https://evil.example/widget\"></iframe>"
          "<video controls poster=\"shot.png\"><source src=\"clip.webm\" type=\"video/webm\"><track src=\"clip.vtt\" kind=\"captions\" srclang=\"en\" label=\"English\"></video>"
          "<img src=\"https://cdn.example.org/remote.png\" alt=\"Remote picture\"><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td colspan=\"1\">2</td></tr></tbody></table>"
          "<script>document.write('x')</script></article><footer>Footer chrome</footer></body></html>")
    write("html/shot.png", PHOTO)
    write("html/clip.webm", b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\x82\x84webm" + b"\x00" * 64)
    write("html/clip.vtt", "WEBVTT\n\n00:00.000 --> 00:01.000\nFIXTURE\n")
    write("json/article.json", json.dumps({"title": "FIXTURE JSON Article", "author": "Fixture Bot", "date": "2026-09-01", "seo": {"description": "Fixture SEO description."},
                                           "sections": [{"heading": "First", "content": "Para with **bold**.", "image": "pic.png", "alt": "A picture"},
                                                        {"heading": "Data", "table": [{"plan": "Starter", "seats": 50}, {"plan": "Growth", "seats": 250}]}],
                                           "cta": {"text": "Book a demo", "url": "https://example.org/demo"}}))
    write("json/pic.png", PHOTO)
    write("csv/data.csv", "Plan,Seats,Price\nStarter,50,999\nGrowth,250,2499\n")
    write("xml/feed.xml", "<?xml version=\"1.0\"?><rss xmlns:content=\"http://purl.org/rss/1.0/modules/content/\"><channel>"
          "<item><title>FIXTURE Feed One</title><content:encoded><![CDATA[<p>First <em>post</em>.</p><h2>Part</h2><p>More.</p>]]></content:encoded></item>"
          "<item><title>FIXTURE Feed Two</title><content:encoded><![CDATA[<p>Second post.</p>]]></content:encoded></item></channel></rss>")
    # two blogs, each with its own folder of media
    for name, colour in (("alpha", (200, 40, 40)), ("beta", (40, 40, 200))):
        write("multi/%s/post.md" % name, "# FIXTURE %s post\n\nBody of %s.\n\n![Diagram of %s](diagram.png)\n" % (name, name, name))
        write("multi/%s/diagram.png" % name, png(400, 300, colour))
    # one blog in numbered parts
    write("parts/01-intro.md", "# FIXTURE Parted Post\n\nIntro part.\n")
    write("parts/02-body.md", "## Second part\n\nBody part.\n")
    # ambiguous: two unrelated documents side by side
    write("ambiguous/one.md", "# FIXTURE One\n\nText.\n")
    write("ambiguous/two.md", "# FIXTURE Two\n\nText.\n")
    write("ambiguous/shared.png", PHOTO)
    # hostile and broken inputs
    write("hostile/post.md", "# FIXTURE Hostile Package\n\nBody.\n\n![Vector](logo.svg)\n\n[click](javascript:alert(1))\n")
    write("hostile/logo.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50" onload="steal()"><script>alert(1)</script><rect width="100" height="50"/><a href="javascript:x()"><text>t</text></a></svg>')
    write("hostile/installer.exe", b"MZ" + b"\x00" * 100)
    write("hostile/photo.png", b"MZ\x90\x00" + b"\x00" * 100)
    write("hostile/renamed.jpg", png(10, 10, (1, 2, 3)))
    write("hostile/broken.docx", b"PK\x03\x04 this is not a real archive")
    write("hostile/empty.md", "")
    with zipfile.ZipFile(os.path.join(OUT, "slip.zip"), "w") as zf:
        zf.writestr("post.md", "# FIXTURE Zipped Post\n\nFrom an archive.\n\n![Pic](img/pic.png)\n")
        zf.writestr("img/pic.png", PHOTO)
        zf.writestr("../../escaped.txt", "must never be written")
    write("sidecar/post.md", "# Draft heading\n\nIntro text.\n\n## Results\n\nNumbers here.\n\n## Method\n\nSteps here.\n")
    write("sidecar/results.png", CHART)
    write("sidecar/banner.png", COVER)
    write("sidecar/unused.png", PHOTO)
    write("sidecar/blog.json", json.dumps({"title": "FIXTURE Sidecar Title", "cover": "banner.png", "assets": {
        "results.png": {"section": "Results", "position": "end", "alt": "Bar chart of results", "caption": "Results by term"}, "unused.png": {"role": "ignore"}}}))
    print("fixtures written to", OUT)


if __name__ == "__main__":
    main()
