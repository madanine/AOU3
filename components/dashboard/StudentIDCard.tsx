
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { storage } from '../../storage';
import { getCountryName } from '../../countries';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// StudentIDCard — Premium University ID Card
//
// CRITICAL flip notes:
// • The entire card wrapper MUST be dir="ltr" — otherwise rotateY() acts on
//   the RTL X-axis and the back face text appears mirrored.
// • Arabic text is placed inside inner divs that each carry dir="rtl".
// • Front face: no initial rotation.
// • Back face: transform: rotateY(180deg) → when container flips 180deg,
//   back reaches net 360deg = visible and unmirrored.
// ─────────────────────────────────────────────────────────────────────────────

const HINT_KEY = 'aou3_card_hint_seen';

const StudentIDCard: React.FC = () => {
    const { user, setUser, settings } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isFlipped, setIsFlipped] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [showHint, setShowHint] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(HINT_KEY)) {
            setShowHint(true);
            const timer = setTimeout(() => {
                setShowHint(false);
                localStorage.setItem(HINT_KEY, 'true');
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, []);

    // ── Photo upload ───────────────────────────────────────────────────────────
    const handlePhotoClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // ← MUST NOT flip the card
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
        if (file.size > 5 * 1024 * 1024) return;

        setUploading(true);
        try {
            const url = await supabaseService.uploadAvatar(user.id, file);
            setAvatarUrl(url);
            const updated = { ...user, avatarUrl: url };
            setUser(updated);
            storage.setAuthUser(updated);
        } catch (err) {
            console.error('[IDCard upload]', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // ── Data helpers ───────────────────────────────────────────────────────────
    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;

    const nationalityLabel = user?.nationality
        ? getCountryName(user.nationality, 'AR')  // always Arabic on this card
        : '—';

    const dobLabel = user?.dateOfBirth
        ? new Date(user.dateOfBirth).toLocaleDateString('ar-SA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        })
        : '—';

    const majorLabel = user?.major || '—';

    // ── Inline style atoms ─────────────────────────────────────────────────────
    const GOLD_STRIPE: React.CSSProperties = {
        background: 'linear-gradient(90deg, #c9983a 0%, #F5E07A 40%, #D4AF37 70%, #c9983a 100%)',
    };

    const CARD_BG = 'linear-gradient(150deg, #FEFDF8 0%, #FBF5E4 55%, #F5EDD2 100%)';

    const faceShared: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        borderRadius: '14px',
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        background: CARD_BG,
    };

    // ── Field component (Arabic label + value) ─────────────────────────────────
    const Field = ({ label, value }: { label: string; value: string }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{
                fontSize: '7.5px', fontWeight: 800, letterSpacing: '.1em',
                textTransform: 'uppercase', color: '#b8932a',
                fontFamily: '"Cairo", sans-serif',
            }}>
                {label}
            </span>
            <span style={{
                fontSize: '11.5px', fontWeight: 700, color: '#1c1a14',
                fontFamily: '"Cairo", sans-serif', lineHeight: 1.25,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
                {value}
            </span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* One-time hint — disappears after 4.5s */}
            {showHint && (
                <div style={{
                    fontSize: '12px', fontWeight: 600,
                    color: 'var(--text-secondary)',
                    fontFamily: '"Cairo", sans-serif',
                    textAlign: 'center',
                    animation: 'fadeIn .4s ease',
                    direction: 'rtl',
                }}>
                    اضغط على البطاقة لقلبها · اضغط على الصورة لتغييرها
                </div>
            )}

            {/*
        ──────────────────────────────────────────────────────────────────────
        OUTER WRAPPER — MUST be dir="ltr" so rotateY() works on the correct
        physical X-axis regardless of document RTL direction.
        ──────────────────────────────────────────────────────────────────────
      */}
            <div
                dir="ltr"
                onClick={() => setIsFlipped(f => !f)}
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    aspectRatio: '1.586 / 1',   /* CR80 credit-card ratio */
                    perspective: '1000px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
            >
                {/* Inner — rotates on flip */}
                <div style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.8s cubic-bezier(0.35, 0.1, 0.25, 1.0)',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    borderRadius: '14px',
                    boxShadow: '0 10px 48px rgba(0,0,0,0.22), 0 0 0 1.5px rgba(212,175,55,0.35)',
                    filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.10))',
                }}>

                    {/* ═══════════════════════════════════════════════════════════════
              FRONT FACE
          ═══════════════════════════════════════════════════════════════ */}
                    <div style={faceShared}>

                        {/* Top gold stripe */}
                        <div style={{ ...GOLD_STRIPE, position: 'absolute', top: 0, left: 0, right: 0, height: '5px' }} />
                        {/* Bottom gold stripe */}
                        <div style={{ ...GOLD_STRIPE, position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px' }} />
                        {/* Left side gold bar */}
                        <div style={{
                            position: 'absolute', top: '5px', left: 0, bottom: '3px', width: '3px',
                            background: 'linear-gradient(180deg, #c9983a, #F5E07A, #c9983a)',
                        }} />

                        {/*
              Content is dir="rtl" inside — photo on visual RIGHT (start in RTL),
              text on visual LEFT
            */}
                        <div dir="rtl" style={{
                            position: 'absolute',
                            top: '5px', left: '3px', right: 0, bottom: '3px',
                            display: 'flex',
                            flexDirection: 'row',
                            padding: '10px 12px 10px 14px',
                            gap: '10px',
                            alignItems: 'stretch',
                        }}>

                            {/* ── PHOTO (visual right in RTL = first child) ─────────── */}
                            <div
                                onClick={handlePhotoClick}
                                style={{
                                    flexShrink: 0,
                                    width: '23%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '3/4',
                                    borderRadius: '8px',
                                    border: '1.5px solid rgba(212,175,55,0.55)',
                                    overflow: 'hidden',
                                    background: 'rgba(212,175,55,0.05)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    flexShrink: 0,
                                }}>
                                    {uploading ? (
                                        <Loader2 size={14} style={{ color: '#D4AF37' }} className="animate-spin" />
                                    ) : avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt=""
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        />
                                    ) : (
                                        /* Subtle person silhouette — NO letter avatar */
                                        <svg viewBox="0 0 40 50" style={{ width: '65%', opacity: 0.18 }} fill="#9b835a">
                                            <circle cx="20" cy="14" r="9" />
                                            <path d="M2 46c0-9.94 8.06-18 18-18s18 8.06 18 18H2z" />
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {/* ── INFO COLUMN (visual left in RTL = second child) ──── */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minWidth: 0,
                                overflow: 'hidden',
                            }}>

                                {/* University header — logo + name ONCE */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    {logoSrc ? (
                                        <img
                                            src={logoSrc}
                                            alt="Logo"
                                            style={{ height: '24px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '6px',
                                            background: 'rgba(212,175,55,0.14)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <span style={{ fontSize: '8px', fontWeight: 900, color: '#c9983a' }}>AOU</span>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{
                                            fontSize: '8.5px', fontWeight: 900, color: '#1c1a14', lineHeight: 1.2,
                                            fontFamily: '"Cairo", sans-serif',
                                        }}>
                                            الجامعة الأمريكية المفتوحة
                                        </div>
                                        <div style={{
                                            fontSize: '7px', fontWeight: 700, color: '#b8932a', lineHeight: 1.2,
                                            fontFamily: '"Cairo", sans-serif',
                                        }}>
                                            بطاقة هوية الطالب
                                        </div>
                                    </div>
                                </div>

                                {/* Gold divider */}
                                <div style={{
                                    height: '1px', margin: '5px 0',
                                    background: 'linear-gradient(90deg, rgba(212,175,55,0.7), transparent)',
                                }} />

                                {/* Full name — prominent */}
                                <div style={{
                                    fontSize: '13.5px', fontWeight: 900, color: '#111',
                                    fontFamily: '"Cairo", sans-serif',
                                    lineHeight: 1.2, marginBottom: '5px',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {user?.fullName || '—'}
                                </div>

                                {/* Fields grid: 2 cols */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '4px 8px',
                                    flex: 1,
                                    alignContent: 'start',
                                }}>
                                    <Field label="الرقم الجامعي" value={user?.universityId || '—'} />
                                    <Field label="الجنسية" value={nationalityLabel} />
                                    <Field label="تاريخ الميلاد" value={dobLabel} />
                                    <Field label="التخصص" value={majorLabel} />
                                </div>

                                {/* Stage badge */}
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center',
                                    background: 'rgba(212,175,55,0.12)',
                                    border: '1px solid rgba(212,175,55,0.35)',
                                    borderRadius: '5px', padding: '2px 7px',
                                    alignSelf: 'flex-start', marginTop: '5px',
                                }}>
                                    <span style={{
                                        fontSize: '8px', fontWeight: 800,
                                        color: '#9b7e2d', fontFamily: '"Cairo", sans-serif',
                                        letterSpacing: '.04em',
                                    }}>
                                        المرحلة: بكالوريوس
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
              BACK FACE
              Pre-rotated 180deg. Container flips +180 → net 360 = readable.
              dir="ltr" on the face too — content text uses dir="rtl" inline.
          ═══════════════════════════════════════════════════════════════ */}
                    <div style={{ ...faceShared, transform: 'rotateY(180deg)' }}>

                        {/* Top gold stripe */}
                        <div style={{ ...GOLD_STRIPE, position: 'absolute', top: 0, left: 0, right: 0, height: '5px' }} />
                        {/* Bottom gold stripe */}
                        <div style={{ ...GOLD_STRIPE, position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px' }} />

                        {/* Subtle watermark — centered logo or AOU text */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                        }}>
                            {logoSrc ? (
                                <img
                                    src={logoSrc}
                                    alt=""
                                    style={{ height: '55%', width: 'auto', objectFit: 'contain', opacity: 0.055 }}
                                />
                            ) : (
                                <span style={{
                                    fontSize: '60px', fontWeight: 900,
                                    color: 'rgba(212,175,55,0.06)',
                                    fontFamily: '"Cairo", sans-serif',
                                    letterSpacing: '-3px',
                                }}>
                                    AOU
                                </span>
                            )}
                        </div>

                        {/* Back text content — centered, Arabic */}
                        <div dir="rtl" style={{
                            position: 'absolute', inset: '5px 0 3px 0',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '5px', padding: '14px 24px',
                        }}>
                            <div style={{
                                fontSize: '15px', fontWeight: 900, color: '#1c1a14',
                                textAlign: 'center', fontFamily: '"Cairo", sans-serif',
                                letterSpacing: '-0.01em',
                            }}>
                                الجامعة الأمريكية المفتوحة
                            </div>
                            <div style={{
                                fontSize: '11px', fontWeight: 600,
                                color: 'rgba(212,175,55,0.85)',
                                textAlign: 'center', fontFamily: '"Cairo", sans-serif',
                            }}>
                                Arab Open University
                            </div>

                            {/* Divider */}
                            <div style={{
                                height: '1px', width: '55%',
                                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
                                margin: '2px 0',
                            }} />

                            <div style={{
                                fontSize: '10px', fontWeight: 700, color: '#777',
                                textAlign: 'center', fontFamily: '"Cairo", sans-serif',
                            }}>
                                المركز الإقليمي الأول
                            </div>

                            <div style={{
                                fontSize: '8.5px', fontWeight: 700,
                                color: 'rgba(212,175,55,0.65)',
                                letterSpacing: '.12em', textTransform: 'uppercase',
                                fontFamily: '"Cairo", sans-serif',
                                marginTop: '3px',
                            }}>
                                {'AOU3 · ' + (user?.universityId || 'ID')}
                            </div>
                        </div>
                    </div>

                </div>{/* /inner */}
            </div>{/* /outer wrapper */}
        </div>
    );
};

export default StudentIDCard;
