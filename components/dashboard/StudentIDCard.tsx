
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { storage } from '../../storage';
import { getCountryName } from '../../countries';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Load Noto Naskh Arabic — refined, classical Arabic typeface (closest freely
// available equivalent to DIN Next Arabic / Swissra aesthetics).
// ─────────────────────────────────────────────────────────────────────────────
function ensurePremiumFont() {
    if (document.getElementById('noto-naskh-link')) return;
    const link = document.createElement('link');
    link.id = 'noto-naskh-link';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
}

const HINT_KEY = 'aou3_card_hint_v2';

// ─────────────────────────────────────────────────────────────────────────────
// RENDER ARCHITECTURE (solves the mirroring bug):
//
//  [Perspective wrapper  dir="ltr"]          ← must be ltr for correct X-axis
//    [Flip container  preserve-3d]           ← rotates 180deg on click
//      [Front face  backface-visibility:hidden]   ← NO overflow:hidden here!
//        [Gold-frame wrapper]                ← gradient bg + 2px padding
//          [Ivory inner card  overflow:hidden]    ← overflow HERE, not on face
//      [Back face   backface-visibility:hidden  rotateY(180deg)]
//        [Gold-frame wrapper]
//          [Ivory inner card  overflow:hidden  logo only]
//
// Keeping overflow:hidden OFF the 3D-transformed face divs is the critical fix.
// ─────────────────────────────────────────────────────────────────────────────

const StudentIDCard: React.FC = () => {
    const { user, setUser, settings, t } = useApp();
    const fileRef = useRef<HTMLInputElement>(null);

    const [flipped, setFlipped] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [hint, setHint] = useState(false);

    useEffect(() => {
        ensurePremiumFont();
        if (!localStorage.getItem(HINT_KEY)) {
            setHint(true);
            const t = setTimeout(() => { setHint(false); localStorage.setItem(HINT_KEY, '1'); }, 4500);
            return () => clearTimeout(t);
        }
    }, []);

    // ── Photo upload ─────────────────────────────────────────────────────────
    const onPhoto = (e: React.MouseEvent) => { e.stopPropagation(); fileRef.current?.click(); };
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
        return `${d.getFullYear()} / ${mm} / ${dd}`;
    })();

    // ── Design tokens ─────────────────────────────────────────────────────────
    const FONT = '"Noto Naskh Arabic", "Cairo", serif';
    const GOLD_A = '#C8A84B';
    const GOLD_B = '#E8C96A';
    const GOLD_C = '#F5E07A';
    const DARK = '#1A1710';
    const MUTED = '#7A7060';
    const IVORY = 'linear-gradient(160deg, #FEFDF6 0%, #FBF5E2 55%, #F6EED4 100%)';

    // Metallic gradient border — used as background of outer frame div
    const GOLD_FRAME = `linear-gradient(135deg, ${GOLD_A} 0%, ${GOLD_B} 22%, ${GOLD_C} 40%, ${GOLD_B} 58%, ${GOLD_A} 78%, ${GOLD_B} 88%, ${GOLD_A} 100%)`;
    // Subtle diagonal shine overlay
    const SHINE = 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 35%, transparent 60%)';

    // ── Reusable row: label + value ───────────────────────────────────────────
    const Row = ({ label, value, monoValue }: { label: string; value: string; monoValue?: boolean }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '7.5px', fontWeight: 600, color: GOLD_A, fontFamily: FONT, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                {label}
            </span>
            <span style={{
                fontSize: monoValue ? '12.5px' : '13px',
                fontWeight: 700, color: DARK,
                fontFamily: monoValue ? '"SF Mono","Courier New",monospace' : FONT,
                letterSpacing: monoValue ? '.1em' : '0',
                lineHeight: 1.25,
            }}>
                {value}
            </span>
        </div>
    );

    // ── Gold-framed card shell (used for both faces) ──────────────────────────
    const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
        // Outer: 2px gradient = metallic border
        <div style={{
            width: '100%', height: '100%',
            background: GOLD_FRAME,
            borderRadius: '18px',
            padding: '2px',
            boxSizing: 'border-box',
            boxShadow: '0 0 0 1px rgba(201,168,75,0.15) inset',
        }}>
            {/* Inner ivory card — overflow:hidden clips content to rounded corners */}
            <div style={{
                width: '100%', height: '100%',
                background: IVORY,
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
            }}>
                {/* Subtle shine overlay */}
                <div style={{ position: 'absolute', inset: 0, background: SHINE, pointerEvents: 'none', zIndex: 1 }} />
                {children}
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFile} />

            {hint && (
                <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: FONT, textAlign: 'center', direction: 'rtl' }}>
                    اضغط للقلب · اضغط على الصورة للتغيير
                </p>
            )}

            {/*
        OUTER: dir="ltr" ensures rotateY() acts on the correct physical X-axis.
        Without this, RTL would reverse the axis and the back face appears on the wrong side.
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
                    transition: 'transform 0.9s cubic-bezier(0.25, 0.1, 0.2, 1.0)',
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}>

                    {/* ═══════════════════════════════════════════════════════════════
              FRONT FACE
              backface-visibility:hidden + NO overflow:hidden on THIS div.
          ═══════════════════════════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                    }}>
                        <Frame>
                            {/* Content layer — above the shine (z-index 2) */}
                            <div dir="rtl" style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'row',
                                padding: '14px 15px 13px',
                                gap: '12px',
                                alignItems: 'stretch',
                                zIndex: 2,
                            }}>

                                {/* ── Left: All text info ────────────────────────────────── */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

                                    {/* University header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
                                        {logoSrc ? (
                                            <img src={logoSrc} alt="" style={{ height: '27px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                                        ) : (
                                            <div style={{ width: '27px', height: '27px', borderRadius: '7px', background: 'rgba(200,168,75,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <span style={{ fontSize: '8px', fontWeight: 700, color: GOLD_A, fontFamily: FONT }}>AOU</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <span style={{ fontSize: '9px', fontWeight: 700, color: DARK, lineHeight: 1.2, fontFamily: FONT }}>
                                                الجامعة الأمريكية المفتوحة
                                            </span>
                                            <span style={{ fontSize: '7.5px', fontWeight: 500, color: GOLD_A, lineHeight: 1.2, fontFamily: FONT, letterSpacing: '.06em', marginTop: '2px' }}>
                                                بطاقة الطالب
                                            </span>
                                        </div>
                                    </div>

                                    {/* Gold separator */}
                                    <div style={{ height: '1px', background: `linear-gradient(90deg, rgba(200,168,75,0.7), transparent)`, marginBottom: '9px', flexShrink: 0 }} />

                                    {/* Student name — dominant */}
                                    <div style={{ fontSize: '21px', fontWeight: 700, color: DARK, fontFamily: FONT, lineHeight: 1.15, marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
                                        {user?.fullName || '—'}
                                    </div>

                                    {/* ID labeled */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginBottom: '9px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '7px', fontWeight: 600, color: GOLD_A, letterSpacing: '.12em', fontFamily: FONT }}>الرقم الجامعي</span>
                                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: DARK, fontFamily: '"SF Mono","Courier New",monospace', letterSpacing: '.14em' }}>
                                            {user?.universityId || '—'}
                                        </span>
                                    </div>

                                    {/* Fields — 2 col grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 8px', flex: 1, alignContent: 'start' }}>
                                        <Row label="الجنسية" value={natAr} />
                                        <Row label="تاريخ الميلاد" value={dob} monoValue />
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <Row label="التخصص" value={majorAr} />
                                        </div>
                                    </div>

                                    {/* Stage */}
                                    <div style={{ marginTop: '8px', flexShrink: 0 }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            background: 'rgba(200,168,75,0.09)',
                                            border: '1px solid rgba(200,168,75,0.38)',
                                            borderRadius: '5px', padding: '2px 9px',
                                            fontSize: '8px', fontWeight: 700, color: '#8B6E1E',
                                            fontFamily: FONT, letterSpacing: '.04em',
                                        }}>
                                            المرحلة: بكالوريوس
                                        </span>
                                    </div>
                                </div>

                                {/* ── Right: Photo — portrait ratio, 20% width ─────────── */}
                                <div onClick={onPhoto} style={{ flexShrink: 0, width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <div style={{
                                        width: '100%', aspectRatio: '3/4',
                                        borderRadius: '9px',
                                        border: '1.5px solid rgba(200,168,75,0.45)',
                                        overflow: 'hidden',
                                        background: 'rgba(200,168,75,0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.05)',
                                    }}>
                                        {uploading ? (
                                            <Loader2 size={13} style={{ color: GOLD_A }} className="animate-spin" />
                                        ) : avatar ? (
                                            <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            <svg viewBox="0 0 40 52" style={{ width: '58%', opacity: 0.14 }} fill={GOLD_A}>
                                                <circle cx="20" cy="15" r="9" />
                                                <path d="M2 48c0-9.94 8.06-18 18-18s18 8.06 18 18H2z" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Frame>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
              BACK FACE
              Pre-rotated 180deg → invisible when front shows.
              Container flip +180 → net 360 = appears upright (NOT mirrored).
              backface-visibility:hidden + NO overflow:hidden on this div.
          ═══════════════════════════════════════════════════════════════ */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                    }}>
                        <Frame>
                            {/* Back content layer */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                zIndex: 2,
                            }}>
                                {logoSrc ? (
                                    <img
                                        src={logoSrc}
                                        alt=""
                                        style={{
                                            height: '50%', width: 'auto', objectFit: 'contain',
                                            opacity: 0.28,
                                            // Warm gold tone so it reads as an embossed seal
                                            filter: 'sepia(1) saturate(2) hue-rotate(3deg) brightness(0.7)',
                                        }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '54px', fontWeight: 700, color: 'rgba(200,168,75,0.20)', fontFamily: FONT, letterSpacing: '6px' }}>
                                        AOU
                                    </span>
                                )}
                            </div>
                        </Frame>
                    </div>

                </div>{/* /flip container */}
            </div>{/* /perspective wrapper */}
        </div>
    );
};

export default StudentIDCard;
