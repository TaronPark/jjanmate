import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLiveMonthlyRanking } from '@/lib/rewards';
import { CrownIcon, TrophyIcon } from '@/components/icons';

// 마이페이지 "보상·명예" 탭 (디자인 시안 화면 4/6/7 대응): 이달의 랭킹(기본) / 배지 가이드 /
// 배지 보관함 3-way 서브네비. 기존엔 배지 보관함 하나만 있었는데, 시안을 보고 누락된
// 이달의 랭킹(진행 중인 달 실시간 순위)과 배지 가이드(정적 안내)를 추가로 구현.
// 2026-08-02 시안 통일: 서브네비를 시안의 flair-chips/chip 클래스로, 가이드/보관함을
// guide-box/archive-card 클래스로 교체.
type Sub = 'ranking' | 'guide' | 'archive';

const SUB_LABELS: { key: Sub; label: string }[] = [
  { key: 'ranking', label: '이달의 랭킹' },
  { key: 'guide', label: '배지 가이드' },
  { key: 'archive', label: '내 배지 보관함' },
];

export default async function RewardsTab({ userId, sub }: { userId: string; sub?: string }) {
  const activeSub: Sub = (['ranking', 'guide', 'archive'] as Sub[]).includes(sub as Sub) ? (sub as Sub) : 'ranking';

  return (
    <div>
      <div className="flair-chips" style={{ marginTop: 0 }}>
        {SUB_LABELS.map(({ key, label }) => (
          <Link key={key} href={`/mypage?tab=rewards&sub=${key}`} className={`chip${activeSub === key ? ' active' : ''}`}>
            {label}
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {activeSub === 'ranking' && <RankingSub userId={userId} />}
        {activeSub === 'guide' && <GuideSub />}
        {activeSub === 'archive' && <ArchiveSub userId={userId} />}
      </div>
    </div>
  );
}

// 진행 중인 이번 달의 실시간 종합 랭킹(게시글+댓글 순업보트 합산, 전체 스코프) + 내 순위
// 고정바(시안: 화면 하단에 검은 바로 "내 순위 14위" 표시).
async function RankingSub({ userId }: { userId: string }) {
  const { top, myEntry } = await getLiveMonthlyRanking(userId, 10);

  if (top.length === 0) {
    return <EmptyState text="이번 달 활동이 아직 집계되지 않았어요. 첫 글/댓글로 순위에 도전해보세요!" />;
  }

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}위`);

  return (
    <div style={{ paddingBottom: myEntry ? 48 : 0 }}>
      {top.map((entry) => (
        <div
          key={entry.user_id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid var(--border)',
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: entry.user_id === userId ? 700 : 500 }}>
            {medal(entry.rank)} {entry.nickname}
            {entry.user_flair && <span className="user-flair" style={{ marginLeft: 4 }}>{entry.user_flair}</span>}
          </span>
          <span style={{ color: 'var(--text-sub)' }}>↑ {entry.score}점</span>
        </div>
      ))}

      {myEntry && (
        <div
          style={{
            position: 'fixed',
            bottom: 64,
            left: 0,
            right: 0,
            maxWidth: 420,
            margin: '0 auto',
            background: 'var(--text-main)',
            color: '#fff',
            padding: '10px 16px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            zIndex: 5,
          }}
        >
          <span>📌 내 순위: {myEntry.rank}위</span>
          <span>↑ {myEntry.score}점</span>
        </div>
      )}
    </div>
  );
}

function GuideSub() {
  return (
    <div>
      <div className="guide-title">
        <TrophyIcon size={16} /> 짠메이트 월간 배지 시스템 안내
      </div>

      <div className="guide-box">
        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 8px' }}>🌟 전체(Global) TOP3 — 최상위 명예</p>
        <p style={{ fontSize: 12, color: '#444', margin: 0, lineHeight: 1.6 }}>
          6개 룸을 통틀어 게시글/댓글 순업보트 상위 3명에게 부여돼요. 같은 유저가 룸별 TOP3와 전체 TOP3에 동시에 들면
          더 가치가 높은 전체 배지만 표시돼요(룸 배지는 자동으로 가려져요).
        </p>
      </div>

      <div className="guide-box">
        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 8px' }}>🏠 룸별 TOP3</p>
        <p style={{ fontSize: 12, color: '#444', margin: 0, lineHeight: 1.6 }}>
          6개 룸 각각에서 게시글/댓글 카테고리별로 순업보트 상위 3명을 선정해요. 🥇금 🥈은 🥉동 순으로 등급이 나뉘어요.
        </p>
      </div>

      <div className="guide-box">
        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 8px' }}>📅 정산 및 유지 규칙</p>
        <ol className="guide-list">
          <li>매월 1일 00:00(KST) 전월 실적을 스냅샷으로 정산해요.</li>
          <li>획득한 배지는 정산일로부터 1개월간 유지돼요.</li>
          <li>매월 1일 카운터가 0으로 초기화되고 새 달의 경쟁이 시작돼요.</li>
          <li>순업보트가 0 이하인 경우는 순위 집계에서 제외돼요.</li>
        </ol>
      </div>
    </div>
  );
}

async function ArchiveSub({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: badges } = await supabase
    .from('monthly_badges')
    .select('*')
    .eq('user_id', userId)
    .order('year_month', { ascending: false });

  if (!badges || badges.length === 0) {
    return <EmptyState text="아직 획득한 배지가 없어요. 이달의 랭킹에 도전해보세요!" />;
  }

  return (
    <div>
      <p className="guide-title" style={{ marginBottom: 12 }}>
        🏛️ 명예의 전당 (과거 수상 이력)
      </p>
      {badges.map((b) => (
        <div key={b.id} className="archive-card">
          <CrownIcon size={28} color="#111" />
          <div>
            <p className="archive-month">{b.year_month}</p>
            <p className="archive-title">
              {b.scope === 'global' ? '✨ [전체]' : '[룸]'} {b.category === 'post' ? '게시글' : '댓글'} {b.rank}위{' '}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-sub)' }}>(순업보트 {b.score}점)</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sub)', fontSize: 12 }}>
      <TrophyIcon size={24} color="#ddd" />
      <p style={{ marginTop: 8 }}>{text}</p>
    </div>
  );
}
