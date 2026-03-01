
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { storage } from '../../storage';
import { getCountryName } from '../../countries';
import { Loader2 } from 'lucide-react';

// ─── Ensure Cairo is loaded (user-specified font) ─────────────────────────────
function ensureCairo() {
    if (document.getElementById('cairo-card-font')) return;
    const link = document.createElement('link');
    link.id = 'cairo-card-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&display=swap';
    document.head.appendChild(link);
}

const HINT_KEY = 'aou3_card_hint_v3';

// ─────────────────────────────────────────────────────────────────────────────
// RENDER ARCHITECTURE:
//  [Perspective wrapper  dir="ltr"]         ← must be ltr for correct X-axis
//    [Flip container  preserve-3d]          ← rotates 180deg on click
//      [Front face  backface-visibility:hidden]
//        [Gold-frame wrapper]               ← true solid gold border via border prop
//          [Ivory inner card  overflow:hidden]
//      [Back face  backface-visibility:hidden  rotateY(180deg)]
//        [Gold-frame wrapper]
//          [Ivory inner card  logo only]
// ─────────────────────────────────────────────────────────────────────────────

const StudentIDCard: React.FC = () => {
    const { user, setUser, settings, t } = useApp();
    const fileRef = useRef<HTMLInputElement>(null);

    const [flipped, setFlipped] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [hint, setHint] = useState(false);

    useEffect(() => {
        ensureCairo();
        if (!localStorage.getItem(HINT_KEY)) {
            setHint(true);
            const timer = setTimeout(() => { setHint(false); localStorage.setItem(HINT_KEY, '1'); }, 4500);
            return () => clearTimeout(timer);
        }
    }, []);

    // ── Photo upload ─────────────────────────────────────────────────────────
    const onPhoto = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent card flip
        fileRef.current?.click();
    };
    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
        if (file.size > 5 * 1024 * 1024) return;
        setUploading(true);
        try {
            const url = await supabaseService.uploadAvatar(user.id, file);
            setAvatar(url);
            const up = { ...user, avatarUrl: url };
            setUser(up); storage.setAuthUser(up);
        } catch (err) { console.error('[Card]', err); }
        finally { setUploading(false); e.target.value = ''; }
    };

    // ── Data ─────────────────────────────────────────────────────────────────
    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;
    const natAr = user?.nationality ? getCountryName(user.nationality, 'AR') : '—';
    const majorAr = user?.major ? (t.majorList[user.major as keyof typeof t.majorList] || user.major) : '—';
    const dob = (() => {
        if (!user?.dateOfBirth) return '—';
        const d = new Date(user.dateOfBirth);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${d.getFullYear()}/${mm}/${dd}`;
    })();

    // ── Design tokens ─────────────────────────────────────────────────────────
    const FONT = '"Cairo", "Tajawal", Arial, sans-serif';
    const GOLD_A = '#C8A84B';
    const GOLD_B = '#E8C96A';
    const GOLD_C = '#F5E07A';
    const DARK = '#1A1710';
    const IVORY = 'linear-gradient(160deg, #FEFDF6 0%, #FBF5E2 55%, #F6EED4 100%)';

    // Full metallic gold gradient — used as the card's border color via outline/border
    const GOLD_FRAME_BG = `linear-gradient(135deg, ${GOLD_A} 0%, ${GOLD_B} 22%, ${GOLD_C} 40%, ${GOLD_B} 58%, ${GOLD_A} 78%, ${GOLD_B} 88%, ${GOLD_A} 100%)`;

    // Subtle diagonal glossy highlight — slightly stronger than before (C6)
    const GLOSS = `
        radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 35%, transparent 65%),
        linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 35%, transparent 60%)
    `;

    // ── Reusable field row ────────────────────────────────────────────────────
    const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{
                fontSize: '7.5px', fontWeight: 600, color: GOLD_A,
                fontFamily: FONT, letterSpacing: '.10em', textTransform: 'uppercase',
            }}>
                {label}
            </span>
            <span style={{
                fontSize: mono ? '11.5px' : '12.5px',
                fontWeight: 700,
                color: DARK,
                fontFamily: mono ? '"SF Mono","Courier New",monospace' : FONT,
                letterSpacing: mono ? '.12em' : '0',
                lineHeight: 1.25,
            }}>
                {value}
            </span>
        </div>
    );

    // ── Gold-framed card shell ────────────────────────────────────────────────
    // Uses a 2px solid metallic gradient as background of the outer div (padding trick),
    // which gives a full, continuous gold border on all four sides (C5).
    const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
        <div style={{
            width: '100%', height: '100%',
            background: GOLD_FRAME_BG,
            borderRadius: '18px',
            padding: '2.5px', // slightly thicker = more visible gold border (C5)
            boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(201,168,75,0.20) inset',
        }}>
            {/* Inner ivory card */}
            <div style={{
                width: '100%', height: '100%',
                background: IVORY,
                borderRadius: '15.5px',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Glossy highlight overlay (C6) */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: GLOSS,
                    pointerEvents: 'none',
                    zIndex: 1,
                    borderRadius: '15.5px',
                }} />
                {children}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFile} />

            {/* First-visit hint */}
            {hint && (
                <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: FONT, textAlign: 'center', direction: 'rtl' }}>
                    اضغط للقلب · اضغط على الصورة للتغيير
                </p>
            )}

            {/*
              dir="ltr" ensures rotateY() acts on the correct physical X-axis.
              Without this, RTL reverses the axis and the back face appears on the wrong side.
              Tap anywhere on card body = flip (C3). Tap photo area = upload (C3).
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
                {/* Flip container */}
                <div style={{
                    width: '100%', height: '100%',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.85s cubic-bezier(0.25, 0.1, 0.2, 1.0)',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}>

                    {/* ═══════════════════════════════════════════════════════
                        FRONT FACE — NO overflow:hidden on this div
                    ═══════════════════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                    }}>
                        <Frame>
                            {/* Content layer above gloss (z-index 2) */}
                            <div dir="rtl" style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'row',
                                padding: '14px 14px 13px',
                                gap: '12px',
                                alignItems: 'stretch',
                                zIndex: 2,
                            }}>

                                {/* ── Text info area ──────────────────────────── */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                                    {/* University header — C1: Cairo, improved sizing */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                                        {logoSrc ? (
                                            <img src={logoSrc} alt="" style={{ height: '28px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                                        ) : (
                                            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(200,168,75,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span style={{ fontSize: '8px', fontWeight: 700, color: GOLD_A, fontFamily: FONT }}>AOU</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                            {/* C1: Larger, bolder university name */}
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: DARK, lineHeight: 1.2, fontFamily: FONT }}>
                                                {settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                                            </span>
                                            <span style={{ fontSize: '7.5px', fontWeight: 600, color: GOLD_A, lineHeight: 1.2, fontFamily: FONT, letterSpacing: '.05em' }}>
                                                بطاقة طالب جامعي
                                            </span>
                                        </div>
                                    </div>

                                    {/* Gold separator */}
                                    <div style={{ height: '1px', background: `linear-gradient(90deg, rgba(200,168,75,0.7), transparent)`, marginBottom: '8px', flexShrink: 0 }} />

                                    {/* Student name — C1: well-sized, not the only large element */}
                                    <div style={{
                                        fontSize: '18px', fontWeight: 800, color: DARK,
                                        fontFamily: FONT, lineHeight: 1.15, marginBottom: '4px',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0,
                                    }}>
                                        {user?.fullName || '—'}
                                    </div>

                                    {/* University ID — C2: labeled */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginBottom: '8px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '7.5px', fontWeight: 700, color: GOLD_A, letterSpacing: '.12em', fontFamily: FONT }}>
                                            الرقم الجامعي
                                        </span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: DARK, fontFamily: '"SF Mono","Courier New",monospace', letterSpacing: '.14em' }}>
                                            {user?.universityId || '—'}
                                        </span>
                                    </div>

                                    {/* Fields grid — C2: nationality, DOB, major, level */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 8px', flex: 1, alignContent: 'start' }}>
                                        <Field label="الجنسية" value={natAr} />
                                        <Field label="تاريخ الميلاد" value={dob} mono />
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <Field label="التخصص" value={majorAr} />
                                        </div>
                                    </div>

                                    {/* Level badge */}
                                    <div style={{ marginTop: '6px', flexShrink: 0 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            background: 'rgba(200,168,75,0.09)',
                                            border: '1px solid rgba(200,168,75,0.40)',
                                            borderRadius: '5px', padding: '2px 10px',
                                            fontSize: '8px', fontWeight: 700, color: '#8B6E1E',
                                            fontFamily: FONT, letterSpacing: '.04em',
                                        }}>
                                            المرحلة: بكالوريوس
                                        </span>
                                    </div>
                                </div>

                                {/* ── Photo area — C3: tap=upload, no icon ─────────── */}
                                <div
                                    onClick={onPhoto}
                                    title="اضغط لتغيير الصورة"
                                    style={{ flexShrink: 0, width: '22%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <div style={{
                                        width: '100%', aspectRatio: '3/4',
                                        borderRadius: '9px',
                                        border: `1.5px solid rgba(200,168,75,0.5)`,
                                        overflow: 'hidden',
                                        background: 'rgba(200,168,75,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)',
                                        transition: 'border-color 0.2s',
                                    }}>
                                        {uploading ? (
                                            <Loader2 size={13} style={{ color: GOLD_A }} className="animate-spin" />
                                        ) : avatar ? (
                                            <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            /* Placeholder silhouette — no camera icon (C3) */
                                            <svg viewBox="0 0 40 52" style={{ width: '58%', opacity: 0.18 }} fill={GOLD_A}>
                                                <circle cx="20" cy="15" r="9" />
                                                <path d="M2 48c0-9.94 8.06-18 18-18s18 8.06 18 18H2z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Frame>
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                        BACK FACE — C4: ONLY university logo centered.
                        No mirrored text, no user info at all.
                        Pre-rotated 180deg → hidden when front is shown.
                    ═══════════════════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}>
                        <Frame>
                            {/* Back content — university logo only */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center',
                                gap: '10px',
                                zIndex: 2,
                            }}>
                                {/* Radial glow behind logo for premium feel */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'radial-gradient(ellipse at center, rgba(200,168,75,0.10) 0%, transparent 70%)',
                                    pointerEvents: 'none',
                                }} />
                                {logoSrc ? (
                                    <img
                                        src={logoSrc}
                                        alt=""
                                        style={{
                                            height: '45%', width: 'auto', objectFit: 'contain',
                                            opacity: 0.55,
                                            filter: 'sepia(0.8) saturate(1.8) hue-rotate(3deg) brightness(0.75)',
                                            position: 'relative', zIndex: 1,
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '52px', fontWeight: 700, color: `rgba(200,168,75,0.25)`, fontFamily: FONT, letterSpacing: '6px', position: 'relative', zIndex: 1 }}>
                                        AOU
                                    </span>
                                )}
                                {/* University name below logo — subtle */}
                                <span style={{
                                    fontSize: '9px', fontWeight: 700,
                                    color: `rgba(139,110,30,0.55)`,
                                    fontFamily: FONT, letterSpacing: '.08em',
                                    position: 'relative', zIndex: 1,
                                }}>
                                    {settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                                </span>
                            </div>
                        </Frame>
                    </div>

                </div>{/* /flip container */}
            </div>{/* /perspective wrapper */}
        </div>
    );
};

export default StudentIDCard;
