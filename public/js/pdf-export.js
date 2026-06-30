/**
 * pdf-export.js — BWF Official Score Sheet (v2)
 * Matches layout of Badminton Tournament Planner score sheets.
 * Landscape A4 (297 × 210 mm)
 *
 * Header: Title bar | Info row | L-Team box | Score table | R-Team box
 * Grid:   Doubles = 4 rows/game (2 per side); Singles = 2 rows/game
 * Cells:  60 timeline columns × 4 mm — score written chronologically L→R
 * Marks:  Red circle at interval (11) and game-winning point
 *         Score placed on the ROW of the player who is serving (for server team)
 *         and on the ROW of the player who is receiving (for receiver team)
 */

/* ─── Page / Grid Constants ─── */
const PDF = {
  W: 297, H: 210,
  ML: 5, MR: 5,
  NAME_W: 35,
  SR_W: 7,
  CELL_W: 4,
  MAX_COL: 60,
  get GRID_X() { return this.ML + this.NAME_W + this.SR_W + this.CELL_W; }
};

/* ─── Helpers ─── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d    = new Date(iso);
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  return days[d.getDay()] + ' ' + d.toLocaleDateString('id-ID');
}
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDuration(s, e) {
  if (!s || !e) return '—';
  const ms = new Date(e) - new Date(s);
  if (ms <= 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const sec = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const min = totalMin % 60;
  const hrs = Math.floor(totalMin / 60);
  if (hrs > 0) return `${hrs}j ${min}m ${sec}d`;
  return `${min}m ${sec}d`;
}
function teamLabel(team) {
  return [team.player1, team.player2].filter(Boolean).join(' / ') || '—';
}
function checkWinPDF(sL, sR) {
  if (sL >= 30) return 'L';
  if (sR >= 30) return 'R';
  if (sL >= 21 && sL - sR >= 2) return 'L';
  if (sR >= 21 && sR - sL >= 2) return 'R';
  return null;
}

/* ─── Main Entry Point ─── */
function generateScoreSheet(state) {
  if (typeof window.jspdf === 'undefined')
    throw new Error('jsPDF tidak ditemukan. Jalankan npm install lalu restart server.');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Resolve startTime: use matchTimerStart as fallback if startTime not yet set
  const s = Object.assign({}, state, {
    startTime: state.startTime || (state.matchTimerStart ? new Date(state.matchTimerStart).toISOString() : null)
  });

  const isDoubles = !!(s.teams.L.player2 || s.teams.R.player2);
  const DROW_H    = isDoubles ? 7 : 13;
  const rowsPerSide = isDoubles ? 2 : 1;
  const GAME_H    = 5 + 4 + DROW_H * rowsPerSide * 2;

  const HEADER_END = 45;
  const GAME_GAP   = 2;
  const gY = (n) => HEADER_END + 2 + (n - 1) * (GAME_H + GAME_GAP);
  const FOOTER_Y   = gY(4);

  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  doc.setTextColor(0);

  drawHeaderPDF(doc, s);
  for (let g = 1; g <= 3; g++) drawGamePDF(doc, s, g, gY(g), isDoubles, DROW_H, rowsPerSide);
  drawFooterPDF(doc, s, FOOTER_Y);

  const fname = 'ScoreSheet_' +
    (s.tournament || 'Match').replace(/\s+/g, '_') + '_' +
    fmtDate(s.startTime).replace(/[\s/]/g, '-') + '.pdf';
  doc.save(fname);
}

/* ══════════════════════════════════════════════
   HEADER
   ══════════════════════════════════════════════ */
function drawHeaderPDF(doc, state) {
  const { ML, MR, W } = PDF;
  const Y = 5;

  /* 1. Tournament title bar */
  doc.setFillColor(14, 48, 108);
  doc.rect(ML, Y, W - ML - MR, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(
    (state.tournament || 'BADMINTON TOURNAMENT').toUpperCase(),
    W / 2, Y + 5.8,
    { align: 'center', maxWidth: W - 20 }
  );

  /* 2. Event info bar */
  const IY = Y + 8;
  doc.setFillColor(228, 236, 252);
  doc.rect(ML, IY, W - ML - MR, 5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 45, 110);
  doc.text(
    'Event: ' + (state.category || '—') +
    '   |   No.: ' + (state.matchNo || '—') +
    '   |   Date: ' + fmtDate(state.startTime) +
    '   |   Time: ' + fmtTime(state.startTime),
    ML + 2, IY + 3.5
  );
  doc.text(
    'Court: ' + (state.court || '\u2014') +
    '   Start: ' + fmtTime(state.startTime) +
    '   End: ' + fmtTime(state.endTime) +
    '   Dur: ' + fmtDuration(state.startTime, state.endTime),
    W - MR - 2, IY + 3.5, { align: 'right' }
  );
  doc.setTextColor(0);

  /* 3. Main section: L Team | Score Table | R Team */
  const MY = IY + 5;
  const MH = 25;
  const LW = 86, CW = 107;
  const LX = ML, CX = LX + LW, RX = CX + CW;
  const RW = W - MR - RX;

  /* ── L Team Box ── */
  doc.setFillColor(234, 248, 255);
  doc.rect(LX, MY, LW, MH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(10, 55, 160);
  doc.text('L', LX + 3.5, MY + 13);

  const tL = state.teams.L;
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text((tL.player1 || '—').slice(0, 30), LX + 13, MY + 7);
  if (tL.player2) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(tL.player2.slice(0, 30), LX + 13, MY + 12);
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(60, 85, 140);
  doc.text((tL.club || '').slice(0, 32), LX + 13, MY + 18);
  doc.setTextColor(0);
  if (state.winner === 'L') _winBadge(doc, LX + LW - 27, MY + MH - 7, state.isWalkover);

  /* ── Center Score Table ── */
  const colWs  = [CW * 0.40, CW * 0.15, CW * 0.15, CW * 0.15, CW * 0.15];
  const heads  = ['Pemain', 'G1', 'G2', 'G3', 'Set'];
  const HDR_H  = 6, SC_ROW_H = 9.5;

  /* Table header */
  doc.setFillColor(14, 48, 108);
  doc.rect(CX, MY, CW, HDR_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  let sx = CX;
  heads.forEach((h, i) => {
    doc.text(h, sx + colWs[i] / 2, MY + 4.3, { align: 'center' });
    if (i < heads.length - 1) {
      doc.setDrawColor(80, 100, 180); doc.line(sx + colWs[i], MY, sx + colWs[i], MY + HDR_H); doc.setDrawColor(0);
    }
    sx += colWs[i];
  });
  doc.setTextColor(0);

  /* Data rows */
  ['L', 'R'].forEach((side, si) => {
    const ry  = MY + HDR_H + si * SC_ROW_H;
    const isW = state.winner === side;
    doc.setFillColor(isW ? 218 : si === 0 ? 244 : 255, isW ? 255 : 248, isW ? 218 : 255);
    doc.rect(CX, ry, CW, SC_ROW_H, 'FD');
    doc.setDrawColor(170, 185, 220); doc.rect(CX, ry, CW, SC_ROW_H); doc.setDrawColor(0);

    const vals = [
      teamLabel(state.teams[side]).slice(0, 24),
      '' + state.scores.game1[side],
      '' + state.scores.game2[side],
      '' + state.scores.game3[side],
      '' + state.gamesWon[side]
    ];
    sx = CX;
    vals.forEach((v, i) => {
      doc.setFont('helvetica', i === 0 || i === 4 || isW ? 'bold' : 'normal');
      doc.setFontSize(i === 0 ? 6.5 : 8.5);
      doc.text(v, i === 0 ? sx + 1 : sx + colWs[i] / 2, ry + 6.5,
        { align: i === 0 ? 'left' : 'center', maxWidth: colWs[i] - 2 });
      if (i < vals.length - 1) {
        doc.setDrawColor(170, 185, 220);
        doc.line(sx + colWs[i], ry, sx + colWs[i], ry + SC_ROW_H);
        doc.setDrawColor(0);
      }
      sx += colWs[i];
    });
  });

  /* Umpire / Service Judge row — compact inside center table */
  const uY = MY + HDR_H + 2 * SC_ROW_H;
  if (uY + 7 <= MY + MH) {
    doc.setFillColor(230, 235, 255);
    doc.rect(CX, uY, CW, MY + MH - uY, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(40, 55, 120);
    doc.text('Umpire: ' + (state.umpire || '—'), CX + 2, uY + 3.5);
    doc.text('Service Judge: ' + (state.serviceJudge || '—'), CX + CW / 2 + 2, uY + 3.5);
    doc.setTextColor(0);
  }

  /* ── R Team Box ── */
  doc.setFillColor(255, 247, 234);
  doc.rect(RX, MY, RW, MH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(155, 55, 10);
  doc.text('R', RX + 3.5, MY + 13);

  const tR = state.teams.R;
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text((tR.player1 || '—').slice(0, 27), RX + 13, MY + 7);
  if (tR.player2) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(tR.player2.slice(0, 27), RX + 13, MY + 12);
  }
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(135, 75, 25);
  doc.text((tR.club || '').slice(0, 29), RX + 13, MY + 18);
  doc.setTextColor(0);

  if (state.winner === 'R') _winBadge(doc, RX + RW - 27, MY + MH - 7, state.isWalkover);

  /* Outer border + vertical dividers */
  doc.setDrawColor(70, 95, 165);
  doc.setLineWidth(0.4);
  doc.rect(LX, MY, W - ML - MR, MH);
  doc.line(CX, MY, CX, MY + MH);
  doc.line(RX, MY, RX, MY + MH);
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
}

function _winBadge(doc, x, y, isWalkover) {
  doc.setFillColor(isWalkover ? 180 : 22, isWalkover ? 60 : 163, isWalkover ? 0 : 74);
  doc.rect(x, y, 25, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text(isWalkover ? 'W.O.' : 'WINNER', x + 12.5, y + 4.2, { align: 'center' });
  doc.setTextColor(0);
}

/* ══════════════════════════════════════════════
   GAME SECTION
   ══════════════════════════════════════════════ */
function drawGamePDF(doc, state, gameNum, startY, isDoubles, DROW_H, rowsPerSide) {
  const { ML, MR, W, NAME_W, SR_W, CELL_W, MAX_COL, GRID_X } = PDF;
  const TITLE_H = 5, NUM_H = 4;
  const gk  = 'game' + gameNum;
  const sc  = state.scores[gk];
  const gh  = state.history.filter(h => h.game === gameNum);
  const initSrv = gh.length > 0 ? gh[0].prevServer : state.serverSide;

  /* Title bar — different color per game */
  const titleColors = [[14,48,108], [14,88,48], [88,28,14]];
  doc.setFillColor(...titleColors[gameNum - 1]);
  doc.rect(ML, startY, W - ML - MR, TITLE_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 220, 0);
  doc.text('GAME ' + gameNum, ML + 2, startY + 3.6);
  doc.setTextColor(255, 255, 255);
  doc.text('Skor: ' + sc.L + ' \u2013 ' + sc.R, W / 2, startY + 3.6, { align: 'center' });
  const gWin = checkWinPDF(sc.L, sc.R);
  if (gWin) {
    doc.text('[ ' + gWin + ' Menang ]', W - MR - 2, startY + 3.6, { align: 'right' });
  }
  doc.setTextColor(0);

  /* Column number header — starts at 0 */
  const numY = startY + TITLE_H;
  doc.setFillColor(195, 210, 235);
  doc.rect(ML, numY, NAME_W, NUM_H, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(20, 40, 100);
  doc.text('Nama Pemain / Klub', ML + 1, numY + 3);

  doc.setFillColor(205, 215, 235);
  doc.rect(ML + NAME_W, numY, SR_W, NUM_H, 'FD');
  doc.text('S/R', ML + NAME_W + SR_W / 2, numY + 3, { align: 'center' });
  doc.setTextColor(0);

  /* Column 0 header (initial state) */
  const col0x = GRID_X - CELL_W;
  doc.setFillColor(175, 195, 225);
  doc.rect(col0x, numY, CELL_W, NUM_H, 'FD');
  doc.setFontSize(4.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 70, 120);
  doc.text('0', col0x + CELL_W / 2, numY + 2.9, { align: 'center' });

  for (let c = 0; c < MAX_COL - 1; c++) {
    const cx = GRID_X + c * CELL_W;
    const isFive = (c + 1) % 5 === 0;
    doc.setFillColor(isFive ? 190 : 218, isFive ? 202 : 228, isFive ? 235 : 248);
    doc.rect(cx, numY, CELL_W, NUM_H, 'FD');
    doc.setFontSize(4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 70, 120);
    doc.text('' + (c + 1), cx + CELL_W / 2, numY + 2.9, { align: 'center' });
  }
  doc.setTextColor(0);

  /* Player rows */
  const rowDefs = _buildRows(state, isDoubles);
  rowDefs.forEach((rd, ri) => {
    const ry  = startY + TITLE_H + NUM_H + ri * DROW_H;
    const isL = rd.side === 'L';
    const even = ri % 2 === 0;
    const bg   = isL
      ? (even ? [236, 248, 255] : [224, 241, 255])
      : (even ? [255, 248, 236] : [255, 240, 222]);

    /* Name cell */
    doc.setFillColor(...bg);
    doc.rect(ML, ry, NAME_W, DROW_H, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(0);
    doc.text(rd.name.slice(0, 27), ML + 1, ry + (DROW_H > 10 ? 5 : 4.2));
    if (rd.club && DROW_H > 10) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(5.5);
      doc.setTextColor(70, 90, 130);
      doc.text(rd.club.slice(0, 30), ML + 1, ry + DROW_H - 2.5);
      doc.setTextColor(0);
    }

    /* S/R cell — only show on the FIRST row of each side, at the start */
    const isFirstRow = ri === (isL ? 0 : rowsPerSide);
    const isSrv = rd.side === initSrv && isFirstRow;
    const isRcv = rd.side !== initSrv && isFirstRow;
    doc.setFillColor(isSrv ? 255 : 238, isSrv ? 248 : 238, isSrv ? 195 : 255);
    doc.rect(ML + NAME_W, ry, SR_W, DROW_H, 'FD');
    if (isSrv) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 100, 0);
      doc.text('S', ML + NAME_W + SR_W / 2, ry + DROW_H / 2 + 2.5, { align: 'center' });
      doc.setTextColor(0);
    } else if (isRcv) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(160, 0, 0);
      doc.text('R', ML + NAME_W + SR_W / 2, ry + DROW_H / 2 + 2.5, { align: 'center' });
      doc.setTextColor(0);
    }

    /* Score cells + column 0 with initial score "0" */
    const isFirstTeamRow = (ri === 0 && rd.side === 'L') || (ri === rowsPerSide && rd.side === 'R');
    const col0rx = GRID_X - CELL_W;
    doc.setFillColor(245, 248, 255);
    doc.rect(col0rx, ry, CELL_W, DROW_H, 'FD');
    if (isFirstTeamRow) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(60, 80, 140);
      doc.text('0', col0rx + CELL_W / 2, ry + DROW_H / 2 + 1.5, { align: 'center' });
      doc.setTextColor(0);
    }
    for (let c = 0; c < MAX_COL - 1; c++) {
      doc.setFillColor(255, 255, 255);
      doc.rect(GRID_X + c * CELL_W, ry, CELL_W, DROW_H, 'FD');
    }
  });

  /* Score entries — placed on correct player rows */
  const baseY = startY + TITLE_H + NUM_H;
  _drawEntries(doc, gh, baseY, DROW_H, isDoubles, rowsPerSide);
}

function _buildRows(state, isDoubles) {
  if (isDoubles) {
    return [
      { side: 'L', name: state.teams.L.player1 || 'Tim L – P1', club: state.teams.L.club },
      { side: 'L', name: state.teams.L.player2 || 'Tim L – P2', club: '' },
      { side: 'R', name: state.teams.R.player1 || 'Tim R – P1', club: state.teams.R.club },
      { side: 'R', name: state.teams.R.player2 || 'Tim R – P2', club: '' }
    ];
  }
  return [
    { side: 'L', name: state.teams.L.player1 || 'Tim L', club: state.teams.L.club },
    { side: 'R', name: state.teams.R.player1 || 'Tim R', club: state.teams.R.club }
  ];
}

/* ══════════════════════════════════════════════
   SCORE ENTRIES  (BWF Timeline Notation)
   Each entry = one timeline column (left → right).
   Score placed on the server's row (for server team) and receiver's row (for receiver team).
   Red circle at interval (11) and game-winning point.
   No blue diagonal lines.
   ══════════════════════════════════════════════ */
function _drawEntries(doc, gh, baseY, DROW_H, isDoubles, rowsPerSide) {
  const { GRID_X, CELL_W, MAX_COL } = PDF;
  if (!gh || !gh.length) return;

  gh.forEach((entry, col) => {
    if (col >= MAX_COL - 1) return;
    const isL  = entry.scorer === 'L';
    const sc   = isL ? entry.scoreL : entry.scoreR;

    // Determine which row to place the score on
    let rowOffset;
    if (isDoubles) {
      // Server side info
      const srvSide = entry.serverSide || entry.prevServer;
      const srvPlayerIdx = entry.serverPlayerIndex || 1; // 1 or 2

      if (entry.scorer === srvSide) {
        // Server's team scored — place on server's row
        rowOffset = (srvSide === 'L' ? 0 : rowsPerSide) + (srvPlayerIdx - 1);
      } else {
        // Receiver's team scored — place on receiver's row.
        // Receiver = player diagonally opposite to server.
        // Server's court: RIGHT if (P1 & srvScore even) OR (P2 & srvScore odd)
        const rcvSide   = srvSide === 'L' ? 'R' : 'L';
        const srvScore  = srvSide === 'L' ? entry.prevL : entry.prevR;
        const rcvScore  = rcvSide === 'L' ? entry.prevL : entry.prevR;
        const serverInRight  = srvPlayerIdx === 1 ? (srvScore % 2 === 0) : (srvScore % 2 !== 0);
        // Receiver in RIGHT → P1 row(0) if rcvScore even, P2 row(1) if odd
        // Receiver in LEFT  → P2 row(1) if rcvScore even, P1 row(0) if odd
        const rcvPlayerRow = serverInRight === (rcvScore % 2 === 0) ? 1 : 0;
        rowOffset = (rcvSide === 'L' ? 0 : rowsPerSide) + rcvPlayerRow;
      }
    } else {
      // Singles: simple, just the team row
      rowOffset = isL ? 0 : rowsPerSide;
    }

    const rowY = baseY + rowOffset * DROW_H;
    const cx   = GRID_X + col * CELL_W + CELL_W / 2;
    const cy   = rowY + DROW_H / 2;

    /* Score number */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sc > 9 ? 5 : 6);
    doc.setTextColor(0);
    doc.text('' + sc, cx, cy + 2.1, { align: 'center' });

    /* Interval circle — red */
    if (entry.isInterval) {
      doc.setDrawColor(210, 0, 0);
      doc.setLineWidth(0.7);
      doc.circle(cx, cy, 2.8, 'S');
      doc.setDrawColor(0); doc.setLineWidth(0.2);
    }

    /* Game-win circle — thicker red */
    if (entry.isGameWin) {
      doc.setDrawColor(175, 0, 0);
      doc.setLineWidth(1.0);
      doc.circle(cx, cy, 3.3, 'S');
      doc.setDrawColor(0); doc.setLineWidth(0.2);
    }

    /* No blue diagonal lines — removed as requested */
  });
}

/* ══════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════ */
function drawFooterPDF(doc, state, footerY) {
  const { ML, MR, W, H } = PDF;
  const fY = Math.min(footerY, H - 45);

  doc.setDrawColor(50, 75, 160);
  doc.setLineWidth(0.6);
  doc.line(ML, fY, W - MR, fY);
  doc.setDrawColor(0); doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(25, 50, 110);
  doc.text('Mulai: ' + fmtTime(state.startTime), ML, fY + 6.5);
  doc.text('Selesai: ' + fmtTime(state.endTime), ML + 32, fY + 6.5);
  doc.text('Durasi: ' + fmtDuration(state.startTime, state.endTime), ML + 68, fY + 6.5);
  const totalKok = state.shuttlecocks ? (state.shuttlecocks.L || 0) + (state.shuttlecocks.R || 0) : 0;
  const chalL = state.challenges ? state.challenges.L : 2;
  const chalR = state.challenges ? state.challenges.R : 2;
  doc.text('Kok: ' + totalKok + '  |  Chal: L=' + chalL + ' R=' + chalR, ML + 105, fY + 6.5);
  if (state.winner) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(state.isWalkover ? 160 : 0, state.isWalkover ? 60 : 120, 0);
    doc.text(
      'Pemenang: ' + teamLabel(state.teams[state.winner]) +
      '  (' + state.gamesWon.L + '\u2013' + state.gamesWon.R + ')' +
      (state.isWalkover ? '  \u2014 WALKOVER' : ''),
      W - MR - 2, fY + 6.5, { align: 'right' }
    );
    doc.setTextColor(0);
  }
  doc.setTextColor(0);

  /* Signature boxes */
  const sigTop = fY + 11;
  const sigW = 65, sigH = 32;
  [['Wasit / Umpire', state.umpire], ['Referee', state.serviceJudge || '']].forEach(([label, name], i) => {
    const sx = ML + i * (sigW + 12);
    doc.setDrawColor(100, 120, 170);
    doc.rect(sx, sigTop, sigW, sigH);
    doc.setDrawColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(25, 50, 110);
    doc.text(label, sx + sigW / 2, sigTop + 6, { align: 'center' });
    if (name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text(name, sx + sigW / 2, sigTop + sigH - 8, { align: 'center' });
    }
    doc.setLineWidth(0.3);
    doc.line(sx + 5, sigTop + sigH - 3, sx + sigW - 5, sigTop + sigH - 3);
    doc.setLineWidth(0.2);
  });

  /* Watermark */
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(165, 165, 185);
  doc.text(
    'Dicetak: ' + new Date().toLocaleString('id-ID') + '  |  Badminton Scoreboard System v1.0',
    W / 2, H - 3, { align: 'center' }
  );
  doc.setTextColor(0);
}
