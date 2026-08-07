/* ============================================================
   THE ONLY FILE YOU EVER NEED TO EDIT.
   Paste your two Google Sheet CSV links below.
   ============================================================ */

const CONFIG = {

  /* ---- PAGE 1 : your own batch (Sheet 1) ---- */
  batch: {
    title:    "CSE Batch — Dates & Deadlines",
    subtitle: "Class tests, assignments & presentations · kept up to date by your CR",
    csv:      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSm5kPrcM4qiXesSsqRSuQfeucWpA1lk56Kw_rURhbapmfiWimuH8DEiXB96ZWLHNz8zYjecBYw_vnJ/pub?gid=0&single=true&output=csv"
  },

  /* ---- PAGE 2 : department-wide events (Sheet 2) ---- */
  department: {
    title:    "CSE Department — Events & Notices",
    subtitle: "Fests, seminars & department-wide notices",
    csv:      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSm5kPrcM4qiXesSsqRSuQfeucWpA1lk56Kw_rURhbapmfiWimuH8DEiXB96ZWLHNz8zYjecBYw_vnJ/pub?gid=1335365166&single=true&output=csv"
  }
};

/* ------------------------------------------------------------
   SHEET COLUMNS (row 1 headers, spelled exactly like this)

   Sheet 1 (batch):        Type | Topic | Date | Note
   Sheet 2 (department):   Batch | Type | Topic | Date | Note

   Batch  – e.g. "2021", "3rd Year", "Section A".  Leave the whole
            column out if you don't need it; the page adapts.
   Type   – CT, Assignment, Presentation, Exam, Notice, Seminar,
            Holiday, Registration … anything else shows as "Other".
   Date   – best format 2026-08-14  (also takes 14/08/2026 or 14 Aug 2026)
   Note   – optional. Line breaks inside the cell are preserved.
   ------------------------------------------------------------ */
