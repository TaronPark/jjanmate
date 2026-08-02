// docs/짠메이트_DB_스키마_설계_v2.md §3 raw_hot_score SQL 함수와 동일한 공식의 JS 미러.
// 댓글 목록처럼 소량 데이터를 이미 서버에서 들고 있을 때는 별도 RPC 왕복 없이 이걸로 정렬한다.
// 피드(게시글) 정렬은 여전히 DB의 raw_hot_score/popular_hot_score를 진실원으로 사용— 이 함수는
// "같은 공식을 클라이언트/서버 JS에서도 써야 할 때"를 위한 보조 유틸일 뿐, 대체가 아니다.
export function rawHotScore(
  upvotes: number,
  downvotes: number,
  createdAt: string,
  now: number = Date.now()
): number {
  const hoursElapsed = (now - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  const effectiveDownvotes = hoursElapsed <= 2 ? downvotes * 0.5 : downvotes;
  return (upvotes - effectiveDownvotes + 1) / Math.pow(hoursElapsed + 2, 1.2);
}
