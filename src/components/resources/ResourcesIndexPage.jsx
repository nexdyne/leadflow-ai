import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, TYPE_COLORS, RESOURCES } from './_resourceTheme';

// /resources
// The dedicated news-and-resources index. Same dark theme as the
// landing page, but with its own full header/footer + category filter
// chips. Lists every resource from the catalog — the landing page
// shows only four plus a "See all" CTA that lands here.
export default function ResourcesIndexPage() {
  const [activeType, setActiveType] = useState('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const types = useMemo(() => {
    const set = new Set(RESOURCES.map(r => r.type));
    return ['ALL', ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter(r => {
      if (activeType !== 'ALL' && r.type !== activeType) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    });
  }, [activeType, query]);

  const navigate = (href) => {
    try {
      window.history.pushState(null, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (_) {
      window.location.href = href;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyMid} 40%, ${COLORS.navyLight} 100%)`,
      color: COLORS.white,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* ─── Header ─────────────────────────────────────────── */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,22,40,0.85)', backdropFilter: 'blur(8px)',
      }}>
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: `linear-gradient(135deg, ${COLORS.orangeDeep}, ${COLORS.orangeGlow})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: COLORS.white, fontSize: 16,
          }}>L</div>
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.white, letterSpacing: '-0.5px' }}>
            LeadFlow AI
          </span>
        </a>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
            onMouseEnter={e => e.target.style.color = COLORS.white}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.75)'}
          >Home</a>
          <a
            href="/login"
            style={{
              color: COLORS.white, textDecoration: 'none', fontSize: 14, fontWeight: 500,
              padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
            }}
          >Sign in</a>
          <a
            href="/login?register=true"
            style={{
              color: COLORS.white, textDecoration: 'none', fontSize: 14, fontWeight: 600,
              padding: '7px 18px', borderRadius: 8, background: COLORS.orange,
            }}
            onMouseEnter={e => e.target.style.background = COLORS.orangeHover}
            onMouseLeave={e => e.target.style.background = COLORS.orange}
          >Start free</a>
        </nav>
      </header>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section style={{ padding: '72px 24px 40px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 700, color: COLORS.orangeGlow,
            textTransform: 'uppercase', letterSpacing: 1.5,
            padding: '6px 14px', borderRadius: 999,
            border: `1px solid ${COLORS.orange}55`, background: 'rgba(232,101,10,0.1)',
            marginBottom: 20,
          }}>News &amp; Resources</div>
          <h1 style={{
            fontSize: 52, fontWeight: 800, color: COLORS.white,
            letterSpacing: '-1.5px', lineHeight: 1.1, margin: '0 0 16px',
          }}>
            Lead safety knowledge, written for the job.
          </h1>
          <p style={{
            fontSize: 18, color: 'rgba(255,255,255,0.7)',
            maxWidth: 680, margin: '0 auto', lineHeight: 1.6,
          }}>
            Regulation guides, technical best practices, news on federal and Michigan rule changes,
            and walkthroughs of the product. Everything cited to primary sources and reviewed regularly.
          </p>
        </div>
      </section>

      {/* ─── Filter + search row ───────────────────────────── */}
      <section style={{ padding: '0 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{
            display: 'flex', gap: 16, alignItems: 'center',
            flexWrap: 'wrap', justifyContent: 'space-between',
            padding: '24px 0',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 40,
          }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {types.map(t => {
                const active = t === activeType;
                const pillColor = t === 'ALL' ? COLORS.white : (TYPE_COLORS[t] || COLORS.white);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveType(t)}
                    style={{
                      fontSize: 12, fontWeight: 700,
                      letterSpacing: 1.2, textTransform: 'uppercase',
                      padding: '8px 14px', borderRadius: 999,
                      border: `1px solid ${active ? pillColor : 'rgba(255,255,255,0.2)'}`,
                      background: active ? `${pillColor}22` : 'transparent',
                      color: active ? pillColor : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.color = COLORS.white;
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                      }
                    }}
                  >
                    {t === 'ALL' ? 'All topics' : t.toLowerCase()}
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              placeholder="Search resources…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search resources"
              style={{
                minWidth: 260, padding: '10px 14px',
                fontSize: 14, color: COLORS.white,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = COLORS.orange}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>
        </div>
      </section>

      {/* ─── Grid ──────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 96px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '80px 24px', textAlign: 'center',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 16, color: 'rgba(255,255,255,0.6)',
            }}>
              No resources match <strong style={{ color: COLORS.white }}>"{query}"</strong>{' '}
              in the <strong style={{ color: COLORS.white }}>{activeType === 'ALL' ? 'All' : activeType.toLowerCase()}</strong> filter.
              Try a broader search.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}>
              {filtered.map(r => (
                <ResourceIndexCard key={r.slug} resource={r} onOpen={() => navigate('/resources/' + r.slug)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer CTA ────────────────────────────────────── */}
      <section style={{
        padding: '0 24px 64px',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          padding: '48px 40px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: 26, fontWeight: 700, color: COLORS.white, margin: '0 0 12px' }}>
            Want a specific topic covered?
          </h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 auto 24px', lineHeight: 1.6, maxWidth: 560 }}>
            The LeadFlow AI compliance team writes guidance on the topics Michigan inspectors actually ask about.
            Send us a suggestion and it joins the queue.
          </p>
          <a
            href="/#contact"
            onClick={(e) => { e.preventDefault(); navigate('/#contact'); }}
            style={{
              display: 'inline-block',
              padding: '12px 24px', borderRadius: 10,
              background: COLORS.orange, color: COLORS.white,
              fontSize: 15, fontWeight: 600, textDecoration: 'none',
            }}
            onMouseEnter={e => e.target.style.background = COLORS.orangeHover}
            onMouseLeave={e => e.target.style.background = COLORS.orange}
          >Request a topic</a>
        </div>
      </section>
    </div>
  );
}

function ResourceIndexCard({ resource, onOpen }) {
  const [hovered, setHovered] = useState(false);
  const typeColor = TYPE_COLORS[resource.type] || COLORS.orange;

  return (
    <a
      href={'/resources/' + resource.slug}
      onClick={(e) => { e.preventDefault(); onOpen(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div style={{
        height: '100%',
        padding: '24px 24px 22px',
        background: hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? typeColor + '88' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 14,
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.25)` : 'none',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: typeColor,
            textTransform: 'uppercase', letterSpacing: 1.5,
          }}>{resource.type}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {resource.readingTimeMin} min
          </span>
        </div>
        <h3 style={{
          fontSize: 19, fontWeight: 700, color: COLORS.white,
          margin: '0 0 10px', lineHeight: 1.3, letterSpacing: '-0.3px',
        }}>{resource.title}</h3>
        <p style={{
          fontSize: 14, color: 'rgba(255,255,255,0.7)',
          margin: '0 0 18px', lineHeight: 1.6,
          flexGrow: 1,
        }}>{resource.desc}</p>
        <span style={{
          fontSize: 13, color: typeColor, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Read more
          <span style={{ transition: 'transform 0.2s', transform: hovered ? 'translateX(4px)' : 'none', display: 'inline-block' }}>→</span>
        </span>
      </div>
    </a>
  );
}
