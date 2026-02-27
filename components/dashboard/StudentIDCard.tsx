
import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../App';
import { supabaseService } from '../../supabaseService';
import { storage } from '../../storage';
import { getCountryName } from '../../countries';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// StudentIDCard — Premium University ID Card
// • Tap card → flip (front/back 3D animation)
// • Tap photo area → upload only (does NOT flip)
// • No visible buttons/icons on the card
// • Screenshot-ready
// ─────────────────────────────────────────────────────────────────────────────

const HINT_KEY = 'aou3_card_hint_seen';

const StudentIDCard: React.FC = () => {
    const { user, setUser, settings, lang } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isFlipped, setIsFlipped] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
    const [uploading, setUploading] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Show one-time hint if not yet dismissed
    useEffect(() => {
        if (!localStorage.getItem(HINT_KEY)) {
            setShowHint(true);
            const t = setTimeout(() => {
                setShowHint(false);
                localStorage.setItem(HINT_KEY, 'true');
            }, 4000);
            return () => clearTimeout(t);
        }
    }, []);

    // ── Photo upload ─────────────────────────────────────────────────────────
    const handlePhotoClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // prevent flip
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.type)) return;
        if (file.size > 5 * 1024 * 1024) return;

        setUploading(true);
        try {
            const url = await supabaseService.uploadAvatar(user.id, file);
            setAvatarUrl(url);
            const updated = { ...user, avatarUrl: url };
            setUser(updated);
            storage.setAuthUser(updated);
        } catch (err) {
            console.error('[ID Card upload]', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const logoSrc = settings.branding.logo || settings.branding.logoBase64 || null;
    const nationalityLabel = user?.nationality ? getCountryName(user.nationality, lang) : '—';
    const dobLabel = user?.dateOfBirth
        ? new Date(user.dateOfBirth).toLocaleDateString(lang === 'AR' ? 'ar-SA' : 'en-GB', {
            year: 'numeric', month: '2-digit', day: '2-digit',
        })
        : '—';

    const majorLabel = user?.major || '—';

    // ── Field row helper ─────────────────────────────────────────────────────
    const Field = ({ label, value }: { label: string; value: string }) => (
        <div className="flex flex-col">
            <span
                style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(212,175,55,0.85)',
                    marginBottom: '2px',
                    fontFamily: '"Cairo", sans-serif',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    fontFamily: '"Cairo", sans-serif',
                    lineHeight: 1.3,
                }}
            >
                {value}
            </span>
        </div>
    );

    // ── Card dimensions ───────────────────────────────────────────────────────
    // CR80 aspect ratio = 85.6mm × 54mm → 1.585
    const cardStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '420px',
        aspectRatio: '1.585 / 1',
        perspective: '1200px',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        fontFamily: '"Cairo", sans-serif',
    };

    const innerStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.75s cubic-bezier(0.4, 0.2, 0.2, 1)',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        borderRadius: '16px',
        boxShadow: isFlipped
            ? '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,175,55,0.3)'
            : '0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(212,175,55,0.25)',
        filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.12))',
    };

    const faceBase: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        borderRadius: '16px',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        overflow: 'hidden',
    };

    const frontStyle: React.CSSProperties = {
        ...faceBase,
        background: 'linear-gradient(135deg, #FEFCF5 0%, #FDF8EC 40%, #F9F2DC 100%)',
    };

    const backStyle: React.CSSProperties = {
        ...faceBase,
        background: 'linear-gradient(135deg, #FEFCF5 0%, #FDF8EC 40%, #F9F2DC 100%)',
        transform: 'rotateY(180deg)',
    };

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* One-time hint */}
            {showHint && (
                <div
                    className="text-xs font-bold text-text-secondary animate-in fade-in duration-500 text-center"
                    style={{ fontFamily: '"Cairo", sans-serif' }}
                >
                    {lang === 'AR'
                        ? 'اضغط على البطاقة لقلبها · اضغط على الصورة لتغييرها'
                        : 'Tap the card to flip · Tap the photo to change it'}
                </div>
            )}

            {/* Card */}
            <div style={cardStyle} onClick={() => setIsFlipped(f => !f)}>
                <div style={innerStyle}>

                    {/* ── FRONT ──────────────────────────────────────────────────── */}
                    <div style={frontStyle} dir="rtl">
                        {/* Gold top stripe */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
                            background: 'linear-gradient(90deg, #D4AF37, #F5E07A, #D4AF37)',
                        }} />

                        {/* Gold bottom stripe */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
                            background: 'linear-gradient(90deg, #D4AF37, #F5E07A, #D4AF37)',
                        }} />

                        {/* Left decorative bar */}
                        <div style={{
                            position: 'absolute', top: '5px', right: 0, bottom: '3px', width: '4px',
                            background: 'linear-gradient(180deg, #D4AF37, #F5E07A, #D4AF37)',
                        }} />

                        {/* Content layout */}
                        <div style={{
                            position: 'absolute', inset: '5px 4px 3px 0',
                            display: 'flex', flexDirection: 'row', alignItems: 'stretch',
                            padding: '10px 12px 10px 14px', gap: '10px',
                        }}>

                            {/* Right side: Photo */}
                            <div
                                style={{
                                    flexShrink: 0,
                                    width: '22%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingTop: '2px',
                                }}
                                onClick={handlePhotoClick}
                            >
                                <div style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    borderRadius: '10px',
                                    border: '1.5px solid rgba(212,175,55,0.6)',
                                    overflow: 'hidden',
                                    background: 'rgba(212,175,55,0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    cursor: 'pointer',
                                }}>
                                    {uploading ? (
                                        <Loader2 size={16} style={{ color: '#D4AF37', animation: 'spin 1s linear infinite' }} />
                                    ) : avatarUrl ? (
                                        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        /* Subtle person silhouette placeholder */
                                        <svg viewBox="0 0 40 40" width="55%" style={{ opacity: 0.2 }} fill="#9b835a">
                                            <circle cx="20" cy="14" r="8" />
                                            <path d="M4 36c0-8.84 7.16-16 16-16s16 7.16 16 16H4z" />
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {/* Left side: Info */}
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minWidth: 0,
                            }}>
                                {/* University header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    {logoSrc ? (
                                        <img src={logoSrc} alt="Logo" style={{ height: '22px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{
                                            width: '22px', height: '22px', borderRadius: '6px',
                                            background: 'rgba(212,175,55,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                        }}>
                                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#D4AF37' }}>AOU</span>
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: '8px', fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2, fontFamily: '"Cairo", sans-serif' }}>
                                            الجامعة الأمريكية المفتوحة
                                        </div>
                                        <div style={{ fontSize: '7px', fontWeight: 600, color: 'rgba(212,175,55,0.85)', lineHeight: 1.2, fontFamily: '"Cairo", sans-serif' }}>
                                            بطاقة هوية الطالب
                                        </div>
                                    </div>
                                </div>

                                {/* Thin gold divider */}
                                <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(212,175,55,0.6), transparent)', marginBottom: '5px' }} />

                                {/* Student name — prominent */}
                                <div style={{
                                    fontSize: '13px', fontWeight: 900, color: '#111111',
                                    lineHeight: 1.2, marginBottom: '5px',
                                    fontFamily: '"Cairo", sans-serif',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                }}>
                                    {user?.fullName || '—'}
                                </div>

                                {/* Fields grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', flex: 1 }}>
                                    <Field label="الرقم الجامعي" value={user?.universityId || '—'} />
                                    <Field label="الجنسية" value={nationalityLabel} />
                                    <Field label="تاريخ الميلاد" value={dobLabel} />
                                    <Field label="التخصص" value={majorLabel} />
                                </div>

                                {/* Bottom: stage badge */}
                                <div style={{
                                    marginTop: '5px',
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    background: 'rgba(212,175,55,0.12)',
                                    border: '1px solid rgba(212,175,55,0.35)',
                                    borderRadius: '6px', padding: '3px 8px',
                                    alignSelf: 'flex-start',
                                }}>
                                    <span style={{ fontSize: '8px', fontWeight: 800, color: '#9b7e2d', letterSpacing: '.05em', fontFamily: '"Cairo", sans-serif' }}>
                                        المرحلة: بكالوريوس
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── BACK ───────────────────────────────────────────────────── */}
                    <div style={backStyle} dir="rtl">
                        {/* Gold top stripe */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
                            background: 'linear-gradient(90deg, #D4AF37, #F5E07A, #D4AF37)',
                        }} />
                        {/* Gold bottom stripe */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
                            background: 'linear-gradient(90deg, #D4AF37, #F5E07A, #D4AF37)',
                        }} />

                        {/* Watermark crest */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                        }}>
                            {logoSrc ? (
                                <img src={logoSrc} alt="" style={{ height: '60%', width: 'auto', objectFit: 'contain', opacity: 0.06 }} />
                            ) : (
                                <div style={{ fontSize: '52px', fontWeight: 900, color: 'rgba(212,175,55,0.07)', letterSpacing: '-2px', fontFamily: '"Cairo", sans-serif' }}>
                                    AOU
                                </div>
                            )}
                        </div>

                        {/* Back content */}
                        <div style={{
                            position: 'absolute', inset: '5px 0 3px 0',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: '6px', padding: '12px 20px',
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#111111', textAlign: 'center', fontFamily: '"Cairo", sans-serif', letterSpacing: '-0.01em' }}>
                                الجامعة الأمريكية المفتوحة
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(212,175,55,0.8)', textAlign: 'center', fontFamily: '"Cairo", sans-serif' }}>
                                Arab Open University
                            </div>
                            <div style={{ height: '1px', width: '60%', background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)', margin: '3px 0' }} />
                            <div style={{ fontSize: '9px', fontWeight: 700, color: '#777777', textAlign: 'center', fontFamily: '"Cairo", sans-serif' }}>
                                المركز الإقليمي الأول
                            </div>
                            <div style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(212,175,55,0.6)', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: '4px', fontFamily: '"Cairo", sans-serif' }}>
                                AOU3 · {user?.universityId || 'ID'}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StudentIDCard;
