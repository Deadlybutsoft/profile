import React from 'react';
import { sfx } from '@/lib/sfx';

interface ModernRemoteProps {
    mode: 'NORM' | 'NIGHT' | 'PARTY';
    setMode: (m: 'NORM' | 'NIGHT' | 'PARTY') => void;
    fanOn: boolean;
    setFanOn: (f: boolean) => void;
    controlScheme: 'arrows' | 'wasd' | 'both';
    setControlScheme: (s: 'arrows' | 'wasd' | 'both') => void;
    onClose: () => void;
}

export default function ModernRemote({
    mode,
    setMode,
    fanOn,
    setFanOn,
    controlScheme,
    setControlScheme,
    onClose
}: ModernRemoteProps) {
    const modeConfig = {
        NORM: { label: 'DAY', color: '#f59e0b' },
        NIGHT: { label: 'NIGHT', color: '#60a5fa' },
        PARTY: { label: 'PARTY', color: '#f43f5e' },
    };

    const tinyBtn = (active: boolean, color: string): React.CSSProperties => ({
        height: '26px',
        borderRadius: '10px',
        border: `1px solid ${active ? `${color}aa` : 'rgba(255,255,255,0.18)'}`,
        background: active ? `linear-gradient(180deg, ${color}33, rgba(0,0,0,0.35))` : 'rgba(0,0,0,0.35)',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.78)',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        cursor: 'pointer',
    });

    const schemeBtn = (active: boolean): React.CSSProperties => ({
        height: '26px',
        borderRadius: '10px',
        border: `1px solid ${active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'}`,
        background: active ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.35)',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.78)',
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        cursor: 'pointer',
    });

    return (
        <div style={{
            width: '210px',
            borderRadius: '18px',
            padding: '10px',
            background: 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            fontFamily: '"Manrope", "Sora", sans-serif',
            color: '#fff',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', opacity: 0.9 }}>ROOM</div>
                <button
                    onClick={() => { sfx.playClose(); onClose(); }}
                    style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(0,0,0,0.35)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 900,
                    }}
                    aria-label="Close remote"
                >
                    X
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '8px' }}>
                {(['NORM', 'NIGHT', 'PARTY'] as const).map((m) => {
                    const cfg = modeConfig[m];
                    const active = mode === m;
                    return (
                        <button
                            key={m}
                            onClick={() => { sfx.playClick(); setMode(m); }}
                            style={tinyBtn(active, cfg.color)}
                        >
                            {cfg.label}
                        </button>
                    );
                })}
            </div>

            <button
                onClick={() => { sfx.playClick(); setFanOn(!fanOn); }}
                style={{
                    width: '100%',
                    height: '30px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: fanOn ? 'rgba(52,211,153,0.18)' : 'rgba(0,0,0,0.35)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.14em',
                    marginBottom: '10px',
                }}
            >
                FAN {fanOn ? 'ON' : 'OFF'}
            </button>

            <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.14em', opacity: 0.75, marginBottom: '6px' }}>
                KEYBOARD
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                    onClick={() => { sfx.playClick(); setControlScheme('arrows'); }}
                    style={schemeBtn(controlScheme === 'arrows')}
                >
                    ARROWS
                </button>
                <button
                    onClick={() => { sfx.playClick(); setControlScheme('wasd'); }}
                    style={schemeBtn(controlScheme === 'wasd')}
                >
                    WASD
                </button>
                <button
                    onClick={() => { sfx.playClick(); setControlScheme('both'); }}
                    style={schemeBtn(controlScheme === 'both')}
                >
                    BOTH
                </button>
            </div>
        </div>
    );
}
