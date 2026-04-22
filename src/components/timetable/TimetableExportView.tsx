
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TimetableExportView — A4 portrait export template
//
// Rules:
// • ALL styles are inline — no Tailwind, no CSS classes.
// • Fixed 794px width (A4 at 96dpi). html2canvas captures this div only.
// • Data is mapped EXACTLY ONCE via props — no internal loops are duplicated.
// • No sidebar, no navbar, no mobile layout, no scroll containers.
// • Used by Timetable.tsx via ReactDOM.createRoot into a detached hidden div.
// ─────────────────────────────────────────────────────────────────────────────

export interface TimetableRow {
    day: string;
    code: string;
    subject: string;
    time: string;
    notes: string;
    doctor: string;
}

interface Props {
    rows: TimetableRow[];
    fullName: string;
    universityId: string;
    printDate: string;
    isRtl: boolean;
    logoSrc: string | null;
}

const GOLD = '#D4AF37';
const GOLD_LIGHT = 'rgba(212,175,55,0.12)';
const GOLD_MID = 'rgba(212,175,55,0.25)';
const GOLD_STRIPE = 'linear-gradient(90deg, #c9983a 0%, #F5E07A 45%, #D4AF37 70%, #c9983a 100%)';
const FONT = '"Cairo", "Segoe UI", sans-serif';
const BG = '#ffffff';

const TimetableExportView: React.FC<Props> = ({
    rows, fullName, universityId, printDate, isRtl, logoSrc,
}) => {
    const labels = {
        title: isRtl ? 'جدولي الدراسي' : 'My Timetable',
        day: isRtl ? 'اليوم' : 'Day',
        subject: isRtl ? 'المادة' : 'Subject',
        time: isRtl ? 'الوقت' : 'Time',
        notes: isRtl ? 'ملاحظات' : 'Notes',
        printed: isRtl ? `طُبع في: ${printDate}` : `Printed: ${printDate}`,
    };

    return (
        <div
            id="__timetable_export_root__"
            style={{
                width: '794px',
                minHeight: '400px',
                background: BG,
                fontFamily: FONT,
                padding: '52px 56px 44px',
                boxSizing: 'border-box',
                color: '#111111',
                direction: isRtl ? 'rtl' : 'ltr',
            }}
        >
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div style={{
                textAlign: 'center',
                marginBottom: '30px',
                paddingBottom: '24px',
                borderBottom: `2px solid ${GOLD_MID}`,
            }}>
                {/* Logo — one time only */}
                {logoSrc ? (
                    <img
                        src={logoSrc}
                        alt="Logo"
                        style={{ height: '40px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 12px' }}
                    />
                ) : (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: GOLD_LIGHT, marginBottom: '12px',
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: GOLD, fontFamily: FONT }}>AOU</span>
                    </div>
                )}

                <div style={{
                    fontSize: '26px', fontWeight: 900, color: '#111',
                    letterSpacing: '-0.02em', marginBottom: '12px', fontFamily: FONT,
                }}>
                    {labels.title}
                </div>

                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                    background: GOLD_LIGHT,
                    border: `1px solid ${GOLD_MID}`,
                    borderRadius: '50px', padding: '7px 22px',
                }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#111', fontFamily: FONT }}>{fullName}</span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: GOLD, display: 'inline-block' }} />
                    <span style={{ fontWeight: 900, fontSize: '13px', color: GOLD, letterSpacing: '.1em', fontFamily: FONT }}>{universityId}</span>
                </div>
            </div>

            {/* ── Table — single render, fixed layout ─────────────────────────── */}
            <table
                dir={isRtl ? 'rtl' : 'ltr'}
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: FONT,
                    tableLayout: 'fixed',
                }}
            >
                <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '34%' }} />
                </colgroup>

                <thead>
                    <tr>
                        {/* Day */}
                        <th style={{
                            ...thStyle,
                            textAlign: 'center',
                        }}>
                            {labels.day}
                        </th>
                        {/* Subject */}
                        <th style={{
                            ...thStyle,
                            textAlign: isRtl ? 'right' : 'left',
                            paddingLeft: '16px',
                            paddingRight: '16px',
                        }}>
                            {labels.subject}
                        </th>
                        {/* Time */}
                        <th style={{ ...thStyle, textAlign: 'center' }}>
                            {labels.time}
                        </th>
                        {/* Notes */}
                        <th style={{ ...thStyle, textAlign: 'center' }}>
                            {labels.notes}
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={`export-row-${i}`}
                            style={{ background: i % 2 === 0 ? '#ffffff' : 'rgba(212,175,55,0.03)' }}
                        >
                            {/* Day */}
                            <td style={{
                                ...tdStyle,
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '13px',
                                color: '#111',
                            }}>
                                {row.day}
                            </td>

                            {/* Subject */}
                            <td style={{
                                ...tdStyle,
                                textAlign: isRtl ? 'right' : 'left',
                                paddingLeft: '16px',
                                paddingRight: '16px',
                            }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: GOLD, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '3px', fontFamily: FONT }}>
                                    {row.code}
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#111', lineHeight: 1.3, fontFamily: FONT }}>
                                    {row.subject}
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginTop: '3px', fontFamily: FONT }}>
                                    {row.doctor}
                                </div>
                            </td>

                            {/* Time */}
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <span style={{
                                    display: 'inline-block',
                                    fontSize: '12px', fontWeight: 800,
                                    color: GOLD,
                                    background: GOLD_LIGHT,
                                    border: `1px solid ${GOLD_MID}`,
                                    borderRadius: '50px',
                                    padding: '4px 14px',
                                    fontFamily: FONT,
                                }}>
                                    {row.time}
                                </span>
                            </td>

                            {/* Notes */}
                            <td style={{
                                ...tdStyle,
                                textAlign: 'center',
                                fontSize: '12px',
                                color: '#6b7280',
                                fontFamily: FONT,
                            }}>
                                {row.notes || '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ── Footer ──────────────────────────────────────────────────────── */}
            <div style={{
                marginTop: '28px',
                paddingTop: '12px',
                borderTop: `1px solid ${GOLD_MID}`,
                textAlign: isRtl ? 'left' : 'right',
                fontSize: '10px',
                color: '#a0a0a0',
                fontWeight: 600,
                fontFamily: FONT,
            }}>
                {labels.printed}
            </div>
        </div>
    );
};

// ── Shared cell styles (defined outside component to avoid re-creation) ───────
const thStyle: React.CSSProperties = {
    borderTop: `3px solid ${GOLD}`,
    borderBottom: `2px solid ${GOLD_MID}`,
    background: 'rgba(212,175,55,0.07)',
    padding: '12px 14px',
    fontSize: '10px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    color: '#555',
    fontFamily: FONT,
};

const tdStyle: React.CSSProperties = {
    padding: '14px',
    borderBottom: `1px solid rgba(212,175,55,0.15)`,
    verticalAlign: 'middle',
    fontFamily: FONT,
};

export default TimetableExportView;
