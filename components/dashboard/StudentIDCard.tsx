
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { storage } from '../../storage';
import { getCountryName } from '../../countries';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// LUXURY MEMBERSHIP STUDENT CARD
// Design: VIP-level physical card aesthetic — ivory base, gold metal border,
// generous breathing space, dominant name, no UI clutter.
//
// Flip rules (critical for RTL):
// • Outer wrapper is ALWAYS dir="ltr" — keeps rotateY on correct X-axis.
// • Arabic text uses dir="rtl" on inner content divs only.
// • Back face: pre-rotated rotateY(180deg). Container adds 180deg → net 360 = readable.
// ─────────────────────────────────────────────────────────────────────────────

const HINT_KEY = 'aou3_luxury_hint_v1';

const StudentIDCard: React.FC = () => {
    const { user, setUser, settings, t } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [flipped, setFlipped] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [hint, setHint] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(HINT_KEY)) {
            setHint(true);
            const timer = setTimeout(() => {
                setHint(false);
                localStorage.setItem(HINT_KEY, 'true');
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, []);

    // ── Photo upload ───────────────────────────────────────────────────────────
    const onPhotoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
        if (file.size > 5 * 1024 * 1024) return;
        setUploading(true);
        try {
            const url = await supabaseService.uploadAvatar(user.id, file);
            setAvatar(url);
            const updated = { ...user, avatarUrl: url };
            setUser(updated);
            storage.setAuthUser(updated);
        } catch (err) { console.error('[Card upload]', err); }
        finally { setUploading(false); e.target.value = ''; }
    };

    // ── Data ───────────────────────────────────────────────────────────────────
    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;
    const nationalityAr = user?.nationality ? getCountryName(user.nationality, 'AR') : '—';
    // Date — English digits always
    const dobFormatted = user?.dateOfBirth
        ? (() => {
            const d = new Date(user.dateOfBirth);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd} / ${mm} / ${yyyy}`;
        })()
        : '—';
    // Major — Arabic label from translation map, never the raw slug
    const majorAr = user?.major
        ? (t.majorList[user.major as keyof typeof t.majorList] || user.major)
        : '—';

    // ── Style constants ────────────────────────────────────────────────────────
    const GOLD = '#C9A84C';
    const GOLD2 = '#E8C96A';
    const IVORY = '#FDFAF0';
    const IVORY2 = '#F8F2DC';
    const DARK = '#1A1710';
    const MUTED = '#7A7060';
    const FONT = '"Cairo", "Segoe UI", sans-serif';
    const GOLD_BORDER = `2px solid ${GOLD}`;

    const CARD_BG = `linear-gradient(160deg, ${IVORY} 0%, #FBF4E0 55%, ${IVORY2} 100%)`;
    const GOLD_LINE = `linear-gradient(90deg, transparent 0%, ${GOLD} 20%, ${GOLD2} 50%, ${GOLD} 80%, transparent 100%)`;

    // Shared face styles
    const face: React.CSSProperties = {
        position: 'absolute', inset: 0,
        borderRadius: '18px',
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        background: CARD_BG,
        // True metallic border — inset box-shadow for inner glow, solid border
        border: `1.5px solid ${GOLD}`,
        boxSizing: 'border-box',
    };

    // ── Label + Value pair ─────────────────────────────────────────────────────
    const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{
                fontSize: '8px', fontWeight: 700, letterSpacing: '.15em',
                textTransform: 'uppercase', color: GOLD, fontFamily: FONT,
                opacity: 0.9,
            }}>{label}</span>
            <span style={{
                fontSize: mono ? '13px' : '14px',
                fontWeight: 800,
                color: DARK,
                fontFamily: mono ? '"Courier New", monospace' : FONT,
                letterSpacing: mono ? '.05em' : '0',
                lineHeight: 1.2,
            }}>{value}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFileChange} />

            {/* One-time hint */}
            {hint && (
                <p style={{
                    fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)',
                    fontFamily: FONT, textAlign: 'center', direction: 'rtl', opacity: 0.9,
                }}>
                    اضغط على البطاقة لقلبها · اضغط على الصورة لتغييرها
                </p>
            )}

            {/*
        IMPORTANT: dir="ltr" on the outer wrapper keeps rotateY() on the
        physical X-axis — prevents RTL from mirroring the flip direction.
      */}
            <div
                dir="ltr"
                onClick={() => setFlipped(f => !f)}
                style={{
                    width: '100%', maxWidth: '420px',
                    aspectRatio: '1.586 / 1',
                    perspective: '1100px',
                    cursor: 'pointer',
                    userSelect: 'none', WebkitUserSelect: 'none',
                }}
            >
                {/* Flip inner */}
                <div style={{
                    width: '100%', height: '100%', position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.85s cubic-bezier(0.3, 0.1, 0.2, 1.0)',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    borderRadius: '18px',
                    // Outer glow
                    filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.18)) drop-shadow(0 10px 40px rgba(0,0,0,0.22))',
                }}>

                    {/* ═══════════════ FRONT ═══════════════════════════════════════════ */}
                    <div style={face}>
                        {/* Metallic inner glow rim */}
                        <div style={{
                            position: 'absolute', inset: '3px',
                            borderRadius: '15px',
                            border: '1px solid rgba(201,168,76,0.25)',
                            pointerEvents: 'none', zIndex: 1,
                        }} />

                        {/* Top gold metallic stripe */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                            background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD2} 35%, #F5E07A 50%, ${GOLD2} 65%, ${GOLD} 100%)`,
                            zIndex: 2,
                        }} />
                        {/* Bottom stripe */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
                            background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD2} 50%, ${GOLD} 100%)`,
                            zIndex: 2,
                        }} />

                        {/* Content — RTL for Arabic */}
                        <div dir="rtl" style={{
                            position: 'absolute', inset: '6px 0 4px 0',
                            display: 'flex', flexDirection: 'row',
                            padding: '14px 16px 12px',
                            gap: '14px',
                            alignItems: 'stretch',
                        }}>

                            {/* ── LEFT INFO AREA ─────────────────────────────── */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', minWidth: 0 }}>

                                {/* University row — logo + name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                    {logoSrc ? (
                                        <img src={logoSrc} alt="" style={{ height: '26px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{
                                            width: '26px', height: '26px', borderRadius: '7px',
                                            background: 'rgba(201,168,76,0.15)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <span style={{ fontSize: '8px', fontWeight: 900, color: GOLD, fontFamily: FONT }}>AOU</span>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: 900, color: DARK, lineHeight: 1.2, fontFamily: FONT }}>
                                            الجامعة الأمريكية المفتوحة
                                        </div>
                                        <div style={{ fontSize: '7px', fontWeight: 600, color: GOLD, lineHeight: 1.3, fontFamily: FONT, letterSpacing: '.06em' }}>
                                            Arab Open University
                                        </div>
                                    </div>
                                </div>

                                {/* Gold separator */}
                                <div style={{ height: '1px', background: GOLD_LINE, marginBottom: '10px' }} />

                                {/* STUDENT NAME — dominant element */}
                                <div style={{
                                    fontSize: '18px', fontWeight: 900, color: DARK,
                                    fontFamily: FONT, lineHeight: 1.15,
                                    marginBottom: '6px',
                                    letterSpacing: '-0.01em',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {user?.fullName || '—'}
                                </div>

                                {/* Student ID — spaced mono style */}
                                <div style={{
                                    fontSize: '12px', fontWeight: 700, color: GOLD,
                                    fontFamily: '"Courier New", monospace',
                                    letterSpacing: '.18em',
                                    marginBottom: '12px',
                                }}>
                                    {user?.universityId || '—'}
                                </div>

                                {/* Thin gold line separator */}
                                <div style={{ height: '1px', background: `linear-gradient(90deg, rgba(201,168,76,0.5), transparent)`, marginBottom: '10px' }} />

                                {/* Fields — 2 column grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px', flex: 1, alignContent: 'start' }}>
                                    <Field label="الجنسية" value={nationalityAr} />
                                    <Field label="تاريخ الميلاد" value={dobFormatted} mono />
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <Field label="التخصص" value={majorAr} />
                                    </div>
                                </div>

                                {/* Stage badge — bottom */}
                                <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center',
                                        background: 'rgba(201,168,76,0.10)',
                                        border: `1px solid rgba(201,168,76,0.4)`,
                                        borderRadius: '6px', padding: '3px 10px',
                                        fontSize: '8.5px', fontWeight: 800,
                                        color: '#9B7E2D', fontFamily: FONT, letterSpacing: '.05em',
                                    }}>
                                        المرحلة: بكالوريوس
                                    </span>
                                </div>
                            </div>

                            {/* ── PHOTO — portrait frame, RIGHT side in RTL ── */}
                            <div
                                onClick={onPhotoClick}
                                style={{
                                    flexShrink: 0, width: '25%',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer',
                                    paddingTop: '0px',
                                }}
                            >
                                <div style={{
                                    width: '100%', aspectRatio: '3/4',
                                    borderRadius: '10px',
                                    border: `1.5px solid rgba(201,168,76,0.5)`,
                                    overflow: 'hidden',
                                    background: 'rgba(201,168,76,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    // Inner shadow for depth
                                    boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)',
                                }}>
                                    {uploading ? (
                                        <Loader2 size={14} style={{ color: GOLD }} className="animate-spin" />
                                    ) : avatar ? (
                                        <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        /* Minimal person silhouette */
                                        <svg viewBox="0 0 40 52" style={{ width: '60%', opacity: 0.15 }} fill={GOLD}>
                                            <circle cx="20" cy="15" r="9" />
                                            <path d="M2 48c0-9.94 8.06-18 18-18s18 8.06 18 18H2z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════ BACK ════════════════════════════════════════════
              Pre-rotated 180deg. Container flip adds 180 → net 360 = upright.
              dir="ltr" on face, Arabic content has dir="rtl" inline.
          ═══════════════════════════════════════════════════════════════════ */}
                    <div style={{ ...face, transform: 'rotateY(180deg)' }}>
                        {/* Top metallic stripe */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                            background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD2} 35%, #F5E07A 50%, ${GOLD2} 65%, ${GOLD} 100%)`,
                        }} />
                        {/* Bottom stripe */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px',
                            background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD2} 50%, ${GOLD} 100%)`,
                        }} />
                        {/* Inner glow rim */}
                        <div style={{
                            position: 'absolute', inset: '3px',
                            borderRadius: '15px',
                            border: '1px solid rgba(201,168,76,0.2)',
                            pointerEvents: 'none',
                        }} />

                        {/* Watermark — large, very subtle */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                        }}>
                            {logoSrc ? (
                                <img src={logoSrc} alt="" style={{ height: '58%', width: 'auto', objectFit: 'contain', opacity: 0.05 }} />
                            ) : (
                                <span style={{ fontSize: '64px', fontWeight: 900, color: `rgba(201,168,76,0.05)`, fontFamily: FONT }}>AOU</span>
                            )}
                        </div>

                        {/* Back content — centered */}
                        <div dir="rtl" style={{
                            position: 'absolute', inset: '6px 0 4px 0',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '8px', padding: '16px 28px',
                        }}>
                            <div style={{ fontSize: '17px', fontWeight: 900, color: DARK, textAlign: 'center', fontFamily: FONT, letterSpacing: '-0.01em' }}>
                                الجامعة الأمريكية المفتوحة
                            </div>
                            <div style={{ height: '1px', width: '60%', background: GOLD_LINE, margin: '2px 0' }} />
                            <div style={{ fontSize: '9.5px', fontWeight: 700, color: MUTED, textAlign: 'center', fontFamily: FONT }}>
                                Arab Open University
                            </div>
                            <div style={{ fontSize: '8.5px', fontWeight: 600, color: MUTED, textAlign: 'center', fontFamily: FONT }}>
                                المركز الإقليمي الأول
                            </div>
                            <div style={{
                                fontSize: '9px', fontWeight: 700,
                                color: 'rgba(201,168,76,0.7)',
                                letterSpacing: '.16em', textTransform: 'uppercase',
                                fontFamily: '"Courier New", monospace',
                                marginTop: '6px',
                            }}>
                                {'AOU3 · ' + (user?.universityId || '')}
                            </div>
                        </div>
                    </div>

                </div>{/* /inner */}
            </div>{/* /outer */}
        </div>
    );
};

export default StudentIDCard;
