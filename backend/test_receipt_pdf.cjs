const { jsPDF } = require('jspdf');
const fs = require('fs');

function testReceiptPdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(); // 210
  const H = doc.internal.pageSize.getHeight(); // 297

  // Outer border frame
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.roundedRect(12, 12, W - 24, H - 24, 3, 3, 'S');

  // Inner subtle frame line
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.roundedRect(13.5, 13.5, W - 27, H - 27, 2, 2, 'S');

  // ── Header (Centered) ──
  // Top Header Background Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(14, 14, W - 28, 38, 2, 2, 'F');

  // TATTI Logo / Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('TATTI', W / 2, 25, { align: 'center' });

  // Institute Name
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text('Tamil Nadu Advanced Technical Training Institute', W / 2, 32, { align: 'center' });

  // Tagline / Contact
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Chennai, Tamil Nadu  |  www.tatti.edu.in  |  info@tatti.edu.in  |  +91-44-1234-5678', W / 2, 38, { align: 'center' });
  doc.text('Approved Vocational & Technical Training Partner', W / 2, 43, { align: 'center' });

  // Accent stripe below header
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(14, 52, W - 28, 1.5, 'F');

  // ── PAYMENT RECEIPT Title Badge ──
  const badgeY = 58;
  doc.setFillColor(238, 242, 255); // indigo-50
  doc.setDrawColor(199, 210, 254); // indigo-200
  doc.setLineWidth(0.3);
  doc.roundedRect(W / 2 - 38, badgeY, 76, 9, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('PAYMENT RECEIPT', W / 2, badgeY + 6.3, { align: 'center' });

  // ── Meta Info (Receipt No & Date/Time) ──
  const metaY = 74;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Receipt No : ', 20, metaY);
  doc.setTextColor(15, 23, 42);
  doc.text('REC-APP2026859867', 38, metaY);

  doc.setTextColor(71, 85, 105);
  doc.text('Payment Date : ', W - 65, metaY, { align: 'right' });
  doc.setTextColor(15, 23, 42);
  doc.text('23 September 2026, 12:05 PM', W - 20, metaY, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, 78, W - 20, 78);

  let curY = 86;

  // Reusable Section Header
  const drawSectionHeading = (title) => {
    doc.setFillColor(248, 250, 252);
    doc.rect(20, curY - 4, W - 40, 7.5, 'F');
    // Left blue accent bar
    doc.setFillColor(37, 99, 235);
    doc.rect(20, curY - 4, 2.5, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(title, 25, curY + 1.2);
    curY += 8;
  };

  // Reusable 2-Column Row with perfect alignment
  const labelX = 25;
  const colonX = 65;
  const valueX = 69;
  const maxValueW = W - 20 - valueX; // 210 - 20 - 69 = 121 mm

  const drawRow = (label, value, isStatusBadge = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(label, labelX, curY);

    doc.text(':', colonX, curY);

    if (isStatusBadge) {
      // Draw official green Paid / Approved badge
      const badgeW = 32;
      const badgeH = 5.5;
      doc.setFillColor(220, 252, 231); // green-100
      doc.setDrawColor(134, 239, 172); // green-300
      doc.setLineWidth(0.2);
      doc.roundedRect(valueX, curY - 4, badgeW, badgeH, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61); // green-700
      doc.text('✓ ' + (value || 'Paid / Approved'), valueX + badgeW / 2, curY - 0.2, { align: 'center' });
      curY += 6.5;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42); // slate-900

      const lines = doc.splitTextToSize(String(value || '—'), maxValueW);
      lines.forEach((line, lIdx) => {
        doc.text(line, valueX, curY + (lIdx * 4.5));
      });
      curY += Math.max(6.5, lines.length * 4.5 + 2);
    }
  };

  // ── Section 1: Student Details ──
  drawSectionHeading('STUDENT DETAILS');
  drawRow('Student Name', 'karthik subramanian');
  drawRow('Student ID', '2026-TATTI-010');
  drawRow('Course', 'Cybersecurity & Ethical Hacking Advanced Diploma Program');
  drawRow('Application ID', 'APP2026859867');
  drawRow('Duration', '10 Months');

  curY += 1;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(20, curY, W - 20, curY);
  curY += 6;

  // ── Section 2: Payment Details ──
  drawSectionHeading('PAYMENT DETAILS');
  drawRow('Payment ID', '06dc0168-6966-446e-9132-84be0506ed20');
  drawRow('UTR / Reference', '0987898767878987654321');
  drawRow('Payment Date', '23 September 2026');
  drawRow('Payment Time', '12:05 PM');
  drawRow('Payment Method', 'UPI (Google Pay / PhonePe / Paytm)');
  drawRow('Payment Status', 'Paid / Approved', true);

  curY += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(20, curY, W - 20, curY);
  curY += 6;

  // ── Section 3: Amount Block ──
  const amtBoxY = curY;
  const amtBoxH = 26;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.setLineWidth(0.3);
  doc.roundedRect(20, amtBoxY, W - 40, amtBoxH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text('TOTAL AMOUNT PAID', W / 2, amtBoxY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('Rs. 70,000', W / 2, amtBoxY + 14.5, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(22, 163, 74);
  doc.text('✓  PAYMENT SUCCESSFUL', W / 2, amtBoxY + 21, { align: 'center' });

  curY = amtBoxY + amtBoxH + 8;

  // ── Section 4: Security / Verification Notice ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(20, curY, W - 40, 10, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Official Verified Payment: This payment has been verified and confirmed by TATTI Administration.', W / 2, curY + 6.5, { align: 'center' });

  curY += 16;

  // ── Section 5: Footer ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, curY, W - 20, curY);

  curY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Thank you for choosing TATTI', W / 2, curY, { align: 'center' });

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('This is a computer-generated official receipt and does not require a physical signature.', W / 2, curY, { align: 'center' });

  curY += 4.5;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TATTI - Tamil Nadu Advanced Technical Training Institute, Chennai, Tamil Nadu  |  Helpline: +91-44-1234-5678', W / 2, curY, { align: 'center' });

  const buf = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync('scratch_receipt_test.pdf', buf);
  console.log('Receipt PDF generated successfully! Bytes:', buf.length);
}

testReceiptPdf();
