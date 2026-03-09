
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { storage } from '../../storage';
import { getCountryName } from '../../countries';
import { Loader2 } from 'lucide-react';

// ─── Ensure Cairo is loaded ────────────────────────────────────────────────────
function ensureCairo() {
    if (document.getElementById('cairo-card-font')) return;
    const link = document.createElement('link');
    link.id = 'cairo-card-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;900&display=swap';
    document.head.appendChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// FLIP ARCHITECTURE (mobile-safe, no preserve-3d):
//  [Perspective wrapper  dir="ltr"  position:relative]
//    [Front face]  → rotateY(0→180) when flipped   [backface-visibility:hidden]
//    [Back face]   → rotateY(-180→0) when flipped  [backface-visibility:hidden]
//
//  Each face gets its OWN rotateY transform. No flip container with preserve-3d.
//  This is the only approach that works reliably on iOS Safari / Android Chrome.
// ─────────────────────────────────────────────────────────────────────────────

const TRANSITION = 'transform 0.75s cubic-bezier(0.4, 0.2, 0.2, 1)';

const StudentIDCard: React.FC = () => {
    const { user, setUser, settings, t } = useApp();
    const fileRef = useRef<HTMLInputElement>(null);

    const [flipped, setFlipped] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(user?.avatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);

    useEffect(() => {
        ensureCairo();
        // Show hint briefly, then auto-hide
        const t1 = setTimeout(() => setShowHint(true), 500);
        const t2 = setTimeout(() => setShowHint(false), 5000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // ── Photo upload ─────────────────────────────────────────────────────────
    const onPhotoClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPhotoMenu(true);
    };

    const onRemovePhoto = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user?.id) return;
        setUploading(true);
        setShowPhotoMenu(false);
        try {
            await supabaseService.removeAvatar(user.id);
            setAvatar(null);
            const up = { ...user, avatarUrl: null };
            setUser(up); storage.setAuthUser(up);
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
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
        } catch (err) {
            // Fallback: read as base64 for preview
            const reader = new FileReader();
            reader.onload = (ev) => {
                const b64 = ev.target?.result as string;
                if (b64) {
                    setAvatar(b64);
                    const up = { ...user, avatarUrl: b64 };
                    setUser(up); storage.setAuthUser(up);
                }
            };
            reader.readAsDataURL(file);
        }
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

    // ── Design tokens ──────────────────────────────────────────────────────────
    const FONT = '"Cairo", "Tajawal", Arial, sans-serif';
    const GOLD_A = '#C8A84B';
    const GOLD_B = '#E8C96A';
    const GOLD_C = '#F5E07A';
    const DARK = '#1A1710';
    const IVORY = 'linear-gradient(160deg, #FFFFFF 0%, #FAF5E8 40%, #EFE1C1 100%)';
    const GOLD_FRAME_BG = `linear-gradient(135deg, ${GOLD_A} 0%, ${GOLD_B} 22%, ${GOLD_C} 40%, #FFFFFF 50%, ${GOLD_C} 60%, ${GOLD_B} 78%, ${GOLD_A} 100%)`;
    const GLOSS = `
        radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 30%, transparent 60%),
        linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 30%, rgba(255,255,255,0.15) 35%, transparent 40%)
    `;

    // ── Gold-framed card shell ────────────────────────────────────────────────
    const Frame: React.FC<React.PropsWithChildren> = ({ children }) => (
        <div style={{
            width: '100%', height: '100%',
            background: GOLD_FRAME_BG,
            borderRadius: '18px',
            padding: '2.5px',
            boxSizing: 'border-box',
            boxShadow: '0 12px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(201,168,75,0.20) inset',
        }}>
            <div style={{
                width: '100%', height: '100%',
                background: IVORY,
                borderRadius: '15.5px',
                overflow: 'hidden',
                position: 'relative',
            }}>
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

    // Shared face style
    const faceBase: React.CSSProperties = {
        position: 'absolute', inset: 0,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transition: TRANSITION,
        willChange: 'transform',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={onFile} />

            {/* Transient hint — shows briefly then fades */}
            <p style={{
                fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)',
                fontFamily: FONT, textAlign: 'center', direction: 'rtl',
                opacity: showHint ? 1 : 0,
                transition: 'opacity 0.6s ease',
                pointerEvents: 'none',
                marginBottom: '-4px',
            }}>
                اضغط للقلب · اضغط على الصورة للتغيير
            </p>

            {/*
              dir="ltr" is essential: ensures rotateY acts on physical X-axis.
              perspective here (not on flip wrapper) so each face gets correct depth.
              NO preserve-3d needed — each face has its own independent rotation.
            */}
            <div
                dir="ltr"
                onClick={() => setFlipped(f => !f)}
                style={{
                    width: '100%',
                    aspectRatio: '1.586 / 1',
                    perspective: '1200px',
                    position: 'relative',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    // Minimum height to ensure all content fits
                    minHeight: '180px',
                }}
            >
                {/* ═══ FRONT FACE ══════════════════════════════════════════════
                    rotateY: 0 (visible) → 180 (hidden behind)
                    When flipped=true, we rotate it to face away from user.
                ═══════════════════════════════════════════════════════════════ */}
                <div style={{
                    ...faceBase,
                    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}>
                    <Frame>
                        <div dir="rtl" style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'row',
                            padding: '12px 12px 10px',
                            gap: '10px',
                            zIndex: 2,
                        }}>
                            {/* ── Text info ───────────────────────────── */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                                {/* University header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexShrink: 0 }}>
                                    {logoSrc ? (
                                        <img src={logoSrc} alt="" style={{ height: '32px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(200,168,75,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: '9px', fontWeight: 700, color: GOLD_A, fontFamily: FONT }}>AOU</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                                        <span style={{ fontSize: '13px', fontWeight: 900, color: DARK, lineHeight: 1.2, fontFamily: FONT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {settings.branding.siteNameAr || 'الجامعة الأمريكية المفتوحة'}
                                        </span>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: GOLD_A, lineHeight: 1.2, fontFamily: FONT, letterSpacing: '.02em' }}>
                                            المركز الإقليمي الأول
                                        </span>
                                        <span style={{ fontSize: '8.5px', fontWeight: 600, color: 'rgba(26,23,16,0.6)', lineHeight: 1.2, fontFamily: FONT, letterSpacing: '.05em' }}>
                                            بطاقة طالب جامعي
                                        </span>
                                    </div>
                                </div>

                                {/* Gold separator */}
                                <div style={{ height: '1.5px', background: `linear-gradient(90deg, rgba(200,168,75,0.8), transparent)`, marginBottom: '8px', flexShrink: 0 }} />

                                {/* Student name */}
                                <div style={{
                                    fontSize: 'clamp(15px, 4vw, 19px)', fontWeight: 900, color: DARK,
                                    fontFamily: FONT, lineHeight: 1.15, marginBottom: '8px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0,
                                }}>
                                    {user?.fullName || '—'}
                                </div>

                                {/* University ID */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginBottom: '8px', flexShrink: 0 }}>
                                    <span style={{ fontSize: '8px', fontWeight: 700, color: GOLD_A, letterSpacing: '.12em', fontFamily: FONT }}>
                                        الرقم الجامعي
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 800, color: DARK, fontFamily: '"SF Mono","Courier New",monospace', letterSpacing: '.14em' }}>
                                        {user?.universityId || '—'}
                                    </span>
                                </div>

                                {/* Fields grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 8px', flex: 1, alignContent: 'start', overflow: 'hidden' }}>
                                    {/* Nationality */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '7.5px', fontWeight: 700, color: GOLD_A, fontFamily: FONT, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>الجنسية</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: DARK, fontFamily: FONT, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{natAr}</span>
                                    </div>
                                    {/* DOB */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '7.5px', fontWeight: 700, color: GOLD_A, fontFamily: FONT, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>تاريخ الميلاد</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: DARK, fontFamily: '"SF Mono","Courier New",monospace', letterSpacing: '.08em', lineHeight: 1.25 }}>{dob}</span>
                                    </div>
                                    {/* Major — full width */}
                                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                        <span style={{ fontSize: '7.5px', fontWeight: 700, color: GOLD_A, fontFamily: FONT, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>التخصص</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: DARK, fontFamily: FONT, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{majorAr}</span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Photo area ──────────────────────── */}
                            <div
                                onClick={onPhotoClick}
                                title="اضغط لتغيير أو إزالة الصورة"
                                style={{ flexShrink: 0, width: '26%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                            >
                                <div style={{
                                    width: '100%', aspectRatio: '3/4',
                                    borderRadius: '10px',
                                    border: `2px solid rgba(200,168,75,0.6)`,
                                    overflow: 'hidden',
                                    background: 'rgba(200,168,75,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1), inset 0 2px 6px rgba(0,0,0,0.08)',
                                }}>
                                    {uploading ? (
                                        <Loader2 size={16} style={{ color: GOLD_A }} className="animate-spin" />
                                    ) : avatar ? (
                                        <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    ) : (
                                        <svg viewBox="0 0 40 52" style={{ width: '60%', opacity: 0.2 }} fill={GOLD_A}>
                                            <circle cx="20" cy="15" r="9" />
                                            <path d="M2 48c0-9.94 8.06-18 18-18s18 8.06 18 18H2z" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Frame>
                </div>

                {/* ═══ BACK FACE ═══════════════════════════════════════════════
                     rotateY: -180 (hidden) → 0 (visible) when flipped.
                     Pre-rotated so it starts hidden behind front.
                     Only logo, NO text content to avoid any mirror confusion.
                ═══════════════════════════════════════════════════════════════ */}
                <div style={{
                    ...faceBase,
                    transform: flipped ? 'rotateY(0deg)' : 'rotateY(-180deg)',
                }}>
                    <Frame>
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '8px',
                            zIndex: 2,
                        }}>
                            {/* Radial glow */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'radial-gradient(ellipse at center, rgba(200,168,75,0.12) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }} />
                            {logoSrc ? (
                                <img
                                    src={logoSrc}
                                    alt=""
                                    style={{
                                        height: '65%', width: 'auto', objectFit: 'contain',
                                        opacity: 0.70,
                                        filter: 'sepia(0.8) saturate(1.8) hue-rotate(3deg) brightness(0.85)',
                                        position: 'relative', zIndex: 1,
                                    }}
                                />
                            ) : (
                                <span style={{ fontSize: '64px', fontWeight: 700, color: `rgba(200,168,75,0.3)`, fontFamily: FONT, letterSpacing: '8px', position: 'relative', zIndex: 1 }}>
                                    AOU
                                </span>
                            )}
                        </div>
                    </Frame>
                </div>

            </div>{/* /perspective wrapper */}

            {/* Photo Action Menu Overlay */}
            {showPhotoMenu && (
                <div
                    onClick={() => setShowPhotoMenu(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
                        fontFamily: FONT,
                    }}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff', borderRadius: '16px', width: '85%', maxWidth: '260px',
                            overflow: 'hidden', display: 'flex', flexDirection: 'column',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(200,168,75,0.3)'
                        }}
                        dir="rtl"
                    >
                        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #ebebeb', fontSize: '15px', fontWeight: 800, color: '#1a1a2e', background: '#fcfaf5' }}>
                            خيارات الصورة الشخصية
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowPhotoMenu(false); fileRef.current?.click(); }}
                            style={{ padding: '16px', fontSize: '15px', fontWeight: 700, color: '#c8a84b', borderBottom: '1px solid #ebebeb', background: 'transparent', width: '100%', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            تغيير الصورة
                        </button>
                        {avatar && (
                            <button
                                onClick={onRemovePhoto}
                                style={{ padding: '16px', fontSize: '15px', fontWeight: 700, color: '#ef4444', borderBottom: '1px solid #ebebeb', background: 'transparent', width: '100%', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                إزالة الصورة
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowPhotoMenu(false); }}
                            style={{ padding: '16px', fontSize: '15px', fontWeight: 700, color: '#6b7280', background: 'transparent', width: '100%', textAlign: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentIDCard;
